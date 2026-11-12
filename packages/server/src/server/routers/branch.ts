import type {
  GetBranchResponse,
  GetBranchesResponse,
  ServerResponse,
} from '@recall/shared';
import { Router, type Response } from 'express';
import { NotFoundError } from 'src/errors';
import type { BranchRepository } from 'src/repository';
import { BranchesService } from 'src/service';

export function createBranchesRouter(branchRepo: BranchRepository): Router {
  const router = Router();
  const getBranches = new BranchesService.GetBranches(branchRepo);
  const getBranch = new BranchesService.GetBranch(branchRepo);

  // Get all branches for a call
  router.get(
    '/calls/:callId/branches',
    async (req, res: Response<ServerResponse<GetBranchesResponse>>) => {
      const branches = await getBranches.handle(req.params.callId);
      res.json({ branches });
    },
  );

  // Get a single branch
  router.get(
    '/calls/:callId/branches/:branchId',
    async (req, res: Response<ServerResponse<GetBranchResponse>>) => {
      try {
        const branch = await getBranch.handle(req.params.branchId);
        res.json({ branch });
      } catch (e) {
        if (e instanceof NotFoundError) {
          res.status(404).json({ error: { message: e.message } });
        } else {
          throw e;
        }
      }
    },
  );

  return router;
}
