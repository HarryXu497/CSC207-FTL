import { Router, type Request } from 'express';
import type { BranchRepository } from 'src/repository';
import {
  DeleteBranchInteractor,
  DeleteBranchPresenter,
  type DeleteBranchOutputBoundary,
} from './DeleteBranch';

export class BranchController {
  constructor(private readonly branchRepo: BranchRepository) {}

  async deleteBranch(req: Request, presenter: DeleteBranchOutputBoundary) {
    const branchId = req.params.branchId;

    if (!branchId || typeof branchId !== 'string') {
      presenter.presentBadRequest('branchId is required');
      return;
    }

    const interactor = new DeleteBranchInteractor(this.branchRepo);

    await interactor.handle({ branchId }, presenter);
  }

  router(): Router {
    const router = Router();

    router.delete('/calls/:callId/branches/:branchId', async (req, res) =>
      this.deleteBranch(req, new DeleteBranchPresenter(res)),
    );

    return router;
  }
}
