import { InvalidBranchPointError } from 'src/errors';
import type { Call } from './calls';

export interface Branch extends Call {
  parentId: string;
  /** Index of the original message to replace; only earlier messages are copied. */
  branchIndex: number;
}

/** Number of messages to copy when branching at an existing original message. */
export function getBranchPrefixLength(branchIndex: number, messageCount: number): number {
  if (!Number.isInteger(branchIndex) || branchIndex < 0 || branchIndex >= messageCount) {
    throw new InvalidBranchPointError(
      `Branch index out of range: got ${branchIndex}, call has ${messageCount} messages`,
    );
  }
  return branchIndex;
}
