import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Journey Orchestrator Routes
 * Agent 5: User journeys (happy paths + edge cases)
 */
export async function journeyOrchestratorRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/user-journeys
   * Gets all user journeys for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/user-journeys', async (request) => {
    const { appRequestId } = request.params;

    const journeys = await prisma.userJourney.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ appRequestId, count: journeys.length }, 'User journeys retrieved');

    return {
      journeys: journeys.map((journey) => ({
        id: journey.id,
        appRequestId: journey.appRequestId,
        roleName: journey.roleName,
        content: journey.content,
        order: journey.order,
        status: journey.status,
        journeyVersion: journey.journeyVersion,
        journeyHash: journey.journeyHash,
        approvedBy: journey.approvedBy,
        approvedAt: journey.approvedAt?.toISOString(),
        roleTableHash: journey.roleTableHash,
        screenIndexHash: journey.screenIndexHash,
        basePromptHash: journey.basePromptHash,
        planningDocsHash: journey.planningDocsHash,
        createdAt: journey.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /app-requests/:appRequestId/user-journeys/:journeyId
   * Gets a specific user journey
   */
  fastify.get<{
    Params: { appRequestId: string; journeyId: string };
  }>('/app-requests/:appRequestId/user-journeys/:journeyId', async (request) => {
    const { appRequestId, journeyId } = request.params;

    const journey = await prisma.userJourney.findUnique({
      where: { id: journeyId },
    });

    if (!journey || journey.appRequestId !== appRequestId) {
      throw new NotFoundError('UserJourney', journeyId);
    }

    logger.info({ appRequestId, journeyId }, 'User journey retrieved');

    return {
      journey: {
        id: journey.id,
        appRequestId: journey.appRequestId,
        roleName: journey.roleName,
        content: journey.content,
        order: journey.order,
        status: journey.status,
        journeyVersion: journey.journeyVersion,
        journeyHash: journey.journeyHash,
        approvedBy: journey.approvedBy,
        approvedAt: journey.approvedAt?.toISOString(),
        roleTableHash: journey.roleTableHash,
        screenIndexHash: journey.screenIndexHash,
        basePromptHash: journey.basePromptHash,
        planningDocsHash: journey.planningDocsHash,
        createdAt: journey.createdAt.toISOString(),
      },
    };
  });
}
