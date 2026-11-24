import { InvalidBranchPointError } from 'src/errors';
import type { Call } from './calls';

export type BranchPosition = 'before' | 'after';

export interface Branch extends Call {
  parentId: string;
  /** Index of the selected message in the original call. */
  branchIndex: number;
  /** Older branches without this field include the selected message ('after'). */
  branchPosition?: BranchPosition;
}

/** Number of messages to copy when branching at an existing original message. */
export function getBranchPrefixLength(
  branchIndex: number,
  position: BranchPosition,
  messageCount: number,
): number {
  if (!Number.isInteger(branchIndex) || branchIndex < 0 || branchIndex >= messageCount) {
    throw new InvalidBranchPointError(
      `Branch index out of range: got ${branchIndex}, call has ${messageCount} messages`,
    );
  }
  return position === 'before' ? branchIndex : branchIndex + 1;
}
