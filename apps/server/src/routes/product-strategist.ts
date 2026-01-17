import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Product Strategist Routes
 * Agent 3: Master plan + implementation plan
 */
export async function productStrategistRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/planning-documents
   * Gets all planning documents for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/planning-documents', async (request) => {
    const { appRequestId } = request.params;

    const documents = await prisma.planningDocument.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ appRequestId, count: documents.length }, 'Planning documents retrieved');

    return {
      documents: documents.map((doc) => ({
        id: doc.id,
        appRequestId: doc.appRequestId,
        type: doc.type,
        content: doc.content,
        status: doc.status,
        documentVersion: doc.documentVersion,
        documentHash: doc.documentHash,
        sectionHashes: doc.sectionHashes ? JSON.parse(doc.sectionHashes) : null,
        approvedBy: doc.approvedBy,
        approvedAt: doc.approvedAt?.toISOString(),
        basePromptHash: doc.basePromptHash,
        createdAt: doc.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /app-requests/:appRequestId/planning-documents/:documentId
   * Gets a specific planning document
   */
  fastify.get<{
    Params: { appRequestId: string; documentId: string };
  }>('/app-requests/:appRequestId/planning-documents/:documentId', async (request) => {
    const { appRequestId, documentId } = request.params;

    const doc = await prisma.planningDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.appRequestId !== appRequestId) {
      throw new NotFoundError('PlanningDocument', documentId);
    }

    logger.info({ appRequestId, documentId }, 'Planning document retrieved');

    return {
      document: {
        id: doc.id,
        appRequestId: doc.appRequestId,
        type: doc.type,
        content: doc.content,
        status: doc.status,
        documentVersion: doc.documentVersion,
        documentHash: doc.documentHash,
        sectionHashes: doc.sectionHashes ? JSON.parse(doc.sectionHashes) : null,
        approvedBy: doc.approvedBy,
        approvedAt: doc.approvedAt?.toISOString(),
        basePromptHash: doc.basePromptHash,
        createdAt: doc.createdAt.toISOString(),
      },
    };
  });
}
