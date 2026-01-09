import crypto from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import type { Execution, ExecutionEvent } from '../models/index.js';
import { ExecutionStatus } from '../models/index.js';
import { prisma } from '../lib/prisma.js';
import { ExecutionRunner } from './execution-runner.js';
import { AgentRegistry } from '../agents/index.js';
import { BusinessRuleError } from '../utils/errors.js';

/**
 * ExecutionService manages execution state and orchestration using Prisma
 */
export class ExecutionService {
  private logger: FastifyBaseLogger;
  private runner: ExecutionRunner;
  private agentRegistry: AgentRegistry;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'ExecutionService' });
    this.agentRegistry = new AgentRegistry();
    // Note: Register custom agents here when implementing AI integration
    // Example: this.agentRegistry.registerAgent(new ClaudeAgent());

    this.runner = new ExecutionRunner(logger, this.agentRegistry);
  }

  /**
   * Creates and starts a new execution
   * Ensures only one execution can run at a time for a project
   */
  async startExecution(projectId: string): Promise<Execution> {
    // Check if there's already a running or paused execution for this project
    const activeExecution = await prisma.execution.findFirst({
      where: {
        projectId,
        status: {
          in: [ExecutionStatus.Running, ExecutionStatus.Paused],
        },
      },
    });

    if (activeExecution) {
      throw new BusinessRuleError(
        `Cannot start execution: project already has an active execution (${activeExecution.id}, status: ${activeExecution.status})`
      );
    }

    // Create new execution
    const execution = await prisma.execution.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        status: ExecutionStatus.Idle,
      },
    });

    this.logger.info(
      { executionId: execution.id, projectId },
      'Execution created, starting runner'
    );

    // Start execution in background (non-blocking)
    setImmediate(() => {
      this.runner.runExecution(execution.id).catch((error) => {
        this.logger.error(
          { executionId: execution.id, error },
          'Execution runner failed'
        );
      });
    });

    return execution;
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
}
