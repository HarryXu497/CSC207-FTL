import type { GetBranchOutputBoundary } from './output';

export interface GetBranchInputBoundary {
  handle(
    input: GetBranchInputData,
    presenter: GetBranchOutputBoundary,
  ): Promise<void>;
}

export interface GetBranchInputData {
  branchId: string;
}
