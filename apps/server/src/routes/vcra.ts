import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Visual Code Rendering Architect (VCRA) Routes
 * Agent 9: Visual code rendering contracts
 */
export async function vcraRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/visual-code-renderings
   * Gets all visual code rendering contracts for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/visual-code-renderings', async (request) => {
    const { appRequestId } = request.params;

    const renderings = await prisma.visualCodeRenderingContract.findMany({
      where: { appRequestId },
      orderBy: { screenName: 'asc' },
    });

    if (renderings.length === 0) {
      throw new NotFoundError('VisualCodeRenderingContract', `for app request ${appRequestId}`);
    }

    logger.info({ appRequestId, count: renderings.length }, 'Visual code renderings retrieved');

    return {
      renderings: renderings.map((rendering) => ({
        id: rendering.id,
        appRequestId: rendering.appRequestId,
        screenName: rendering.screenName,
        layoutType: rendering.layoutType,
        framework: rendering.framework,
        generatedCode: rendering.generatedCode,
        codeHash: rendering.codeHash,
        viewportWidth: rendering.viewportWidth,
        viewportHeight: rendering.viewportHeight,
        contractJson: rendering.contractJson ? JSON.parse(rendering.contractJson) : null,
        contractHash: rendering.contractHash,
        contractVersion: rendering.contractVersion,
        approvedBy: rendering.approvedBy,
        approvedAt: rendering.approvedAt?.toISOString(),
        basePromptHash: rendering.basePromptHash,
        planningDocsHash: rendering.planningDocsHash,
        screenIndexHash: rendering.screenIndexHash,
        screenDefinitionHash: rendering.screenDefinitionHash,
        visualExpansionContractHash: rendering.visualExpansionContractHash,
        visualNormalizationContractHash: rendering.visualNormalizationContractHash,
        visualCompositionContractHash: rendering.visualCompositionContractHash,
        status: rendering.status,
        createdAt: rendering.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /visual-code-renderings/:renderingId
   * Gets a specific visual code rendering contract
   */
  fastify.get<{
    Params: { renderingId: string };
  }>('/visual-code-renderings/:renderingId', async (request) => {
    const { renderingId } = request.params;

    const rendering = await prisma.visualCodeRenderingContract.findUnique({
      where: { id: renderingId },
    });

    if (!rendering) {
      throw new NotFoundError('VisualCodeRenderingContract', renderingId);
    }

    logger.info({ renderingId }, 'Visual code rendering retrieved');

    return {
      rendering: {
        id: rendering.id,
        appRequestId: rendering.appRequestId,
        screenName: rendering.screenName,
        layoutType: rendering.layoutType,
        framework: rendering.framework,
        generatedCode: rendering.generatedCode,
        codeHash: rendering.codeHash,
        viewportWidth: rendering.viewportWidth,
        viewportHeight: rendering.viewportHeight,
        contractJson: rendering.contractJson ? JSON.parse(rendering.contractJson) : null,
        contractHash: rendering.contractHash,
        contractVersion: rendering.contractVersion,
        approvedBy: rendering.approvedBy,
        approvedAt: rendering.approvedAt?.toISOString(),
        basePromptHash: rendering.basePromptHash,
        planningDocsHash: rendering.planningDocsHash,
        screenIndexHash: rendering.screenIndexHash,
        screenDefinitionHash: rendering.screenDefinitionHash,
        visualExpansionContractHash: rendering.visualExpansionContractHash,
        visualNormalizationContractHash: rendering.visualNormalizationContractHash,
        visualCompositionContractHash: rendering.visualCompositionContractHash,
        status: rendering.status,
        createdAt: rendering.createdAt.toISOString(),
      },
    };
  });
}
