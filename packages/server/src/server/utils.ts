import type z from 'zod';

export function buildErrorFromSafeParseError<T>(result: z.ZodSafeParseError<T>, message: string) {
  return {
    message: message,
    details: result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })),
  };
}

/**
 * If `err` is a client mistake raised by Express itself (an oversized or malformed body), returns
 * the status and message to send back. Anything else is a genuine server error, so returns null.
 */
export function describeClientError(err: unknown): { status: number; message: string } | null {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status !== 'number' || status < 400 || status >= 500) {
    return null;
  }

  if (status === 413) {
    return { status, message: 'The request body is too large.' };
  }
  if (status === 400) {
    return { status, message: 'The request body could not be read as JSON.' };
  }
  return { status, message: 'The request was not valid.' };
}
