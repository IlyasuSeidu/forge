import crypto from 'node:crypto';
import type { Task, CreateTaskInput } from '../models/index.js';
import { TaskStatus } from '../models/index.js';

/**
 * TaskService manages task state
 * Currently in-memory; will be replaced with database persistence
 */
export class TaskService {
  private tasks: Map<string, Task> = new Map();

  /**
   * Creates a new task for a project
   */
  createTask(projectId: string, input: CreateTaskInput): Task {
    const now = new Date();
    const task: Task = {
      id: crypto.randomUUID(),
      projectId,
      title: input.title.trim(),
      description: input.description.trim(),
      status: TaskStatus.Pending,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Retrieves all tasks for a project
   */
  getTasksByProjectId(projectId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter((task) => task.projectId === projectId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Retrieves a task by ID
   */
  getTaskById(id: string): Task | null {
    return this.tasks.get(id) ?? null;
  }

  /**
   * Updates a task's status
   */
  updateTaskStatus(id: string, status: TaskStatus): Task | null {
    const task = this.tasks.get(id);
    if (!task) {
      return null;
    }

    const updatedTask: Task = {
      ...task,
      status,
      updatedAt: new Date(),
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
}
