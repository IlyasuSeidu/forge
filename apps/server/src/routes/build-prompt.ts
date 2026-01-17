import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Build Prompt Engineer Routes
 * Agent 10: Build prompt contracts
 */
export async function buildPromptRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/build-prompts
   * Gets all build prompts for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/build-prompts', async (request) => {
    const { appRequestId } = request.params;

    const prompts = await prisma.buildPrompt.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ appRequestId, count: prompts.length }, 'Build prompts retrieved');

    return {
      buildPrompts: prompts.map((prompt) => ({
        id: prompt.id,
        appRequestId: prompt.appRequestId,
        title: prompt.title,
        content: prompt.content,
        sequenceIndex: prompt.sequenceIndex,
        status: prompt.status,
        feedback: prompt.feedback,
        allowedCreateFiles: prompt.allowedCreateFiles ? JSON.parse(prompt.allowedCreateFiles) : [],
        allowedModifyFiles: prompt.allowedModifyFiles ? JSON.parse(prompt.allowedModifyFiles) : [],
        forbiddenFiles: prompt.forbiddenFiles ? JSON.parse(prompt.forbiddenFiles) : [],
        fullRewriteFiles: prompt.fullRewriteFiles ? JSON.parse(prompt.fullRewriteFiles) : [],
        dependencyManifest: prompt.dependencyManifest ? JSON.parse(prompt.dependencyManifest) : {},
        modificationIntent: prompt.modificationIntent ? JSON.parse(prompt.modificationIntent) : {},
        contractHash: prompt.contractHash,
        contractJson: prompt.contractJson ? JSON.parse(prompt.contractJson) : null,
        approvedBy: prompt.approvedBy,
        approvedAt: prompt.approvedAt?.toISOString(),
        createdAt: prompt.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /app-requests/:appRequestId/build-prompts/:promptId
   * Gets a specific build prompt
   */
  fastify.get<{
    Params: { appRequestId: string; promptId: string };
  }>('/app-requests/:appRequestId/build-prompts/:promptId', async (request) => {
    const { appRequestId, promptId } = request.params;

    const prompt = await prisma.buildPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt || prompt.appRequestId !== appRequestId) {
      throw new NotFoundError('BuildPrompt', promptId);
    }

    logger.info({ appRequestId, promptId }, 'Build prompt retrieved');

    return {
      buildPrompt: {
        id: prompt.id,
        appRequestId: prompt.appRequestId,
        title: prompt.title,
        content: prompt.content,
        sequenceIndex: prompt.sequenceIndex,
        status: prompt.status,
        feedback: prompt.feedback,
        allowedCreateFiles: prompt.allowedCreateFiles ? JSON.parse(prompt.allowedCreateFiles) : [],
        allowedModifyFiles: prompt.allowedModifyFiles ? JSON.parse(prompt.allowedModifyFiles) : [],
        forbiddenFiles: prompt.forbiddenFiles ? JSON.parse(prompt.forbiddenFiles) : [],
        fullRewriteFiles: prompt.fullRewriteFiles ? JSON.parse(prompt.fullRewriteFiles) : [],
        dependencyManifest: prompt.dependencyManifest ? JSON.parse(prompt.dependencyManifest) : {},
        modificationIntent: prompt.modificationIntent ? JSON.parse(prompt.modificationIntent) : {},
        contractHash: prompt.contractHash,
        contractJson: prompt.contractJson ? JSON.parse(prompt.contractJson) : null,
        approvedBy: prompt.approvedBy,
        approvedAt: prompt.approvedAt?.toISOString(),
        createdAt: prompt.createdAt.toISOString(),
      },
    };
  });
}
