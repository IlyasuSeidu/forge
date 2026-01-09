import type { Project as PrismaProject } from '@prisma/client';

/**
 * Project represents a user's application being built by Forge
 * Re-export Prisma type for consistency
 */
export type Project = PrismaProject;

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  name: string;
  description: string;
}

/**
 * Validates project creation input
 */
export function validateCreateProjectInput(
  input: unknown
): input is CreateProjectInput {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;

  return (
    typeof obj.name === 'string' &&
    obj.name.trim().length > 0 &&
    obj.name.trim().length <= 255 &&
    typeof obj.description === 'string' &&
    obj.description.trim().length <= 5000
  );
}
