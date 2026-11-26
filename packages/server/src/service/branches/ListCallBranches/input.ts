import type { ListCallBranchesOutputBoundary } from './output';

export interface ListCallBranchesInputBoundary {
  handle(
    input: ListCallBranchesInputData,
    presenter: ListCallBranchesOutputBoundary,
  ): Promise<void>;
}

export interface ListCallBranchesInputData {
  callId: string;
}
