import { Router, type Request } from 'express';
import type { BranchRepository, CallRepository } from 'src/repository';
import {
  DeleteBranchInteractor,
  DeleteBranchPresenter,
  type DeleteBranchOutputBoundary,
} from './DeleteBranch';
import { GetBranchInteractor, GetBranchPresenter, type GetBranchOutputBoundary } from './GetBranch';
import {
  ListCallBranchesInteractor,
  ListCallBranchesPresenter,
  type ListCallBranchesOutputBoundary,
} from './ListCallBranches';

export class BranchController {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
  ) {}

  async getBranch(req: Request, presenter: GetBranchOutputBoundary) {
    const branchId = req.params.branchId;

    if (!branchId || typeof branchId !== 'string') {
      presenter.presentBadRequest('branchId is required');
      return;
    }

    const interactor = new GetBranchInteractor(this.branchRepo);

    await interactor.handle({ branchId }, presenter);
  }

  async listCallBranches(req: Request, presenter: ListCallBranchesOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const interactor = new ListCallBranchesInteractor(this.callRepo, this.branchRepo);

    await interactor.handle({ callId }, presenter);
  }

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

    router.get('/calls/:callId/branches/:branchId', async (req, res) =>
      this.getBranch(req, new GetBranchPresenter(res)),
    );

    router.get('/calls/:callId/branches', async (req, res) =>
      this.listCallBranches(req, new ListCallBranchesPresenter(res)),
    );

    router.delete('/calls/:callId/branches/:branchId', async (req, res) =>
      this.deleteBranch(req, new DeleteBranchPresenter(res)),
    );

    return router;
  }
}
