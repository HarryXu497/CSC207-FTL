export interface Call {
  id: string;
  customerName: string;
  topic: string;
  /** ISO 8601 timestamp, e.g. '2026-09-28T16:05:00.000Z'. */
  createdAt: string;
}
