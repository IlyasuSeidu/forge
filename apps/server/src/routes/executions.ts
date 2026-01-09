import type { FastifyInstance } from 'fastify';
import type { ProjectService, ExecutionService } from '../services/index.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Execution routes
 */
export async function executionRoutes(
  fastify: FastifyInstance,
  projectService: ProjectService,
  executionService: ExecutionService
) {
  /**
   * POST /projects/:id/executions
   * Starts a new execution for a project
   */
  fastify.post<{ Params: { id: string } }>(
    '/projects/:id/executions',
    async (request, reply) => {
      const projectId = request.params.id;

      // Verify project exists
      if (!projectService.projectExists(projectId)) {
        throw new NotFoundError('Project', projectId);
      }

      const execution = await executionService.startExecution(projectId);

      fastify.log.info(
        { executionId: execution.id, projectId },
        'Execution started'
      );

      reply.code(201);
      return execution;
    }
  );

  /**
   * GET /projects/:id/executions/:executionId
   * Retrieves a specific execution
   */
  fastify.get<{ Params: { id: string; executionId: string } }>(
    '/projects/:id/executions/:executionId',
    async (request) => {
      const { id: projectId, executionId } = request.params;

      // Verify project exists
      if (!projectService.projectExists(projectId)) {
        throw new NotFoundError('Project', projectId);
      }

      const execution = executionService.getExecutionById(executionId);

      if (!execution) {
        throw new NotFoundError('Execution', executionId);
      }

      // Verify execution belongs to project
      if (execution.projectId !== projectId) {
        throw new NotFoundError('Execution', executionId);
      }

      return execution;
    }
  );
}
