/** What a stored sentiment result belongs to. A branch is stored and analyzed like a call. */
export type SentimentTarget = 'call' | 'branch';

export const TARGET_LABELS: Record<SentimentTarget, string> = {
  call: 'Call',
  branch: 'Branch',
};
