import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Repair Plan Generator Routes
 * Agent 15: Repair plans
 */
export async function repairPlanRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/repair-plans
   * Gets all repair plans for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/repair-plans', async (request) => {
    const { appRequestId } = request.params;

    const plans = await prisma.repairPlan.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ appRequestId, count: plans.length }, 'Repair plans retrieved');

    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        appRequestId: plan.appRequestId,
        verificationResultId: plan.verificationResultId,
        repairPlanJson: plan.repairPlanJson ? JSON.parse(plan.repairPlanJson) : null,
        allowedFileModifications: plan.allowedFileModifications ? JSON.parse(plan.allowedFileModifications) : [],
        repairStepsJson: plan.repairStepsJson ? JSON.parse(plan.repairStepsJson) : [],
        approvedBy: plan.approvedBy,
        status: plan.status,
        repairPlanHash: plan.repairPlanHash,
        sourceVerificationHash: plan.sourceVerificationHash,
        createdAt: plan.createdAt.toISOString(),
        approvedAt: plan.approvedAt?.toISOString(),
      })),
    };
  });

  /**
   * GET /app-requests/:appRequestId/repair-plans/:planId
   * Gets a specific repair plan
   */
  fastify.get<{
    Params: { appRequestId: string; planId: string };
  }>('/app-requests/:appRequestId/repair-plans/:planId', async (request) => {
    const { appRequestId, planId } = request.params;

    const plan = await prisma.repairPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.appRequestId !== appRequestId) {
      throw new NotFoundError('RepairPlan', planId);
    }

    logger.info({ appRequestId, planId }, 'Repair plan retrieved');

    return {
      plan: {
        id: plan.id,
        appRequestId: plan.appRequestId,
        verificationResultId: plan.verificationResultId,
        repairPlanJson: plan.repairPlanJson ? JSON.parse(plan.repairPlanJson) : null,
        allowedFileModifications: plan.allowedFileModifications ? JSON.parse(plan.allowedFileModifications) : [],
        repairStepsJson: plan.repairStepsJson ? JSON.parse(plan.repairStepsJson) : [],
        approvedBy: plan.approvedBy,
        status: plan.status,
        repairPlanHash: plan.repairPlanHash,
        sourceVerificationHash: plan.sourceVerificationHash,
        createdAt: plan.createdAt.toISOString(),
        approvedAt: plan.approvedAt?.toISOString(),
      },
    };
  });
}
