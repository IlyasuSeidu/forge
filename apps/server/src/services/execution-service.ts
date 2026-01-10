import crypto from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import type { Execution, ExecutionEvent } from '../models/index.js';
import { ExecutionStatus, ApprovalType } from '../models/index.js';
import { prisma } from '../lib/prisma.js';
import { ExecutionRunner } from './execution-runner.js';
import { AgentRegistry, ClaudeAgent } from '../agents/index.js';
import { ApprovalService } from './approval-service.js';
import { BusinessRuleError } from '../utils/errors.js';

/**
 * ExecutionService manages execution state and orchestration using Prisma
 */
export class ExecutionService {
  private logger: FastifyBaseLogger;
  private runner: ExecutionRunner;
  private agentRegistry: AgentRegistry;
  private approvalService: ApprovalService;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'ExecutionService' });
    this.agentRegistry = new AgentRegistry();
    this.approvalService = new ApprovalService(logger);

    // Register AI agents with higher priority than DefaultAgent
    // ClaudeAgent will be used if ANTHROPIC_API_KEY is set and task matches criteria
    const claudeAgent = new ClaudeAgent(logger);
    this.agentRegistry.registerAgent(claudeAgent);
    this.logger.info(
      { claudeEnabled: claudeAgent.canHandle({ title: 'test code', description: '' } as any) },
      'Agent registry configured'
    );

    this.runner = new ExecutionRunner(logger, this.agentRegistry);
  }

  /**
   * Creates a new execution and requests approval before starting
   * Ensures only one execution can run at a time for a project
   */
  async startExecution(projectId: string): Promise<Execution> {
    // Check if there's already a running, paused, or pending approval execution for this project
    const activeExecution = await prisma.execution.findFirst({
      where: {
        projectId,
        status: {
          in: [ExecutionStatus.Running, ExecutionStatus.Paused, ExecutionStatus.PendingApproval],
        },
      },
    });

    if (activeExecution) {
      throw new BusinessRuleError(
        `Cannot start execution: project already has an active execution (${activeExecution.id}, status: ${activeExecution.status})`
      );
    }

    // Create new execution with pending_approval status
    const execution = await prisma.execution.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        status: ExecutionStatus.PendingApproval,
      },
    });

    this.logger.info(
      { executionId: execution.id, projectId },
      'Execution created, awaiting approval'
    );

    // Create approval request
    const approval = await this.approvalService.createApproval({
      projectId,
      executionId: execution.id,
      type: ApprovalType.ExecutionStart,
    });

    // Emit approval_requested event
    await prisma.executionEvent.create({
      data: {
        id: crypto.randomUUID(),
        executionId: execution.id,
        type: 'approval_requested',
        message: `Execution start requires approval (approval ID: ${approval.id})`,
      },
    });

    return execution;
  }

  /**
   * Handles approval of an execution and starts it
   * Called by approval resolution logic
   */
  async handleExecutionApproval(executionId: string): Promise<void> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new BusinessRuleError(`Execution ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.PendingApproval) {
      this.logger.warn(
        { executionId, status: execution.status },
        'Execution is not pending approval, skipping start'
      );
      return;
    }

    this.logger.info({ executionId }, 'Execution approved, starting runner');

    // Transition execution from pending_approval to idle so runner can start it
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.Idle,
      },
    });

    // Emit approval_approved event
    await prisma.executionEvent.create({
      data: {
        id: crypto.randomUUID(),
        executionId,
        type: 'approval_approved',
        message: 'Execution start approved',
      },
    });

    // Start execution in background (non-blocking)
    setImmediate(() => {
      this.runner.runExecution(executionId).catch((error) => {
        this.logger.error(
          { executionId, error },
          'Execution runner failed after approval'
        );
      });
    });
  }

  /**
   * Handles rejection of an execution
   * Called by approval resolution logic
   */
  async handleExecutionRejection(executionId: string, reason?: string): Promise<void> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new BusinessRuleError(`Execution ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.PendingApproval) {
      this.logger.warn(
        { executionId, status: execution.status },
        'Execution is not pending approval, skipping rejection'
      );
      return;
    }

    this.logger.info({ executionId, reason }, 'Execution rejected');

    // Mark execution as failed
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.Failed,
        finishedAt: new Date(),
      },
    });

    // Emit approval_rejected event
    await prisma.executionEvent.create({
      data: {
        id: crypto.randomUUID(),
        executionId,
        type: 'approval_rejected',
        message: reason ? `Execution start rejected: ${reason}` : 'Execution start rejected',
      },
    });
  }

  /**
   * Creates an execution for an app request (approval already handled by AppRequestService)
   * This execution will process only tasks linked to the appRequestId
   */
  async createExecutionForAppRequest(
    projectId: string,
    appRequestId: string
  ): Promise<Execution> {
    // Check if there's already a running, paused, or pending approval execution for this project
    const activeExecution = await prisma.execution.findFirst({
      where: {
        projectId,
        status: {
          in: [
            ExecutionStatus.Running,
            ExecutionStatus.Paused,
            ExecutionStatus.PendingApproval,
          ],
        },
      },
    });

    if (activeExecution) {
      throw new BusinessRuleError(
        `Cannot start execution: project already has an active execution (${activeExecution.id}, status: ${activeExecution.status})`
      );
    }

    // Create new execution in IDLE state (approval already handled)
    const execution = await prisma.execution.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        appRequestId,
        status: ExecutionStatus.Idle,
      },
    });

    this.logger.info(
      { executionId: execution.id, projectId, appRequestId },
      'Execution created for app request'
    );

    // Emit execution_created event
    await prisma.executionEvent.create({
      data: {
        id: crypto.randomUUID(),
        executionId: execution.id,
        type: 'execution_created',
        message: `Execution created for app request ${appRequestId}`,
      },
    });

    return execution;
  }

  /**
   * Starts an execution for an app request (approval already handled)
   */
  async startExecutionForAppRequest(executionId: string): Promise<void> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new BusinessRuleError(`Execution ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.Idle) {
      this.logger.warn(
        { executionId, status: execution.status },
        'Execution is not idle, cannot start'
      );
      return;
    }

    this.logger.info({ executionId }, 'Starting execution for app request');

    // Start execution in background (non-blocking)
    setImmediate(async () => {
      try {
        await this.runner.runExecution(executionId);
        // After execution completes, sync AppRequest status
        await this.syncAppRequestStatus(executionId);
      } catch (error) {
        this.logger.error(
          { executionId, error },
          'Execution runner failed for app request'
        );
        // Even on failure, sync AppRequest status
        await this.syncAppRequestStatus(executionId);
      }
    });
  }

  /**
   * Syncs AppRequest status based on execution status
   * Called after execution completes or fails
   */
  private async syncAppRequestStatus(executionId: string): Promise<void> {
    try {
      const execution = await prisma.execution.findUnique({
        where: { id: executionId },
      });

      if (!execution || !execution.appRequestId) {
        // Not linked to an AppRequest, nothing to sync
        return;
      }

      const appRequest = await prisma.appRequest.findUnique({
        where: { id: execution.appRequestId },
      });

      if (!appRequest) {
        this.logger.warn(
          { executionId, appRequestId: execution.appRequestId },
          'AppRequest not found for execution'
        );
        return;
      }

      // Update AppRequest status based on execution status
      let newStatus: string;
      let errorReason: string | null = null;

      if (execution.status === ExecutionStatus.Completed) {
        newStatus = 'completed';
        this.logger.info(
          { executionId, appRequestId: execution.appRequestId },
          'Marking AppRequest as completed'
        );
      } else if (execution.status === ExecutionStatus.Failed) {
        newStatus = 'failed';
        errorReason = 'Execution failed during build';
        this.logger.info(
          { executionId, appRequestId: execution.appRequestId },
          'Marking AppRequest as failed'
        );
      } else {
        // Still running or paused, don't update
        return;
      }

      await prisma.appRequest.update({
        where: { id: execution.appRequestId },
        data: {
          status: newStatus,
          errorReason,
        },
      });

      this.logger.info(
        {
          appRequestId: execution.appRequestId,
          executionId,
          status: newStatus,
        },
        'AppRequest status synced with execution'
      );
    } catch (error) {
      this.logger.error(
        { executionId, error },
        'Failed to sync AppRequest status'
      );
    }
  }

  /**
   * Retrieves an execution by ID
   */
  async getExecutionById(id: string): Promise<Execution | null> {
    const execution = await prisma.execution.findUnique({
      where: { id },
    });

    return execution;
  }

  /**
   * Retrieves all executions for a project
   */
  async getExecutionsByProjectId(projectId: string): Promise<Execution[]> {
    const executions = await prisma.execution.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
    });

    return executions;
  }

  /**
   * Retrieves all events for an execution
   */
  async getExecutionEvents(executionId: string): Promise<ExecutionEvent[]> {
    const events = await prisma.executionEvent.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    });

    return events;
  }

  /**
   * Pauses a running execution
   * Only allowed if execution is currently running
   */
  async pauseExecution(executionId: string): Promise<Execution> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new BusinessRuleError(`Execution ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.Running) {
      throw new BusinessRuleError(
        `Cannot pause execution: execution is not running (current status: ${execution.status})`
      );
    }

    // Mark execution as paused
    const pausedExecution = await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.Paused,
      },
    });

    // Emit pause event
    await prisma.executionEvent.create({
      data: {
        id: crypto.randomUUID(),
        executionId,
        type: 'execution_paused',
        message: 'Execution has been paused',
      },
    });

    this.logger.info({ executionId }, 'Execution paused');

    return pausedExecution;
  }

  /**
   * Resumes a paused execution
   * Only allowed if execution is currently paused
   */
  async resumeExecution(executionId: string): Promise<Execution> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new BusinessRuleError(`Execution ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.Paused) {
      throw new BusinessRuleError(
        `Cannot resume execution: execution is not paused (current status: ${execution.status})`
      );
    }

    this.logger.info({ executionId }, 'Resuming execution');

    // Resume execution in background (non-blocking)
    setImmediate(() => {
      this.runner.runExecution(executionId).catch((error) => {
        this.logger.error(
          { executionId, error },
          'Execution runner failed during resume'
        );
      });
    });

    // Return the execution (will be marked as running by the runner)
    return execution;
  }

  /**
   * Recovers any executions that were running when the server crashed
   * Should be called on server startup
   */
  async recoverCrashedExecutions(): Promise<void> {
    const runningExecutions = await prisma.execution.findMany({
      where: {
        status: ExecutionStatus.Running,
      },
    });

    if (runningExecutions.length === 0) {
      this.logger.info('No crashed executions to recover');
      return;
    }

    this.logger.info(
      { count: runningExecutions.length },
      'Recovering crashed executions'
    );

    for (const execution of runningExecutions) {
      // Mark execution as paused
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.Paused,
        },
      });

      // Emit recovery event
      await prisma.executionEvent.create({
        data: {
          id: crypto.randomUUID(),
          executionId: execution.id,
          type: 'execution_recovered',
          message: 'Execution recovered after server restart',
        },
      });

      this.logger.info(
        { executionId: execution.id, projectId: execution.projectId },
        'Execution recovered and paused'
      );
    }
  }

  /**
   * Get Prisma client for other services
   */
  getPrismaClient() {
    return prisma;
  }
}
