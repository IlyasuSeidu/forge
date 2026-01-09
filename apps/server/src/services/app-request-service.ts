import type { FastifyBaseLogger } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AppRequest, AppRequestStatus } from '../models/index.js';
import { ClaudeService } from './claude-service.js';
import { TaskService } from './task-service.js';
import { ApprovalService } from './approval-service.js';
import { WorkspaceService } from './workspace-service.js';
import { ApprovalType } from '../models/index.js';

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
  private taskService: TaskService;
  private approvalService: ApprovalService;

  constructor(
    prisma: PrismaClient,
    logger: FastifyBaseLogger,
    taskService: TaskService,
    approvalService: ApprovalService
  ) {
    this.prisma = prisma;
    this.logger = logger.child({ service: 'AppRequestService' });
    this.claudeService = new ClaudeService(logger);
    this.taskService = taskService;
    this.approvalService = approvalService;
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
    this.startPlanningPhase(appRequest).catch((error) => {
      this.logger.error(
        { appRequestId: id, error },
        'Planning phase failed'
      );
      this.updateAppRequestStatus(id, 'failed');
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
   * Start planning phase: Use Claude to generate PRD and task list
   */
  private async startPlanningPhase(appRequest: AppRequest): Promise<void> {
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

    // Parse planning result
    const planningResult = this.parsePlanningResponse(response.content);

    // Save PRD as artifact (writeFile automatically creates artifact record)
    const workspaceService = new WorkspaceService(
      this.logger,
      appRequest.projectId
    );
    const prdPath = 'PRD.md';
    await workspaceService.writeFile(
      prdPath,
      planningResult.prd
    );

    // Create tasks from planning result
    for (const taskData of planningResult.tasks) {
      await this.taskService.createTask(
        appRequest.projectId,
        taskData.title,
        taskData.description
      );
    }

    // Update app request status and store PRD path
    await this.prisma.appRequest.update({
      where: { id: appRequest.id },
      data: {
        status: 'planned',
        prdPath,
      },
    });

    this.logger.info(
      {
        appRequestId: appRequest.id,
        tasksCreated: planningResult.tasks.length,
        prdPath,
      },
      'Planning phase completed'
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
