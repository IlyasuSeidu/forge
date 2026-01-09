import type { FastifyInstance } from 'fastify';
import type { ProjectService, AppRequestService } from '../services/index.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * App Request routes
 * Handles end-to-end "Build an App" flow
 */
export async function appRequestRoutes(
  fastify: FastifyInstance,
  projectService: ProjectService,
  appRequestService: AppRequestService
) {
  /**
   * POST /projects/:id/app-requests
   * Create a new app request (starts planning phase)
   */
  fastify.post<{
    Params: { id: string };
    Body: { prompt: string };
  }>('/projects/:id/app-requests', async (request, reply) => {
    const projectId = request.params.id;
    const { prompt } = request.body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return reply.code(400).send({
        error: {
          message: 'Prompt is required and must be a non-empty string',
          code: 'INVALID_INPUT',
          statusCode: 400,
        },
      });
    }

    // Verify project exists
    if (!(await projectService.projectExists(projectId))) {
      throw new NotFoundError('Project', projectId);
    }

    const appRequest = await appRequestService.createAppRequest(
      projectId,
      prompt.trim()
    );

    fastify.log.info(
      { appRequestId: appRequest.id, projectId, prompt: prompt.slice(0, 100) },
      'App request created'
    );

    reply.code(201);
    return appRequest;
  });

  /**
   * GET /projects/:id/app-requests
   * List all app requests for a project
   */
  fastify.get<{ Params: { id: string } }>(
    '/projects/:id/app-requests',
    async (request) => {
      const projectId = request.params.id;

      // Verify project exists
      if (!(await projectService.projectExists(projectId))) {
        throw new NotFoundError('Project', projectId);
      }

      const appRequests = await appRequestService.getAppRequestsByProjectId(
        projectId
      );

      return { appRequests };
    }
  );

  /**
   * GET /projects/:id/app-requests/:appRequestId
   * Get a specific app request
   */
  fastify.get<{ Params: { id: string; appRequestId: string } }>(
    '/projects/:id/app-requests/:appRequestId',
    async (request) => {
      const { id: projectId, appRequestId } = request.params;

      // Verify project exists
      if (!(await projectService.projectExists(projectId))) {
        throw new NotFoundError('Project', projectId);
      }

      const appRequest = await appRequestService.getAppRequestById(
        appRequestId
      );

      if (!appRequest) {
        throw new NotFoundError('AppRequest', appRequestId);
      }

      // Verify app request belongs to project
      if (appRequest.projectId !== projectId) {
        throw new NotFoundError('AppRequest', appRequestId);
      }

      return appRequest;
    }
  );
}
