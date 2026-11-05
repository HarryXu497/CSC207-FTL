/**
 * Request size limits. Kept in one place because the HTTP layer and request validation must agree:
 * if validation allows more than the body parser does, valid-looking requests fail confusingly.
 */

/** Largest JSON request body Express will accept. */
export const JSON_BODY_LIMIT = '100kb';

/**
 * Most characters of message text accepted in one accuracy analysis. About 30 minutes of speech,
 * and comfortably inside JSON_BODY_LIMIT for ordinary text. It also bounds the LLM cost per request.
 */
export const MAX_TRANSCRIPT_CHARS = 30_000;
