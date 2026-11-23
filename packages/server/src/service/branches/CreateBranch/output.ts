import type { Branch } from 'src/entities';

export interface CreateBranchOutputBoundary {
  present(output: CreateBranchOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
}

export interface CreateBranchOutputData {
  branch: Branch;
}
