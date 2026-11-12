import type { Branch } from '../repository/database/branches';

/** GET /api/calls/:callId/branches */
export interface GetBranchesResponse {
  branches: Branch[];
}

/** GET /api/calls/:callId/branches/:branchId */
export interface GetBranchResponse {
  branch: Branch;
}

/** POST /api/calls/:callId/branches */
export interface CreateBranchRequest {
  branchIndex: number;
}

export interface CreateBranchResponse {
  branch: Branch;
}
