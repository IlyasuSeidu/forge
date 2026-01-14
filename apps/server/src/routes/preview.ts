/**
 * PREVIEW RUNTIME API ENDPOINTS
 *
 * REST API for Preview Runtime mechanical execution chamber.
 *
 * Endpoints:
 * - POST /api/preview/start - Start preview session
 * - GET /api/preview/status/:sessionId - Get session status
 * - POST /api/preview/terminate/:sessionId - Terminate session
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { PreviewRuntime } from '../preview/preview-runtime';

export async function previewRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  const previewRuntime = new PreviewRuntime(prisma, logger);

  /**
   * POST /api/preview/start
   *
   * Start a preview session for a completed build.
   *
   * Body: { appRequestId: string }
   * Returns: { sessionId: string, message: string }
   */
  fastify.post('/api/preview/start', async (request, reply) => {
    const { appRequestId } = request.body as { appRequestId: string };

    if (!appRequestId) {
      return reply.code(400).send({
        error: 'Missing required field: appRequestId',
      });
    }

    try {
      const sessionId = await previewRuntime.startPreview(appRequestId);

      return reply.code(202).send({
        sessionId,
        message: 'Preview session started',
      });
    } catch (err: any) {
      logger.error({
        event: 'preview.start_failed',
        appRequestId,
        error: err.message,
      });

      // Check if it's a precondition failure
      if (err.message.includes('PRECONDITION VALIDATION FAILED')) {
        return reply.code(422).send({
          error: 'Preconditions not met',
          details: err.message,
        });
      }

      return reply.code(500).send({
        error: 'Failed to start preview',
        details: err.message,
      });
    }
  });

  /**
   * GET /api/preview/status/:sessionId
   *
   * Get current status of a preview session.
   *
   * Returns: {
   *   sessionId: string,
   *   status: SessionStatus,
   *   previewUrl: string | null,
   *   failureStage: string | null,
   *   failureOutput: string | null
   * }
   */
  fastify.get('/api/preview/status/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const status = await previewRuntime.getPreviewStatus(sessionId);

      return reply.code(200).send(status);
    } catch (err: any) {
      if (err.message.includes('Session not found')) {
        return reply.code(404).send({
          error: 'Session not found',
          sessionId,
        });
      }

      return reply.code(500).send({
        error: 'Failed to get preview status',
        details: err.message,
      });
    }
  });

  /**
   * POST /api/preview/terminate/:sessionId
   *
   * Terminate a preview session (cleanup and destroy container).
   *
   * Returns: { message: string }
   */
  fastify.post('/api/preview/terminate/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      await previewRuntime.terminatePreview(sessionId, 'MANUAL');

      return reply.code(200).send({
        message: 'Preview session terminated',
      });
    } catch (err: any) {
      if (err.message.includes('Session not found')) {
        return reply.code(404).send({
          error: 'Session not found',
          sessionId,
        });
      }

      return reply.code(500).send({
        error: 'Failed to terminate preview',
        details: err.message,
      });
    }
  });

  /**
   * Graceful shutdown handler.
   * Cleanup all active sessions when server stops.
   */
  fastify.addHook('onClose', async () => {
    logger.info({ event: 'preview.server_shutdown' });
    await previewRuntime.cleanupAll();
  });
}
