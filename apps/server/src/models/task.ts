import type { Task as PrismaTask } from '@prisma/client';

/**
 * Task status represents the current state of a task in the execution pipeline
 */
export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Blocked = 'blocked',
}

/**
 * Task represents a single unit of work within a project
 * Re-export Prisma type for consistency
 */
export type Task = PrismaTask;

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  title: string;
  description: string;
}

/**
 * Validates task creation input
 */
export function validateCreateTaskInput(
  input: unknown
): input is CreateTaskInput {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;

  return (
    typeof obj.title === 'string' &&
    obj.title.trim().length > 0 &&
    obj.title.trim().length <= 255 &&
    typeof obj.description === 'string' &&
    obj.description.trim().length <= 10000
  );
}
