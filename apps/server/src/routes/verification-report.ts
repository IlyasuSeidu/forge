import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

/**
 * Verification Report Generator Routes
 * Agent 14: Verification reports
 */
export async function verificationReportRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /app-requests/:appRequestId/verification-reports
   * Gets all verification reports for an app request
   */
  fastify.get<{
    Params: { appRequestId: string };
  }>('/app-requests/:appRequestId/verification-reports', async (request) => {
    const { appRequestId } = request.params;

    const reports = await prisma.verificationReport.findMany({
      where: { appRequestId },
      orderBy: { generatedAt: 'desc' },
    });

    logger.info({ appRequestId, count: reports.length }, 'Verification reports retrieved');

    return {
      reports: reports.map((report) => ({
        id: report.id,
        appRequestId: report.appRequestId,
        verificationResultId: report.verificationResultId,
        reportJson: report.reportJson ? JSON.parse(report.reportJson) : null,
        generator: report.generator,
        reportHash: report.reportHash,
        verificationResultHash: report.verificationResultHash,
        buildPromptHash: report.buildPromptHash,
        executionPlanHash: report.executionPlanHash,
        rulesHash: report.rulesHash,
        generatedAt: report.generatedAt.toISOString(),
      })),
    };
  });

  /**
   * GET /app-requests/:appRequestId/verification-reports/:reportId
   * Gets a specific verification report
   */
  fastify.get<{
    Params: { appRequestId: string; reportId: string };
  }>('/app-requests/:appRequestId/verification-reports/:reportId', async (request) => {
    const { appRequestId, reportId } = request.params;

    const report = await prisma.verificationReport.findUnique({
      where: { id: reportId },
    });

    if (!report || report.appRequestId !== appRequestId) {
      throw new NotFoundError('VerificationReport', reportId);
    }

    logger.info({ appRequestId, reportId }, 'Verification report retrieved');

    return {
      report: {
        id: report.id,
        appRequestId: report.appRequestId,
        verificationResultId: report.verificationResultId,
        reportJson: report.reportJson ? JSON.parse(report.reportJson) : null,
        generator: report.generator,
        reportHash: report.reportHash,
        verificationResultHash: report.verificationResultHash,
        buildPromptHash: report.buildPromptHash,
        executionPlanHash: report.executionPlanHash,
        rulesHash: report.rulesHash,
        generatedAt: report.generatedAt.toISOString(),
      },
    };
  });
}
