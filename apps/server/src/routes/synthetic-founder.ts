import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Synthetic Founder Routes
 * Agent 2: AI-proposed answers + base prompt
 */
export async function syntheticFounderRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/synthetic-answers
   * Gets synthetic answers for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/synthetic-answers', async (request) => {
    const { appRequestId } = request.params;

    const answer = await prisma.syntheticAnswer.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!answer) {
      throw new NotFoundError('SyntheticAnswer', `for app request ${appRequestId}`);
    }

    logger.info({ appRequestId, answerId: answer.id }, 'Synthetic answer retrieved');

    return {
      answer: {
        id: answer.id,
        appRequestId: answer.appRequestId,
        foundrySessionId: answer.foundrySessionId,
        step: answer.step,
        question: answer.question,
        proposedAnswer: answer.proposedAnswer,
        finalAnswer: answer.finalAnswer,
        status: answer.status,
        contract: answer.contract ? JSON.parse(answer.contract) : null,
        requestHash: answer.requestHash,
        createdAt: answer.createdAt.toISOString(),
        updatedAt: answer.updatedAt.toISOString(),
      },
    };
  });
}
