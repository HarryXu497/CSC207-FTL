import { NotFoundError } from 'src/errors';
import type { BranchRepository, CallRepository, MessageRepositoryBuilder } from 'src/repository';
import type { ListMessagesInputBoundary, ListMessagesInputData } from './input';
import type { ListMessagesOutputBoundary } from './output';

export class ListMessagesInteractor implements ListMessagesInputBoundary {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) {}

  async handle(
    { callId, branchId }: ListMessagesInputData,
    presenter: ListMessagesOutputBoundary,
  ): Promise<void> {
    try {
      await this.callsRepo.getCall(callId);

      if (branchId !== undefined) {
        const branch = await this.branchRepo.getBranch(branchId);
        if (branch.parentId !== callId) {
          presenter.presentNotFound(`Branch ${branchId} does not belong to call ${callId}.`);
          return;
        }
      }

      const messageRepo =
        branchId === undefined
          ? this.messageRepoFactory('calls', callId)
          : this.messageRepoFactory('branches', branchId);
      const messages = await messageRepo.getAllMessages();

      presenter.present({ messages });
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(e.message);
        return;
      }

      throw e;
    }
  }
}
