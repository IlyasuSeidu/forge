import type { FastifyInstance } from 'fastify';
import { validateCreateProjectInput } from '../models/index.js';
import type { ProjectService } from '../services/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Project routes
 */
export async function projectRoutes(
  fastify: FastifyInstance,
  projectService: ProjectService
) {
  /**
   * POST /projects
   * Creates a new project
   */
  fastify.post('/projects', async (request, reply) => {
    if (!validateCreateProjectInput(request.body)) {
      throw new ValidationError(
        'Invalid input: name (1-255 chars) and description (max 5000 chars) are required'
      );
    }

    const project = projectService.createProject(request.body);

    fastify.log.info({ projectId: project.id }, 'Project created');

    reply.code(201);
    return project;
  });

  /**
   * GET /projects
   * Retrieves all projects
   */
  fastify.get('/projects', async () => {
    const projects = projectService.getAllProjects();
    return { projects };
  });

  /**
   * GET /projects/:id
   * Retrieves a specific project by ID
   */
  fastify.get<{ Params: { id: string } }>(
    '/projects/:id',
    async (request) => {
      const project = projectService.getProjectById(request.params.id);

      if (!project) {
        throw new NotFoundError('Project', request.params.id);
      }

      return project;
    }
  );
}
