import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Visual Composition Architect (VCA) Routes
 * Agent 8: Visual composition contracts
 */
export async function vcaRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/visual-compositions
   * Gets all visual composition contracts for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/visual-compositions', async (request) => {
    const { appRequestId } = request.params;

    const compositions = await prisma.visualCompositionContract.findMany({
      where: { appRequestId },
      orderBy: { screenName: 'asc' },
    });

    if (compositions.length === 0) {
      throw new NotFoundError('VisualCompositionContract', `for app request ${appRequestId}`);
    }

    logger.info({ appRequestId, count: compositions.length }, 'Visual compositions retrieved');

    return {
      compositions: compositions.map((comp) => ({
        id: comp.id,
        appRequestId: comp.appRequestId,
        screenName: comp.screenName,
        layoutType: comp.layoutType,
        contractJson: comp.contractJson ? JSON.parse(comp.contractJson) : null,
        contractHash: comp.contractHash,
        contractVersion: comp.contractVersion,
        approvedBy: comp.approvedBy,
        approvedAt: comp.approvedAt?.toISOString(),
        basePromptHash: comp.basePromptHash,
        planningDocsHash: comp.planningDocsHash,
        screenIndexHash: comp.screenIndexHash,
        screenDefinitionHash: comp.screenDefinitionHash,
        visualExpansionContractHash: comp.visualExpansionContractHash,
        visualNormalizationContractHash: comp.visualNormalizationContractHash,
        status: comp.status,
        createdAt: comp.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /visual-compositions/:compositionId
   * Gets a specific visual composition contract
   */
  fastify.get<{
    Params: { compositionId: string };
  }>('/visual-compositions/:compositionId', async (request) => {
    const { compositionId } = request.params;

    const composition = await prisma.visualCompositionContract.findUnique({
      where: { id: compositionId },
    });

    if (!composition) {
      throw new NotFoundError('VisualCompositionContract', compositionId);
    }

    logger.info({ compositionId }, 'Visual composition retrieved');

    return {
      composition: {
        id: composition.id,
        appRequestId: composition.appRequestId,
        screenName: composition.screenName,
        layoutType: composition.layoutType,
        contractJson: composition.contractJson ? JSON.parse(composition.contractJson) : null,
        contractHash: composition.contractHash,
        contractVersion: composition.contractVersion,
        approvedBy: composition.approvedBy,
        approvedAt: composition.approvedAt?.toISOString(),
        basePromptHash: composition.basePromptHash,
        planningDocsHash: composition.planningDocsHash,
        screenIndexHash: composition.screenIndexHash,
        screenDefinitionHash: composition.screenDefinitionHash,
        visualExpansionContractHash: composition.visualExpansionContractHash,
        visualNormalizationContractHash: composition.visualNormalizationContractHash,
        status: composition.status,
        createdAt: composition.createdAt.toISOString(),
      },
    };
  });
}
