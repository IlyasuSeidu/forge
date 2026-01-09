import pino from 'pino';

/**
 * Creates a structured logger instance
 * In development: pretty-printed output
 * In production: JSON output for log aggregation
 */
export function createLogger() {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return pino({
    level: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  });
}
