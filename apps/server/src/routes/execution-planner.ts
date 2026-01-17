import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Execution Planner Routes
 * Agent 11: Execution plans (task sequencing)
 */
export async function executionPlannerRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/execution-plans
   * Gets all execution plans for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/execution-plans', async (request) => {
    const { appRequestId } = request.params;

    const plans = await prisma.executionPlan.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ appRequestId, count: plans.length }, 'Execution plans retrieved');

    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        appRequestId: plan.appRequestId,
        buildPromptId: plan.buildPromptId,
        status: plan.status,
        contractHash: plan.contractHash,
        approvedBy: plan.approvedBy,
        approvedAt: plan.approvedAt?.toISOString(),
        contractJson: plan.contractJson ? JSON.parse(plan.contractJson) : null,
        buildPromptHash: plan.buildPromptHash,
        createdAt: plan.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /app-requests/:appRequestId/execution-plans/:planId
   * Gets a specific execution plan
   */
  fastify.get<{
    Params: { appRequestId: string; planId: string };
  }>('/app-requests/:appRequestId/execution-plans/:planId', async (request) => {
    const { appRequestId, planId } = request.params;

    const plan = await prisma.executionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.appRequestId !== appRequestId) {
      throw new NotFoundError('ExecutionPlan', planId);
    }

    logger.info({ appRequestId, planId }, 'Execution plan retrieved');

    return {
      plan: {
        id: plan.id,
        appRequestId: plan.appRequestId,
        buildPromptId: plan.buildPromptId,
        status: plan.status,
        contractHash: plan.contractHash,
        approvedBy: plan.approvedBy,
        approvedAt: plan.approvedAt?.toISOString(),
        contractJson: plan.contractJson ? JSON.parse(plan.contractJson) : null,
        buildPromptHash: plan.buildPromptHash,
        createdAt: plan.createdAt.toISOString(),
      },
    };
  });
}
