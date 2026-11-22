/** What a stored accuracy result belongs to. A branch is stored and analyzed like a call. */
export type AccuracyTarget = 'call' | 'branch';

export const TARGET_LABELS: Record<AccuracyTarget, string> = {
  call: 'Call',
  branch: 'Branch',
};
