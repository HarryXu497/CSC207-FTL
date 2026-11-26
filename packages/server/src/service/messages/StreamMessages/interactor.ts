import { NotFoundError } from 'src/errors';
import type { BranchRepository, CallRepository, MessageRepositoryBuilder } from 'src/repository';
import type { StreamMessagesInputBoundary, StreamMessagesInputData } from './input';
import type { StreamMessagesOutputBoundary } from './output';

export class StreamMessagesInteractor implements StreamMessagesInputBoundary {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) {}

  async handle(
    { callId, branchId }: StreamMessagesInputData,
    presenter: StreamMessagesOutputBoundary,
  ): Promise<(() => void) | null> {
    try {
      await this.callRepo.getCall(callId);
      if (branchId !== undefined) {
        const branch = await this.branchRepo.getBranch(branchId);
        if (branch.parentId !== callId) {
          presenter.presentNotFound(`Branch ${branchId} does not belong to call ${callId}.`);
          return null;
        }
      }

      const messages =
        branchId === undefined
          ? this.messageRepoFactory('calls', callId)
          : this.messageRepoFactory('branches', branchId);
      presenter.start();
      return messages.subscribe((snapshot) => presenter.present({ messages: snapshot }));
    } catch (error) {
      if (error instanceof NotFoundError) {
        presenter.presentNotFound(error.message);
        return null;
      }
      throw error;
    }
  }
}
