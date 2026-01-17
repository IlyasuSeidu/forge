import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';

/**
 * Repair Agent Routes
 * Agent 16: Repair execution logs
 */
export async function repairAgentRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/repair-executions
   * Gets all repair execution logs for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/repair-executions', async (request) => {
    const { appRequestId } = request.params;

    // Get all repair execution logs for this app request
    const logs = await prisma.repairExecutionLog.findMany({
      where: { appRequestId },
      orderBy: { executedAt: 'desc' },
    });

    const allLogs = logs.map((log) => ({
      id: log.id,
      appRequestId: log.appRequestId,
      repairPlanId: log.repairPlanId,
      executionLogJson: log.executionLogJson ? JSON.parse(log.executionLogJson) : null,
      overallStatus: log.overallStatus,
      executor: log.executor,
      executionLogHash: log.executionLogHash,
      repairPlanHash: log.repairPlanHash,
      executedAt: log.executedAt.toISOString(),
    }));

    logger.info({ appRequestId, count: allLogs.length }, 'Repair execution logs retrieved');

    return {
      logs: allLogs,
    };
  });

  /**
   * GET /repair-plans/:planId/executions
   * Gets all execution logs for a specific repair plan
   */
  fastify.get<{
    Params: { planId: string };
  }>('/repair-plans/:planId/executions', async (request) => {
    const { planId } = request.params;

    const logs = await prisma.repairExecutionLog.findMany({
      where: { repairPlanId: planId },
      orderBy: { executedAt: 'desc' },
    });

    logger.info({ planId, count: logs.length }, 'Repair execution logs for plan retrieved');

    return {
      logs: logs.map((log) => ({
        id: log.id,
        appRequestId: log.appRequestId,
        repairPlanId: log.repairPlanId,
        executionLogJson: log.executionLogJson ? JSON.parse(log.executionLogJson) : null,
        overallStatus: log.overallStatus,
        executor: log.executor,
        executionLogHash: log.executionLogHash,
        repairPlanHash: log.repairPlanHash,
        executedAt: log.executedAt.toISOString(),
      })),
    };
  });
}
