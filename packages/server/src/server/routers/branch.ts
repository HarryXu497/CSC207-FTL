import { Router, type Response } from 'express';
import type { WithError } from 'src/entities';
import { NotFoundError } from 'src/errors';
import type { BranchRepository } from 'src/repository';
import { BranchesService } from 'src/service';
import type { CreateBranchResponse } from 'src/service/branches/PostBranches';
import { BranchController } from 'src/service/branches/controller';
import { z } from 'zod';
import { buildErrorFromSafeParseError } from '../utils';

const createBranchSchema = z.object({
  branchIndex: z.number().int().min(0, 'Branch index must be non-negative'),
});

export function createBranchesRouter(branchRepo: BranchRepository): Router {
  const controller = new BranchController(branchRepo);
  const router = controller.router();
  const getBranches = new BranchesService.GetBranches(branchRepo);
  const postBranches = new BranchesService.PostBranches(branchRepo);

  // Get all branches for a call
  router.get(
    '/calls/:callId/branches',
    async (req, res: Response<WithError<GetBranchesResponse>>) => {
      const branches = await getBranches.handle(req.params.callId);
      res.json({ branches });
    },
  );

  // Create a branch from a call and return it
  router.post(
    '/calls/:callId/branches',
    async (req, res: Response<WithError<CreateBranchResponse>>) => {
      const parsed = createBranchSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: buildErrorFromSafeParseError(parsed, 'That request was not valid.'),
        });
        return;
      }

      try {
        const branchId = await postBranches.handle(req.params.callId, parsed.data.branchIndex);
        const branch = await getBranch.handle(branchId);
        res.status(201).json({ branch });
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
