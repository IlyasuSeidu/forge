import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';

/**
 * Forge Implementer Routes
 * Agent 12: Execution units + logs
 */
export async function forgeImplementerRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/execution-units
   * Gets all execution units for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/execution-units', async (request) => {
    const { appRequestId } = request.params;

    // Get all execution plans for this app request
    const plans = await prisma.executionPlan.findMany({
      where: { appRequestId },
      include: {
        units: {
          orderBy: { sequenceIndex: 'asc' },
        },
      },
    });

    const allUnits = plans.flatMap((plan) =>
      plan.units.map((unit) => ({
        id: unit.id,
        executionPlanId: unit.executionPlanId,
        sequenceIndex: unit.sequenceIndex,
        title: unit.title,
        description: unit.description,
        allowedCreateFiles: unit.allowedCreateFiles ? JSON.parse(unit.allowedCreateFiles) : [],
        allowedModifyFiles: unit.allowedModifyFiles ? JSON.parse(unit.allowedModifyFiles) : [],
        forbiddenFiles: unit.forbiddenFiles ? JSON.parse(unit.forbiddenFiles) : [],
        fullRewriteFiles: unit.fullRewriteFiles ? JSON.parse(unit.fullRewriteFiles) : [],
        dependencyChanges: unit.dependencyChanges ? JSON.parse(unit.dependencyChanges) : {},
        modificationIntent: unit.modificationIntent ? JSON.parse(unit.modificationIntent) : {},
        status: unit.status,
        completedAt: unit.completedAt?.toISOString(),
        createdAt: unit.createdAt.toISOString(),
      }))
    );

    logger.info({ appRequestId, count: allUnits.length }, 'Execution units retrieved');

    return {
      units: allUnits,
    };
  });

  /**
   * GET /execution-plans/:planId/units
   * Gets all execution units for a specific plan
   */
  fastify.get<{
    Params: { planId: string };
  }>('/execution-plans/:planId/units', async (request) => {
    const { planId } = request.params;

    const units = await prisma.executionUnit.findMany({
      where: { executionPlanId: planId },
      orderBy: { sequenceIndex: 'asc' },
    });

    logger.info({ planId, count: units.length }, 'Execution units for plan retrieved');

    return {
      units: units.map((unit) => ({
        id: unit.id,
        executionPlanId: unit.executionPlanId,
        sequenceIndex: unit.sequenceIndex,
        title: unit.title,
        description: unit.description,
        allowedCreateFiles: unit.allowedCreateFiles ? JSON.parse(unit.allowedCreateFiles) : [],
        allowedModifyFiles: unit.allowedModifyFiles ? JSON.parse(unit.allowedModifyFiles) : [],
        forbiddenFiles: unit.forbiddenFiles ? JSON.parse(unit.forbiddenFiles) : [],
        fullRewriteFiles: unit.fullRewriteFiles ? JSON.parse(unit.fullRewriteFiles) : [],
        dependencyChanges: unit.dependencyChanges ? JSON.parse(unit.dependencyChanges) : {},
        modificationIntent: unit.modificationIntent ? JSON.parse(unit.modificationIntent) : {},
        status: unit.status,
        completedAt: unit.completedAt?.toISOString(),
        createdAt: unit.createdAt.toISOString(),
      })),
    };
  });
}
