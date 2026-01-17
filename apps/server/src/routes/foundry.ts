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
   * GET /projects/:projectId/foundry-sessions/latest
   * Gets the most recent foundry session for a project
   */
  fastify.get<{
    Params: { projectId: string };
  }>('/projects/:projectId/foundry-sessions/latest', async (request) => {
    const { projectId } = request.params;

    const session = await prisma.foundrySession.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new NotFoundError('FoundrySession', `latest for project ${projectId}`);
    }

    logger.info({ projectId, sessionId: session.id }, 'Foundry session retrieved');

    return {
      session: {
        id: session.id,
        projectId: session.projectId,
        status: session.status,
        sessionHash: session.sessionHash,
        approvedBy: session.approvedBy,
        approvedAt: session.approvedAt?.toISOString(),
        answers: session.answers ? JSON.parse(session.answers) : null,
        basePromptHash: session.basePromptHash,
        createdAt: session.createdAt.toISOString(),
      },
    };
  });

  /**
   * GET /projects/:projectId/foundry-sessions/:sessionId
   * Gets a specific foundry session by ID
   */
  fastify.get<{
    Params: { projectId: string; sessionId: string };
  }>('/projects/:projectId/foundry-sessions/:sessionId', async (request) => {
    const { projectId, sessionId } = request.params;

    const session = await prisma.foundrySession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.projectId !== projectId) {
      throw new NotFoundError('FoundrySession', sessionId);
    }

    logger.info({ projectId, sessionId }, 'Foundry session retrieved');

    return {
      session: {
        id: session.id,
        projectId: session.projectId,
        status: session.status,
        sessionHash: session.sessionHash,
        approvedBy: session.approvedBy,
        approvedAt: session.approvedAt?.toISOString(),
        answers: session.answers ? JSON.parse(session.answers) : null,
        basePromptHash: session.basePromptHash,
        createdAt: session.createdAt.toISOString(),
      },
    };
  });
}
