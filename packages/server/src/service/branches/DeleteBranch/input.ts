import type { DeleteBranchOutputBoundary } from './output';

export interface DeleteBranchInputBoundary {
  handle(input: DeleteBranchInputData, presenter: DeleteBranchOutputBoundary): Promise<void>;
}

export interface DeleteBranchInputData {
  branchId: string;
}
