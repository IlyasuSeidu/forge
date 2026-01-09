import type { FastifyInstance } from 'fastify';
import { validateCreateTaskInput } from '../models/index.js';
import type { ProjectService, TaskService } from '../services/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Task routes
 */
export async function taskRoutes(
  fastify: FastifyInstance,
  projectService: ProjectService,
  taskService: TaskService
) {
  /**
   * POST /projects/:id/tasks
   * Creates a new task for a project
   */
  fastify.post<{ Params: { id: string } }>(
    '/projects/:id/tasks',
    async (request, reply) => {
      const projectId = request.params.id;

      // Verify project exists
      if (!(await projectService.projectExists(projectId))) {
        throw new NotFoundError('Project', projectId);
      }

      // Validate input
      if (!validateCreateTaskInput(request.body)) {
        throw new ValidationError(
          'Invalid input: title (1-255 chars) and description (max 10000 chars) are required'
        );
      }

      const task = await taskService.createTask(projectId, request.body);

      fastify.log.info(
        { taskId: task.id, projectId },
        'Task created'
      );

      reply.code(201);
      return task;
    }
  );

  /**
   * GET /projects/:id/tasks
   * Retrieves all tasks for a project
   */
  fastify.get<{ Params: { id: string } }>(
    '/projects/:id/tasks',
    async (request) => {
      const projectId = request.params.id;

      // Verify project exists
      if (!(await projectService.projectExists(projectId))) {
        throw new NotFoundError('Project', projectId);
      }

      const tasks = await taskService.getTasksByProjectId(projectId);
      return { tasks };
    }
  );
}
