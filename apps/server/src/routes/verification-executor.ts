import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Verification Executor Routes
 * Agent 13: Verifications + results
 */
export async function verificationExecutorRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/verifications
   * Gets all verifications for an app request (legacy)
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/verifications', async (request) => {
    const { appRequestId } = request.params;

    const verifications = await prisma.verification.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ appRequestId, count: verifications.length }, 'Verifications retrieved');

    return {
      verifications: verifications.map((verification) => ({
        id: verification.id,
        appRequestId: verification.appRequestId,
        executionId: verification.executionId,
        status: verification.status,
        errors: verification.errors,
        attempt: verification.attempt,
        createdAt: verification.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /app-requests/:appRequestId/verification-results
   * Gets all verification results for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/verification-results', async (request) => {
    const { appRequestId } = request.params;

    const results = await prisma.verificationResult.findMany({
      where: { appRequestId },
      orderBy: { executedAt: 'desc' },
    });

    logger.info({ appRequestId, count: results.length }, 'Verification results retrieved');

    return {
      results: results.map((result) => ({
        id: result.id,
        appRequestId: result.appRequestId,
        buildPromptHash: result.buildPromptHash,
        executionPlanHash: result.executionPlanHash,
        rulesHash: result.rulesHash,
        stepsJson: result.stepsJson ? JSON.parse(result.stepsJson) : [],
        overallStatus: result.overallStatus,
        verifier: result.verifier,
        resultHash: result.resultHash,
        executedAt: result.executedAt.toISOString(),
      })),
    };
  });

  /**
   * GET /verification-results/:resultId
   * Gets a specific verification result
   */
  fastify.get<{
    Params: { resultId: string };
  }>('/verification-results/:resultId', async (request) => {
    const { resultId } = request.params;

    const result = await prisma.verificationResult.findUnique({
      where: { id: resultId },
    });

    if (!result) {
      throw new NotFoundError('VerificationResult', resultId);
    }

    logger.info({ resultId }, 'Verification result retrieved');

    return {
      result: {
        id: result.id,
        appRequestId: result.appRequestId,
        buildPromptHash: result.buildPromptHash,
        executionPlanHash: result.executionPlanHash,
        rulesHash: result.rulesHash,
        stepsJson: result.stepsJson ? JSON.parse(result.stepsJson) : [],
        overallStatus: result.overallStatus,
        verifier: result.verifier,
        resultHash: result.resultHash,
        executedAt: result.executedAt.toISOString(),
      },
    };
  });
}
