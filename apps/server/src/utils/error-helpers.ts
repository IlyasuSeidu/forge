/**
 * Normalizes unknown error values to Error instances
 * Essential for proper error logging and serialization
 */
export function normalizeError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }

  if (typeof err === 'string') {
    return new Error(err);
  }

  // Handle objects with message property
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error(String(err.message));
  }

  // Last resort: stringify
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error('Unknown error occurred');
  }
}

/**
 * Logs error with full context (message, stack, raw value)
 * Prevents the {} logging issue
 */
export function logError(
  logger: { error: (obj: any, msg: string) => void },
  error: unknown,
  message: string
): void {
  const normalizedError = normalizeError(error);

  logger.error(
    {
      message: normalizedError.message,
      stack: normalizedError.stack,
      raw: error,
    },
    message
  );
}
