import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Foundry Architect Routes
 * Agent 1: 8 foundational questions + answers
 */
export async function foundryRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/foundry-session
   * Gets the foundry session for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/foundry-session', async (request) => {
    const { appRequestId } = request.params;

    const session = await prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!session) {
      throw new NotFoundError('FoundrySession', `for app request ${appRequestId}`);
    }

    logger.info({ appRequestId, sessionId: session.id }, 'Foundry session retrieved');

    return {
      session: {
        id: session.id,
        appRequestId: session.appRequestId,
        status: session.status,
        currentStep: session.currentStep,
        approvedBy: session.approvedBy,
        approvedAt: session.approvedAt?.toISOString(),
        answers: session.answers ? JSON.parse(session.answers) : null,
        draftPrompt: session.draftPrompt,
        basePromptVersion: session.basePromptVersion,
        basePromptHash: session.basePromptHash,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
    };
  });
}
