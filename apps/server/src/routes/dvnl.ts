import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Design Vocabulary Normalizer (DVNL) Routes
 * Agent 7: Visual normalization contracts
 */
export async function dvnlRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/visual-normalizations
   * Gets all visual normalization contracts for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/visual-normalizations', async (request) => {
    const { appRequestId } = request.params;

    const normalizations = await prisma.visualNormalizationContract.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'asc' },
    });

    if (normalizations.length === 0) {
      throw new NotFoundError('VisualNormalizationContract', `for app request ${appRequestId}`);
    }

    logger.info({ appRequestId, count: normalizations.length }, 'Visual normalizations retrieved');

    return {
      normalizations: normalizations.map((norm) => ({
        id: norm.id,
        appRequestId: norm.appRequestId,
        screenName: norm.screenName,
        layoutType: norm.layoutType,
        contractJson: norm.contractJson ? JSON.parse(norm.contractJson) : null,
        contractHash: norm.contractHash,
        contractVersion: norm.contractVersion,
        approvedBy: norm.approvedBy,
        approvedAt: norm.approvedAt?.toISOString(),
        basePromptHash: norm.basePromptHash,
        planningDocsHash: norm.planningDocsHash,
        screenIndexHash: norm.screenIndexHash,
        screenDefinitionHash: norm.screenDefinitionHash,
        visualExpansionContractHash: norm.visualExpansionContractHash,
        status: norm.status,
        createdAt: norm.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /visual-normalizations/:normalizationId
   * Gets a specific visual normalization contract
   */
  fastify.get<{
    Params: { normalizationId: string };
  }>('/visual-normalizations/:normalizationId', async (request) => {
    const { normalizationId } = request.params;

    const normalization = await prisma.visualNormalizationContract.findUnique({
      where: { id: normalizationId },
    });

    if (!normalization) {
      throw new NotFoundError('VisualNormalizationContract', normalizationId);
    }

    logger.info({ normalizationId }, 'Visual normalization retrieved');

    return {
      normalization: {
        id: normalization.id,
        appRequestId: normalization.appRequestId,
        screenName: normalization.screenName,
        layoutType: normalization.layoutType,
        contractJson: normalization.contractJson ? JSON.parse(normalization.contractJson) : null,
        contractHash: normalization.contractHash,
        contractVersion: normalization.contractVersion,
        approvedBy: normalization.approvedBy,
        approvedAt: normalization.approvedAt?.toISOString(),
        basePromptHash: normalization.basePromptHash,
        planningDocsHash: normalization.planningDocsHash,
        screenIndexHash: normalization.screenIndexHash,
        screenDefinitionHash: normalization.screenDefinitionHash,
        visualExpansionContractHash: normalization.visualExpansionContractHash,
        status: normalization.status,
        createdAt: normalization.createdAt.toISOString(),
      },
    };
  });
}
