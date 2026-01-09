import crypto from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import type { Execution, ExecutionEvent } from '../models/index.js';
import { ExecutionStatus } from '../models/index.js';
import { prisma } from '../lib/prisma.js';
import { ExecutionRunner } from './execution-runner.js';
import { BusinessRuleError } from '../utils/errors.js';

/**
 * ExecutionService manages execution state and orchestration using Prisma
 */
export class ExecutionService {
  private logger: FastifyBaseLogger;
  private runner: ExecutionRunner;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'ExecutionService' });
    this.runner = new ExecutionRunner(logger);
  }

  /**
   * Creates and starts a new execution
   * Ensures only one execution can run at a time for a project
   */
  async startExecution(projectId: string): Promise<Execution> {
    // Check if there's already a running execution for this project
    const runningExecution = await prisma.execution.findFirst({
      where: {
        projectId,
        status: ExecutionStatus.Running,
      },
    });

    if (runningExecution) {
      throw new BusinessRuleError(
        `Cannot start execution: project already has a running execution (${runningExecution.id})`
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
}
