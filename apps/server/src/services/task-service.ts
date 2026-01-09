import crypto from 'node:crypto';
import type { Task, CreateTaskInput } from '../models/index.js';
import { TaskStatus } from '../models/index.js';
import { prisma } from '../lib/prisma.js';

/**
 * TaskService manages task state using Prisma
 */
export class TaskService {
  /**
   * Creates a new task for a project
   */
  async createTask(projectId: string, input: CreateTaskInput): Promise<Task> {
    const task = await prisma.task.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        title: input.title.trim(),
        description: input.description.trim(),
        status: TaskStatus.Pending,
      },
    });

    return task;
  }

  /**
   * Retrieves all tasks for a project
   */
  async getTasksByProjectId(projectId: string): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return tasks;
  }

  /**
   * Retrieves a task by ID
   */
  async getTaskById(id: string): Promise<Task | null> {
    const task = await prisma.task.findUnique({
      where: { id },
    });

    return task;
  }

  /**
   * Updates a task's status
   */
  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task | null> {
    const task = await prisma.task.update({
      where: { id },
      data: { status },
    });

    return task;
  }
}
