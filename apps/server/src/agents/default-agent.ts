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
   * Creates artifacts in the workspace to demonstrate workspace usage
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    // Simulate work with a delay (500ms like the previous implementation)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create a task output directory
    const taskDir = `task-${task.id}`;
    await context.createDirectory(taskDir);

    // Create a result file with task execution details
    const resultData = {
      taskId: task.id,
      taskTitle: task.title,
      executionId: context.execution.id,
      projectId: context.project.id,
      completedAt: new Date().toISOString(),
      status: 'completed',
    };

    const resultPath = `${taskDir}/result.json`;
    await context.writeFile(resultPath, JSON.stringify(resultData, null, 2));

    return {
      success: true,
      message: `Simulated completion of task: ${task.title}`,
      artifacts: {
        directory: taskDir,
        resultFile: resultPath,
      },
    };
  }
}
