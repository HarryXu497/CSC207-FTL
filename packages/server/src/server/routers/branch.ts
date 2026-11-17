import { Router, type Response } from 'express';
import { NotFoundError } from 'src/errors';
import type { BranchRepository } from 'src/repository';
import { BranchesService } from 'src/service';
import { z } from 'zod';
import { buildErrorFromSafeParseError } from '../utils';
import type { WithError } from 'src/entities';
import type { GetBranchesResponse, GetBranchResponse } from 'src/service/branches/GetBranch';
import type { CreateBranchResponse } from 'src/service/branches/PostBranches';

const createBranchSchema = z.object({
  branchIndex: z.number().int().min(0, 'Branch index must be non-negative'),
});

export function createBranchesRouter(branchRepo: BranchRepository): Router {
  const router = Router();
  const getBranches = new BranchesService.GetBranches(branchRepo);
  const getBranch = new BranchesService.GetBranch(branchRepo);
  const postBranches = new BranchesService.PostBranches(branchRepo);
  const deleteBranch = new BranchesService.DeleteBranch(branchRepo);

  // Get all branches for a call
  router.get(
    '/calls/:callId/branches',
    async (req, res: Response<WithError<GetBranchesResponse>>) => {
      const branches = await getBranches.handle(req.params.callId);
      res.json({ branches });
    },
  );

  // Get a single branch
  router.get(
    '/calls/:callId/branches/:branchId',
    async (req, res: Response<WithError<GetBranchResponse>>) => {
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

  // Delete a branch
  router.delete(
    '/calls/:callId/branches/:branchId',
    async (req, res: Response<WithError<never>>) => {
      const branchId = req.params.branchId;
      try {
        await deleteBranch.handle(branchId);
        res.status(204).send();
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
