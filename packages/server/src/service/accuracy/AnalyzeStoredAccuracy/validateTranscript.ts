import type { TranscriptMessage } from 'src/entities';
import {
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES,
  MAX_TRANSCRIPT_CHARS,
  type ValidationIssue,
} from '../AnalyzeAccuracy';

/**
 * Checks a stored transcript against the same limits as one sent in a request body. A transcript
 * that comes from the database has not been through the controller's request validation.
 */
export function validateTranscript(messages: TranscriptMessage[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (messages.length === 0) {
    issues.push({ field: 'messages', message: 'At least one message is required.' });
  }

  if (messages.length > MAX_MESSAGES) {
    issues.push({ field: 'messages', message: `At most ${MAX_MESSAGES} messages are allowed.` });
  }

  messages.forEach(({ content }, i) => {
    if (content.trim().length === 0) {
      issues.push({ field: `messages.${i}.content`, message: 'Message content is required.' });
    } else if (content.length > MAX_MESSAGE_CHARS) {
      issues.push({
        field: `messages.${i}.content`,
        message: `Message content is too long (at most ${MAX_MESSAGE_CHARS} characters).`,
      });
    }
  });

  const total = messages.reduce((sum, m) => sum + m.content.length, 0);

  if (total > MAX_TRANSCRIPT_CHARS) {
    issues.push({
      field: 'messages',
      message: `The transcript is too long (at most ${MAX_TRANSCRIPT_CHARS.toLocaleString('en-US')} characters of message text).`,
    });
  }

  return issues;
}
