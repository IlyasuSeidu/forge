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

  /**
   * Get content of a specific artifact
   */
  fastify.get<{
    Params: { id: string; executionId: string; '*': string };
  }>('/projects/:id/executions/:executionId/artifacts/*', async (request, reply) => {
    const { id: projectId, executionId } = request.params;
    const artifactPath = request.params['*'];

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

    // Find the artifact
    const artifact = await prisma.artifact.findFirst({
      where: {
        projectId,
        executionId,
        path: artifactPath,
      },
    });

    if (!artifact) {
      throw new NotFoundError('Artifact', artifactPath);
    }

    // Read file content from workspace
    const { WorkspaceService } = await import('../services/workspace-service.js');
    const workspaceService = new WorkspaceService(fastify.log, projectId);

    try {
      const content = await workspaceService.readFile(artifactPath);

      // Set appropriate content type
      const contentType = artifact.path.endsWith('.html')
        ? 'text/html'
        : artifact.path.endsWith('.js')
        ? 'application/javascript'
        : artifact.path.endsWith('.css')
        ? 'text/css'
        : artifact.path.endsWith('.json')
        ? 'application/json'
        : 'text/plain';

      reply.type(contentType);
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(
        { projectId, executionId, artifactPath, error: errorMessage },
        'Failed to read artifact content'
      );
      throw new Error(`Failed to read artifact: ${errorMessage}`);
    }
  });
}
