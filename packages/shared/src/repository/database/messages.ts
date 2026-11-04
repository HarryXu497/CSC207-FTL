/** Who produced a message in a call. */
export type MessageSpeaker = 'agent' | 'customer';

/** One turn of a call's conversation. */
export interface Message {
  speaker: MessageSpeaker;
  text: string;
  /** ISO 8601 timestamp, e.g. '2026-09-28T16:05:00.000Z'. */
  time?: string;
}
