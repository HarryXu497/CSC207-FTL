import { Router, type Request } from 'express';
import type { BranchRepository, CallRepository } from 'src/repository';
import z from 'zod';
import {
  CreateBranchInteractor,
  CreateBranchPresenter,
  type CreateBranchOutputBoundary,
} from './CreateBranch';
import { GetBranchInteractor, GetBranchPresenter, type GetBranchOutputBoundary } from './GetBranch';
import {
  ListCallBranchesInteractor,
  ListCallBranchesPresenter,
  type ListCallBranchesOutputBoundary,
} from './ListCallBranches';
import {
  DeleteBranchInteractor,
  DeleteBranchPresenter,
  type DeleteBranchOutputBoundary,
} from './DeleteBranch';

const createBranchSchema = z.object({
  branchIndex: z.number().int().min(0, 'Branch index must be non-negative'),
});

export class BranchController {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
  ) {}

  async createBranch(req: Request, presenter: CreateBranchOutputBoundary) {
    const parsed = createBranchSchema.safeParse(req.body);

    if (!parsed.success) {
      presenter.presentBadRequest('That request was not valid.');
      return;
    }

    const callId = req.params.callId;

    if (typeof callId !== 'string' || !callId.trim()) {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const interactor = new CreateBranchInteractor(this.callRepo, this.branchRepo);

    await interactor.handle({ callId, branchIndex: parsed.data.branchIndex }, presenter);
  }

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

    router.post('/calls/:callId/branches', async (req, res) =>
      this.createBranch(req, new CreateBranchPresenter(res)),
    );

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
