import type { FastifyBaseLogger } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AppRequest } from '../models/index.js';
import { AppRequestStatus, ApprovalType, ExecutionStatus } from '../models/index.js';
import { ClaudeService } from './claude-service.js';
import { ApprovalService } from './approval-service.js';
import { WorkspaceService } from './workspace-service.js';
import { ExecutionService } from './execution-service.js';
import { normalizeError, logError } from '../utils/error-helpers.js';

interface PlanningResult {
  prd: string;
  tasks: Array<{
    title: string;
    description: string;
  }>;
}

/**
 * AppRequestService handles the end-to-end "Build an App" flow
 * Phase 1: Planning (generates PRD and task list)
 * Phase 2: Building (executes tasks)
 */
export class AppRequestService {
  private prisma: PrismaClient;
  private logger: FastifyBaseLogger;
  private claudeService: ClaudeService;
  private approvalService: ApprovalService;
  private executionService: ExecutionService;

  constructor(
    prisma: PrismaClient,
    logger: FastifyBaseLogger,
    approvalService: ApprovalService,
    executionService: ExecutionService
  ) {
    this.prisma = prisma;
    this.logger = logger.child({ service: 'AppRequestService' });
    this.claudeService = new ClaudeService(logger);
    this.approvalService = approvalService;
    this.executionService = executionService;
  }

  /**
   * Create a new app request and trigger planning phase
   */
  async createAppRequest(
    projectId: string,
    prompt: string
  ): Promise<AppRequest> {
    const id = randomUUID();

    this.logger.info(
      { id, projectId, prompt: prompt.slice(0, 100) },
      'Creating app request'
    );

    const appRequest = await this.prisma.appRequest.create({
      data: {
        id,
        projectId,
        prompt,
        status: 'pending',
      },
    });

    // Trigger planning phase asynchronously
    this.startPlanningPhase(appRequest as AppRequest).catch((error) => {
      const normalizedError = normalizeError(error);

      logError(
        this.logger,
        error,
        'Planning phase failed - async catch'
      );

      // Update status with error reason
      this.updateAppRequestStatusWithError(
        id,
        AppRequestStatus.Failed,
        normalizedError.message
      ).catch((updateError) => {
        logError(
          this.logger,
          updateError,
          'Failed to update app request status after planning failure'
        );
      });
    });

    return appRequest as AppRequest;
  }

