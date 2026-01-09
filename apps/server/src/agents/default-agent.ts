import type { Task } from '../models/index.js';
import type { Agent, AgentContext, AgentResult } from './types.js';

/**
 * DefaultAgent handles all tasks with simulated execution
 * This is a placeholder agent until real AI integration is implemented
 */
export class DefaultAgent implements Agent {
  readonly name = 'DefaultAgent';

  /**
   * DefaultAgent can handle any task
   */
  canHandle(_task: Task): boolean {
    return true;
  }

  /**
   * Simulates task execution with a delay
   * Returns a successful result after processing
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    // Simulate work with a delay (500ms like the previous implementation)
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      message: `Simulated completion of task: ${task.title}`,
      artifacts: {
        taskId: task.id,
        executionId: context.execution.id,
        simulatedAt: new Date().toISOString(),
      },
    };
  }
}
