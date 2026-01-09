import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { ExecutionStatus, TaskStatus } from '../models/index.js';
import crypto from 'node:crypto';

/**
 * ExecutionRunner handles the execution state machine and orchestration
 * Processes tasks sequentially and emits events for each step
 */
export class ExecutionRunner {
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'ExecutionRunner' });
  }

  /**
   * Starts an execution and processes all tasks
   * State transitions: idle/paused → running → completed | failed | paused
   * Supports resuming from paused state
   */
  async runExecution(executionId: string): Promise<void> {
    try {
      // Get current execution state
      let execution = await prisma.execution.findUnique({
        where: { id: executionId },
      });

      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      // Determine if this is a fresh start or a resume
      const isResume = execution.status === ExecutionStatus.Paused;

      // Mark execution as running
      execution = await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.Running,
          startedAt: execution.startedAt ?? new Date(),
        },
      });

      this.logger.info(
        { executionId, projectId: execution.projectId, isResume },
        isResume ? 'Execution resumed' : 'Execution started'
      );

      // Emit appropriate event
      if (isResume) {
        await this.emitEvent(executionId, 'execution_resumed', 'Execution has resumed');
      } else {
        await this.emitEvent(executionId, 'execution_started', 'Execution has started');
      }

      // Fetch all tasks for the project
      const tasks = await prisma.task.findMany({
        where: { projectId: execution.projectId },
        orderBy: { createdAt: 'asc' },
      });

      this.logger.info(
        { executionId, taskCount: tasks.length },
        'Processing tasks'
      );

      // Process each task sequentially
      for (const task of tasks) {
        // Check if execution was paused before processing next task
        const currentExecution = await prisma.execution.findUnique({
          where: { id: executionId },
        });

        if (currentExecution?.status === ExecutionStatus.Paused) {
          this.logger.info(
            { executionId },
            'Execution paused, stopping task processing'
          );
          return; // Stop processing, execution is already marked as paused
        }

        // Process task (idempotent - skips already completed tasks)
        await this.processTask(executionId, task.id);
      }

      // Mark execution as completed
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.Completed,
          finishedAt: new Date(),
        },
      });

      this.logger.info({ executionId }, 'Execution completed');

      // Emit execution_completed event
      await this.emitEvent(
        executionId,
        'execution_completed',
        'All tasks have been completed successfully'
      );
    } catch (error) {
      // Mark execution as failed
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.Failed,
          finishedAt: new Date(),
        },
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        { executionId, error: errorMessage },
        'Execution failed'
      );

      // Emit execution_failed event
      await this.emitEvent(
        executionId,
        'execution_failed',
        `Execution failed: ${errorMessage}`
      );
    }
  }

  /**
   * Processes a single task (idempotent)
   * Skips tasks that are already completed for this execution
   * Simulates task processing with a delay
   */
  private async processTask(executionId: string, taskId: string): Promise<void> {
    // Fetch current task state
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Skip if task was already completed in this or previous execution
    if (task.status === TaskStatus.Completed && task.finishedAt) {
      this.logger.info(
        { executionId, taskId, title: task.title },
        'Task already completed, skipping'
      );
      return;
    }

    // Mark task as in_progress and associate with this execution
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.InProgress,
        executionId,
        startedAt: new Date(),
      },
    });

    this.logger.info(
      { executionId, taskId, title: task.title },
      'Task started'
    );

    // Emit task_started event
    await this.emitEvent(
      executionId,
      'task_started',
      `Started task: ${task.title}`
    );

    // Simulate task processing (500ms delay)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mark task as completed
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.Completed,
        finishedAt: new Date(),
      },
    });

    this.logger.info(
      { executionId, taskId, title: task.title },
      'Task completed'
    );

    // Emit task_completed event
    await this.emitEvent(
      executionId,
      'task_completed',
      `Completed task: ${task.title}`
    );
  }

  /**
   * Emits an execution event
   */
  private async emitEvent(
    executionId: string,
    type: string,
    message: string
  ): Promise<void> {
    await prisma.executionEvent.create({
      data: {
        id: crypto.randomUUID(),
        executionId,
        type,
        message,
      },
    });
  }
}
