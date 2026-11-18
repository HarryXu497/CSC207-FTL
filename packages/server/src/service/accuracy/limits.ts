/**
 * Most characters of message text accepted in one accuracy analysis. About 30 minutes of speech,
 * and comfortably inside the 100kb JSON body limit. It also bounds the LLM cost of one request.
 */
export const MAX_TRANSCRIPT_CHARS = 30_000;

export const MAX_MESSAGES = 200;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_TOPIC_CHARS = 300;