  /**
   * Get app request by ID
   */
  async getAppRequestById(id: string): Promise<AppRequest | null> {
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id },
    });
    return appRequest as AppRequest | null;
  }

  /**
   * Get all app requests for a project
   */
  async getAppRequestsByProjectId(projectId: string): Promise<AppRequest[]> {
    const appRequests = await this.prisma.appRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return appRequests as AppRequest[];
  }

  /**
   * Update app request status
   */
  async updateAppRequestStatus(
    id: string,
    status: AppRequestStatus
  ): Promise<AppRequest> {
    const appRequest = await this.prisma.appRequest.update({
      where: { id },
      data: { status },
    });
    return appRequest as AppRequest;
  }

  /**
   * Create build approval after planning completes
   */
  private async createBuildApproval(
    appRequestId: string,
    projectId: string
  ): Promise<void> {
    await this.approvalService.createApproval({
      projectId,
      appRequestId,
      type: ApprovalType.ExecutionStart,
    });
  }

  /**
   * Handle build approval - start execution for app request
   */
  async handleBuildApproval(appRequestId: string): Promise<void> {
    const appRequest = await this.getAppRequestById(appRequestId);

    if (!appRequest) {
      throw new Error(`AppRequest ${appRequestId} not found`);
    }

    if (appRequest.status !== 'planned') {
      this.logger.warn(
        { appRequestId, status: appRequest.status },
        'AppRequest is not in planned state, skipping build'
      );
      return;
    }

    this.logger.info({ appRequestId }, 'Build approved - starting execution');

    // Update status to building
    await this.prisma.appRequest.update({
      where: { id: appRequestId },
      data: { status: AppRequestStatus.Building },
    });

    // Create execution for this project
    // The execution will process only tasks linked to this appRequestId
    const execution = await this.executionService.createExecutionForAppRequest(
      appRequest.projectId,
      appRequestId
    );

    // Store execution ID on app request
    await this.prisma.appRequest.update({
      where: { id: appRequestId },
      data: { executionId: execution.id },
    });

    this.logger.info(
      { appRequestId, executionId: execution.id },
      'Execution started for app request'
    );

    // Start the execution (this will run asynchronously)
    await this.executionService.startExecutionForAppRequest(execution.id);
  }

  /**
   * Handle build rejection - mark app request as failed
   */
  async handleBuildRejection(
    appRequestId: string,
    reason?: string
  ): Promise<void> {
    const appRequest = await this.getAppRequestById(appRequestId);

    if (!appRequest) {
      throw new Error(`AppRequest ${appRequestId} not found`);
    }

    this.logger.info(
      { appRequestId, reason },
      'Build rejected - marking app request as failed'
    );

    await this.updateAppRequestStatusWithError(
      appRequestId,
      AppRequestStatus.Failed,
      reason || 'Build rejected by user'
    );
  }

  /**
   * Update app request status with error reason
   */
  private async updateAppRequestStatusWithError(
    id: string,
    status: AppRequestStatus,
    errorReason: string
  ): Promise<AppRequest> {
    const appRequest = await this.prisma.appRequest.update({
      where: { id },
      data: {
        status,
        errorReason: errorReason.slice(0, 500), // Limit error message length
      },
    });

    // Emit failure event
    this.logger.error(
      { appRequestId: id, errorReason },
      'App request planning failed'
    );

    return appRequest as AppRequest;
  }

  /**
   * Start planning phase: Use Claude to generate PRD and task list
   * This method is transactional - either everything succeeds or everything rolls back
   */
  private async startPlanningPhase(appRequest: AppRequest): Promise<void> {
    try {
      this.logger.info(
        { appRequestId: appRequest.id },
        'Starting planning phase'
      );

      if (!this.claudeService.isEnabled()) {
        throw new Error('Claude service is not available for planning');
      }

      // Build planning prompt
      const planningPrompt = this.buildPlanningPrompt(appRequest.prompt);

      // Call Claude to generate plan
      const response = await this.claudeService.complete({
        prompt: planningPrompt,
        maxTokens: 8192,
        temperature: 0.7,
      });

      this.logger.info(
        {
          appRequestId: appRequest.id,
          model: response.model,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        },
        'Planning completed by Claude'
      );

      // Parse and validate planning result
      const planningResult = this.parsePlanningResponse(response.content);
      this.validatePlanningResult(planningResult);

      // Save PRD as artifact (outside transaction - file I/O)
      const workspaceService = new WorkspaceService(
        this.logger,
        appRequest.projectId
      );
      const prdPath = 'PRD.md';

      this.logger.info(
        { appRequestId: appRequest.id, prdPath },
        'Writing PRD to workspace'
      );

      await workspaceService.writeFile(prdPath, planningResult.prd);

      this.logger.info(
        {
          appRequestId: appRequest.id,
          prdPath,
          taskCount: planningResult.tasks.length,
        },
        'PRD written, starting transaction for task creation'
      );

      // Use transaction for task creation and status update
      // If any step fails, everything rolls back
      await this.prisma.$transaction(
        async (tx) => {
          // Create tasks from planning result
          for (const taskData of planningResult.tasks) {
            this.logger.debug(
              {
                appRequestId: appRequest.id,
                taskTitle: taskData.title,
              },
              'Creating task from plan'
            );

            await tx.task.create({
              data: {
                id: randomUUID(),
                projectId: appRequest.projectId,
                appRequestId: appRequest.id,
                title: taskData.title.trim(),
                description: taskData.description.trim(),
                status: 'pending',
              },
            });
          }

          // Update app request status and store PRD path
          await tx.appRequest.update({
            where: { id: appRequest.id },
            data: {
              status: 'planned',
              prdPath,
              errorReason: null, // Clear any previous error
            },
          });
        },
        {
          maxWait: 10000, // Maximum time to wait for transaction to start (ms)
          timeout: 30000, // Maximum time transaction can run (ms)
        }
      );

      // Emit success event
      this.logger.info(
        {
          appRequestId: appRequest.id,
          tasksCreated: planningResult.tasks.length,
          prdPath,
        },
        'App request planning completed successfully'
      );

      // Create build approval (HITL gate before starting execution)
      await this.createBuildApproval(appRequest.id, appRequest.projectId);

      this.logger.info(
        { appRequestId: appRequest.id },
        'Build approval created - awaiting user approval to start building'
      );
    } catch (error) {
      // Normalize error for logging
      const normalizedError = normalizeError(error);

      logError(this.logger, error, 'Planning phase failed - inner catch');

      // Update status with error reason
      await this.updateAppRequestStatusWithError(
        appRequest.id,
        AppRequestStatus.Failed,
        normalizedError.message
      );

      // Re-throw to trigger outer catch
      throw normalizedError;
    }
  }

  /**
   * Validate planning result structure and content
   */
  private validatePlanningResult(result: PlanningResult): void {
    // Check PRD is not empty
    if (!result.prd || result.prd.trim().length === 0) {
      throw new Error('PRD is empty or missing');
    }

    // Check PRD has reasonable length
    if (result.prd.length < 100) {
      throw new Error('PRD is too short (less than 100 characters)');
    }

    // Check tasks array is valid
    if (!Array.isArray(result.tasks)) {
      throw new Error('Tasks must be an array');
    }

    if (result.tasks.length === 0) {
      throw new Error('No tasks generated');
    }

    if (result.tasks.length > 15) {
      throw new Error('Too many tasks generated (maximum 15)');
    }

    // Validate each task thoroughly
    result.tasks.forEach((task, i) => {
      if (!task.title || typeof task.title !== 'string') {
        throw new Error(`Task ${i + 1}: Missing or invalid title`);
      }

      if (task.title.trim().length === 0) {
        throw new Error(`Task ${i + 1}: Title is empty`);
      }

      if (task.title.length > 200) {
        throw new Error(`Task ${i + 1}: Title too long (max 200 characters)`);
      }

      if (!task.description || typeof task.description !== 'string') {
        throw new Error(`Task ${i + 1}: Missing or invalid description`);
      }

      if (task.description.trim().length === 0) {
        throw new Error(`Task ${i + 1}: Description is empty`);
      }

      if (task.description.length > 2000) {
        throw new Error(
          `Task ${i + 1}: Description too long (max 2000 characters)`
        );
      }
    });

    this.logger.info(
      { taskCount: result.tasks.length, prdLength: result.prd.length },
      'Planning result validated successfully'
    );
  }

  /**
   * Build the planning prompt for Claude
   */
  private buildPlanningPrompt(userPrompt: string): string {
    return `You are a product planner helping to design an application. A user has requested:

"${userPrompt}"

Your task is to create:
1. A Product Requirements Document (PRD) in markdown format
2. A task breakdown for implementation

## OUTPUT FORMAT

Respond with ONLY a JSON object in this exact format:

{
  "prd": "# Product Requirements Document\\n\\n[Your comprehensive PRD in markdown format]",
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed description of what needs to be implemented"
    }
  ]
}

## PRD GUIDELINES

The PRD should include:
- **Overview**: What is being built and why
- **User Stories**: Key user scenarios
- **Features**: Core functionality
- **Technical Approach**: Recommended technologies and architecture
- **Out of Scope**: What this app will NOT include

## TASK BREAKDOWN GUIDELINES

- Create 3-8 tasks that are concrete and actionable
- Each task should result in specific files being created
- Order tasks logically (setup → core features → polish)
- Tasks should be completable by an AI agent with file creation capabilities
- Be realistic about scope - favor simple, working implementations

## CONSTRAINTS

- Assume the app will be built with standard web technologies
- No database setup (use in-memory or file-based storage if needed)
- No deployment configuration
- No authentication/authorization (unless critical to the app concept)
- Focus on core functionality that demonstrates the app idea

Generate the plan now. Output ONLY valid JSON matching the format above.`;
  }

  /**
   * Parse Claude's planning response
   */
  private parsePlanningResponse(content: string): PlanningResult {
    try {
      // Remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n/, '');
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n/, '');
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.replace(/\n```$/, '');
      }

      const parsed = JSON.parse(cleanedContent) as PlanningResult;

      // Validate required fields
      if (
        typeof parsed.prd !== 'string' ||
        !Array.isArray(parsed.tasks) ||
        parsed.tasks.length === 0
      ) {
        throw new Error('Invalid planning response structure');
      }

      // Validate each task
      for (const task of parsed.tasks) {
        if (
          typeof task.title !== 'string' ||
          typeof task.description !== 'string'
        ) {
          throw new Error('Invalid task structure');
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error(
        { error, content: content.slice(0, 500) },
        'Failed to parse planning response'
      );
      throw new Error('Failed to parse planning response from AI');
    }
  }
}
