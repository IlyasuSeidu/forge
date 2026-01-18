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
import { ForgeConductor } from './conductor/index.js';
import { healthRoutes } from './routes/health.js';
import { projectRoutes } from './routes/projects.js';
import { taskRoutes } from './routes/tasks.js';
import { executionRoutes } from './routes/executions.js';
import { artifactRoutes } from './routes/artifacts.js';
import { approvalRoutes } from './routes/approvals.js';
import { appRequestRoutes } from './routes/app-requests.js';
import { previewRoutes } from './routes/preview.js';
import { foundryRoutes } from './routes/foundry.js';
import { foundryArchitectRoutes } from './routes/foundryArchitect.js';
import { syntheticFounderRoutes } from './routes/synthetic-founder.js';
import { productStrategistRoutes } from './routes/product-strategist.js';
import { screenCartographerRoutes } from './routes/screen-cartographer.js';
import { journeyOrchestratorRoutes } from './routes/journey-orchestrator.js';
import { vraRoutes } from './routes/vra.js';
import { dvnlRoutes } from './routes/dvnl.js';
import { vcaRoutes } from './routes/vca.js';
import { vcraRoutes } from './routes/vcra.js';
import { buildPromptRoutes } from './routes/build-prompt.js';
import { executionPlannerRoutes } from './routes/execution-planner.js';
import { forgeImplementerRoutes } from './routes/forge-implementer.js';
import { verificationExecutorRoutes } from './routes/verification-executor.js';
import { verificationReportRoutes } from './routes/verification-report.js';
import { repairPlanRoutes } from './routes/repair-plan.js';
import { repairAgentRoutes } from './routes/repair-agent.js';
import { completionRoutes } from './routes/completion.js';

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

  // Initialize Forge Conductor (master orchestration engine)
  const conductor = new ForgeConductor(
    executionService.getPrismaClient(),
    fastify.log
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
  await fastify.register(
    async (instance) =>
      previewRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );

  // Register agent-specific artifact routes
  // PRODUCTION WIRING: Agent 1 with full conductor integration
  await fastify.register(
    async (instance) =>
      foundryArchitectRoutes(
        instance,
        executionService.getPrismaClient(),
        conductor,
        fastify.log as any
      ),
    { prefix: '/api' }
  );

  // Legacy foundry routes (kept for backwards compatibility)
  await fastify.register(
    async (instance) =>
      foundryRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      syntheticFounderRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      productStrategistRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      screenCartographerRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      journeyOrchestratorRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      vraRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      dvnlRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      vcaRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      vcraRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      buildPromptRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      executionPlannerRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      forgeImplementerRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      verificationExecutorRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      verificationReportRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      repairPlanRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      repairAgentRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );
  await fastify.register(
    async (instance) =>
      completionRoutes(instance, executionService.getPrismaClient(), fastify.log as any),
    { prefix: '/api' }
  );

  // Crash recovery: recover any executions that were running when server crashed
  fastify.addHook('onReady', async () => {
    await executionService.recoverCrashedExecutions();
  });

  return fastify;
}
