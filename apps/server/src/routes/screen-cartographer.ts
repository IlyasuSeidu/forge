import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Screen Cartographer Routes
 * Agent 4: Screen index + definitions
 */
export async function screenCartographerRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/screen-index
   * Gets the screen index for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/screen-index', async (request) => {
    const { appRequestId } = request.params;

    const index = await prisma.screenIndex.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!index) {
      throw new NotFoundError('ScreenIndex', `for app request ${appRequestId}`);
    }

    logger.info({ appRequestId, indexId: index.id }, 'Screen index retrieved');

    return {
      index: {
        id: index.id,
        appRequestId: index.appRequestId,
        screens: index.screens ? JSON.parse(index.screens) : [],
        status: index.status,
        screenIndexVersion: index.screenIndexVersion,
        screenIndexHash: index.screenIndexHash,
        approvedBy: index.approvedBy,
        approvedAt: index.approvedAt?.toISOString(),
        basePromptHash: index.basePromptHash,
        planningDocsHash: index.planningDocsHash,
        createdAt: index.createdAt.toISOString(),
        updatedAt: index.updatedAt.toISOString(),
      },
    };
  });

  /**
   * GET /app-requests/:appRequestId/screens/:screenName
   * Gets a specific screen definition
   */
  fastify.get<{
    Params: { appRequestId: string; screenName: string };
  }>('/app-requests/:appRequestId/screens/:screenName', async (request) => {
    const { appRequestId, screenName } = request.params;

    const screen = await prisma.screenDefinition.findFirst({
      where: {
        appRequestId,
        screenName,
      },
    });

    if (!screen) {
      throw new NotFoundError('ScreenDefinition', screenName);
    }

    logger.info({ appRequestId, screenName }, 'Screen definition retrieved');

    return {
      screen: {
        id: screen.id,
        appRequestId: screen.appRequestId,
        screenName: screen.screenName,
        content: screen.content,
        order: screen.order,
        status: screen.status,
        screenVersion: screen.screenVersion,
        screenHash: screen.screenHash,
        approvedBy: screen.approvedBy,
        approvedAt: screen.approvedAt?.toISOString(),
        screenIndexHash: screen.screenIndexHash,
        basePromptHash: screen.basePromptHash,
        planningDocsHash: screen.planningDocsHash,
        createdAt: screen.createdAt.toISOString(),
        updatedAt: screen.updatedAt.toISOString(),
      },
    };
  });
}
