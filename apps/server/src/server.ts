import Fastify from 'fastify';
import { AppError } from './utils/errors.js';
import {
  ProjectService,
  TaskService,
  ExecutionService,
  ApprovalService,
  AppRequestService,
  VerificationService,
} from './services/index.js';
import { healthRoutes } from './routes/health.js';
import { projectRoutes } from './routes/projects.js';
import { taskRoutes } from './routes/tasks.js';
import { executionRoutes } from './routes/executions.js';
import { artifactRoutes } from './routes/artifacts.js';
import { approvalRoutes } from './routes/approvals.js';
import { appRequestRoutes } from './routes/app-requests.js';

/**
 * Creates and configures the Fastify server instance
 */
export async function createServer() {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),
      transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname',
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
    },
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
  });

  // Initialize services (in-memory for now)
  const projectService = new ProjectService();
  const taskService = new TaskService();
  const approvalService = new ApprovalService(fastify.log);
  const executionService = new ExecutionService(fastify.log);
  const verificationService = new VerificationService(fastify.log);
  const appRequestService = new AppRequestService(
    executionService.getPrismaClient(),
    fastify.log,
    approvalService,
    executionService
  );

  // Add JSON content type parser
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        const json = JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
        },
      });
      return;
    }

    // Log unexpected errors
    fastify.log.error(
      {
        err: error,
        requestId: request.id,
        url: request.url,
        method: request.method,
      },
      'Unhandled error'
    );

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    reply.status(500).send({
      error: {
        message: isDevelopment ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      },
    });
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(
    async (instance) => projectRoutes(instance, projectService),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) => taskRoutes(instance, projectService, taskService),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      executionRoutes(instance, projectService, executionService),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) => artifactRoutes(instance, projectService),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      approvalRoutes(
        instance,
        projectService,
        approvalService,
        executionService,
        appRequestService
      ),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      appRequestRoutes(instance, projectService, appRequestService, verificationService),
    { prefix: '/api' }
  );

  // Crash recovery: recover any executions that were running when server crashed
  fastify.addHook('onReady', async () => {
    await executionService.recoverCrashedExecutions();
  });

  return fastify;
}
