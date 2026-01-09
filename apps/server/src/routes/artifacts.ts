import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../utils/errors.js';
import type { ProjectService } from '../services/project-service.js';
import { prisma } from '../lib/prisma.js';

/**
 * Artifact routes
 * GET /projects/:id/artifacts - List all artifacts for a project
 * GET /projects/:id/executions/:executionId/artifacts - List artifacts for an execution
 */
export async function artifactRoutes(
  fastify: FastifyInstance,
  projectService: ProjectService
): Promise<void> {
  /**
   * List all artifacts for a project
   * Optionally filter by execution ID or task ID via query params
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { executionId?: string; taskId?: string };
  }>('/projects/:id/artifacts', async (request) => {
    const { id: projectId } = request.params;
    const { executionId, taskId } = request.query;

    // Verify project exists
    if (!(await projectService.projectExists(projectId))) {
      throw new NotFoundError('Project', projectId);
    }

    // Build filter
    const where: {
      projectId: string;
      executionId?: string;
      taskId?: string;
    } = {
      projectId,
    };

    if (executionId) {
      where.executionId = executionId;
    }

    if (taskId) {
      where.taskId = taskId;
    }

    // Fetch artifacts
    const artifacts = await prisma.artifact.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return artifacts;
  });

  /**
   * List all artifacts for a specific execution
   */
  fastify.get<{
    Params: { id: string; executionId: string };
    Querystring: { taskId?: string };
  }>('/projects/:id/executions/:executionId/artifacts', async (request) => {
    const { id: projectId, executionId } = request.params;
    const { taskId } = request.query;

    // Verify project exists
    if (!(await projectService.projectExists(projectId))) {
      throw new NotFoundError('Project', projectId);
    }

    // Verify execution exists and belongs to project
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution || execution.projectId !== projectId) {
      throw new NotFoundError('Execution', executionId);
    }

    // Build filter
    const where: {
      projectId: string;
      executionId: string;
      taskId?: string;
    } = {
      projectId,
      executionId,
    };

    if (taskId) {
      where.taskId = taskId;
    }

    // Fetch artifacts
    const artifacts = await prisma.artifact.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return artifacts;
  });
}
