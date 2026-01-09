import type { Task } from '../models/index.js';
import type { Agent, AgentContext, AgentResult } from './types.js';

/**
 * TestFailingAgent is used for testing failure scenarios
 * Fails when task title contains "FAIL"
 */
export class TestFailingAgent implements Agent {
  readonly name = 'TestFailingAgent';

  /**
   * Can handle tasks that have "FAIL" in their title
   */
  canHandle(task: Task): boolean {
    return task.title.includes('FAIL');
  }

  /**
   * Always returns a failure result for testing
   */
  async execute(task: Task, _context: AgentContext): Promise<AgentResult> {
    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      success: false,
      message: 'Task failed intentionally for testing',
      error: `TestFailingAgent failed to execute task: ${task.title}`,
    };
  }
}
