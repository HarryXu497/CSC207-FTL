import type { Branch } from 'src/entities';

export interface ListCallBranchesOutputBoundary {
  present(output: ListCallBranchesOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
}

export interface ListCallBranchesOutputData {
  branches: Branch[];
}
