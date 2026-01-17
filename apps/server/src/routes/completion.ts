import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Completion Auditor Routes
 * Agent 17: Final audit verdict + hash chain
 */
export async function completionRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/completion-report
   * Gets completion report for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/completion-report', async (request) => {
    const { appRequestId } = request.params;

    const report = await prisma.completionReport.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      throw new NotFoundError('CompletionReport', `for app request ${appRequestId}`);
    }

    logger.info({ appRequestId, reportId: report.id }, 'Completion report retrieved');

    return {
      report: {
        id: report.id,
        appRequestId: report.appRequestId,
        verdict: report.verdict,
        rulesHash: report.rulesHash,
        buildPromptCount: report.buildPromptCount,
        executionPlanCount: report.executionPlanCount,
        executionLogCount: report.executionLogCount,
        verificationStatus: report.verificationStatus,
        failureReasons: report.failureReasons ? JSON.parse(report.failureReasons) : null,
        reportHash: report.reportHash,
        reportJson: report.reportJson ? JSON.parse(report.reportJson) : null,
        createdAt: report.createdAt.toISOString(),
      },
    };
  });
}
