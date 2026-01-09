import type { FastifyInstance } from 'fastify';

/**
 * Health check routes
 */
export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health
   * Returns the health status of the server
   */
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}
