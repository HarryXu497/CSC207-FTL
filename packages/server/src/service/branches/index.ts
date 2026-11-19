import { GetBranch } from './GetBranch';
import { GetBranches } from './GetBranches';
import { PostBranches } from './PostBranches';

export const BranchesService = {
  GetBranches,
  PostBranches,
  GetBranch,
} as const;
