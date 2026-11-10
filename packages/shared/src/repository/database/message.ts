/**
 * Represents a message in a call.
 */
export interface Message {
  id: string;
  role: 'agent' | 'customer';
  content: string;
  /** ISO 8601 timestamp, e.g. '2026-09-28T16:05:00.000Z'. */
  createdAt: string;
}
