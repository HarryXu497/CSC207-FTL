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
