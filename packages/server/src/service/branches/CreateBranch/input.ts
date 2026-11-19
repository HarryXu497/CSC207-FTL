import type { CreateBranchOutputBoundary } from './output';

export interface CreateBranchInputBoundary {
  handle(input: CreateBranchInputData, presenter: CreateBranchOutputBoundary): Promise<void>;
}

export interface CreateBranchInputData {
  callId: string;
  branchIndex: number;
}
