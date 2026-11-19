import type { Branch } from 'src/entities';

export interface GetBranchOutputBoundary {
  present(output: GetBranchOutputData): void;
  presentNotFound(message: string): void;
  presentBadRequest(message: string): void;
}

export interface GetBranchOutputData {
  branch: Branch;
}
