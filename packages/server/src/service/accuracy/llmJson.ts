import type { z } from 'zod';
import type { LlmClient, LlmRequest } from 'src/repository';

/** The model's reply could not be turned into the expected structure, even after a retry. */
export class LlmOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmOutputError';
  }
}

/** Pulls the JSON object out of a reply that may be wrapped in prose or a ```json fence. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('No JSON object found in the reply.');
  }
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Asks the model for JSON and validates it against `schema`. On a bad reply it retries once,
 * telling the model what was wrong, since that fixes most formatting slips.
 */
export async function completeJson<S extends z.ZodType>(
  llm: LlmClient,
  request: LlmRequest,
  schema: S,
  maxAttempts = 2,
): Promise<z.infer<S>> {
  let user = request.user;
  let lastProblem = 'unknown problem';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const reply = await llm.complete({ system: request.system, user });

    try {
      const parsed = schema.safeParse(extractJson(reply));
      if (parsed.success) {
        return parsed.data;
      }
      lastProblem = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }

    user = `${request.user}\n\nYour previous reply was rejected (${lastProblem}). Reply again with only the JSON object, exactly in the requested format.`;
  }

  throw new LlmOutputError(`The model did not return valid JSON: ${lastProblem}`);
}
