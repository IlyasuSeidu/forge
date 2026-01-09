import crypto from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import type { Execution } from '../models/index.js';
import { ExecutionStatus } from '../models/index.js';

/**
 * ExecutionService manages execution state and orchestration
 * Currently implements stub behavior; will be replaced with real AI orchestration
 */
export class ExecutionService {
  private executions: Map<string, Execution> = new Map();
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'ExecutionService' });
  }

  /**
   * Creates and starts a new execution
   * Currently implements stub behavior: marks as running, then completes after 2 seconds
   */
  async startExecution(projectId: string): Promise<Execution> {
    const now = new Date();
    const execution: Execution = {
      id: crypto.randomUUID(),
      projectId,
      status: ExecutionStatus.Running,
      startedAt: now,
      finishedAt: null,
    };

    this.executions.set(execution.id, execution);

    this.logger.info(
      { executionId: execution.id, projectId },
      'Execution started (stub mode)'
    );

    // Stub behavior: simulate execution completing after 2 seconds
    setTimeout(() => {
      this.completeExecution(execution.id);
    }, 2000);

    return execution;
  }

  /**
   * Retrieves an execution by ID
   */
  getExecutionById(id: string): Execution | null {
    return this.executions.get(id) ?? null;
  }

  /**
   * Retrieves all executions for a project
   */
  getExecutionsByProjectId(projectId: string): Execution[] {
    return Array.from(this.executions.values())
      .filter((execution) => execution.projectId === projectId)
      .sort((a, b) => {
        const aTime = a.startedAt?.getTime() ?? 0;
        const bTime = b.startedAt?.getTime() ?? 0;
        return bTime - aTime;
      });
  }

  /**
   * Marks an execution as completed
   */
  private completeExecution(id: string): void {
    const execution = this.executions.get(id);
    if (!execution) {
      return;
    }

    const completedExecution: Execution = {
      ...execution,
      status: ExecutionStatus.Completed,
      finishedAt: new Date(),
    };

    this.executions.set(id, completedExecution);

    this.logger.info(
      { executionId: id, projectId: execution.projectId },
      'Execution completed (stub mode)'
    );
  }
}
