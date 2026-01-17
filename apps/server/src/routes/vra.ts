import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Visual Requirements Architect (VRA) Routes
 * Agent 6: Visual expansion contracts
 */
export async function vraRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/visual-expansions
   * Gets all visual expansion contracts for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/visual-expansions', async (request) => {
    const { appRequestId } = request.params;

    const expansions = await prisma.visualExpansionContract.findMany({
      where: { appRequestId },
      orderBy: { screenName: 'asc' },
    });

    if (expansions.length === 0) {
      throw new NotFoundError('VisualExpansionContract', `for app request ${appRequestId}`);
    }

    logger.info({ appRequestId, count: expansions.length }, 'Visual expansions retrieved');

    return {
      expansions: expansions.map((expansion) => ({
        id: expansion.id,
        appRequestId: expansion.appRequestId,
        screenName: expansion.screenName,
        layoutType: expansion.layoutType,
        contractJson: expansion.contractJson ? JSON.parse(expansion.contractJson) : null,
        contractHash: expansion.contractHash,
        contractVersion: expansion.contractVersion,
        approvedBy: expansion.approvedBy,
        approvedAt: expansion.approvedAt?.toISOString(),
        basePromptHash: expansion.basePromptHash,
        planningDocsHash: expansion.planningDocsHash,
        screenIndexHash: expansion.screenIndexHash,
        screenDefinitionHash: expansion.screenDefinitionHash,
        journeyHash: expansion.journeyHash,
        status: expansion.status,
        createdAt: expansion.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /visual-expansions/:expansionId
   * Gets a specific visual expansion contract
   */
  fastify.get<{
    Params: { expansionId: string };
  }>('/visual-expansions/:expansionId', async (request) => {
    const { expansionId } = request.params;

    const expansion = await prisma.visualExpansionContract.findUnique({
      where: { id: expansionId },
    });

    if (!expansion) {
      throw new NotFoundError('VisualExpansionContract', expansionId);
    }

    logger.info({ expansionId }, 'Visual expansion retrieved');

    return {
      expansion: {
        id: expansion.id,
        appRequestId: expansion.appRequestId,
        screenName: expansion.screenName,
        layoutType: expansion.layoutType,
        contractJson: expansion.contractJson ? JSON.parse(expansion.contractJson) : null,
        contractHash: expansion.contractHash,
        contractVersion: expansion.contractVersion,
        approvedBy: expansion.approvedBy,
        approvedAt: expansion.approvedAt?.toISOString(),
        basePromptHash: expansion.basePromptHash,
        planningDocsHash: expansion.planningDocsHash,
        screenIndexHash: expansion.screenIndexHash,
        screenDefinitionHash: expansion.screenDefinitionHash,
        journeyHash: expansion.journeyHash,
        status: expansion.status,
        createdAt: expansion.createdAt.toISOString(),
      },
    };
  });
}
