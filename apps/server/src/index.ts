import 'dotenv/config';
import { createServer } from './server.js';

/**
 * Application entry point
 */
async function main() {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    const server = await createServer();

    await server.listen({ port, host });

    server.log.info(
      `Forge server listening on http://${host}:${port}`
    );

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      server.log.info(`Received ${signal}, shutting down gracefully`);
      await server.close();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
