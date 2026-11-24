import { NotFoundError } from 'src/errors';
import type { BranchRepository, CallRepository, MessageRepositoryBuilder } from 'src/repository';
import type { PostMessageInputBoundary, PostMessageInputData } from './input';
import type { PostMessageOutputBoundary } from './output';

export class PostMessageInteractor implements PostMessageInputBoundary {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) {}

  async handle(
    { callId, branchId, messageData }: PostMessageInputData,
    presenter: PostMessageOutputBoundary,
  ): Promise<void> {
    try {
      await this.callRepo.getCall(callId);
      if (branchId !== undefined) {
        const branch = await this.branchRepo.getBranch(branchId);
        if (branch.parentId !== callId) {
          presenter.presentNotFound(`Branch ${branchId} does not belong to call ${callId}.`);
          return;
        }
      }

      const messages =
        branchId === undefined
          ? this.messageRepoFactory('calls', callId)
          : this.messageRepoFactory('branches', branchId);
      const latest = (await messages.getAllMessages()).at(-1);
      const message = {
        role: messageData.role,
        content: messageData.content,
        // Append after saved history even if its timestamps are ahead of the server clock.
        createdAt: new Date(
          Math.max(Date.now(), latest ? Date.parse(latest.createdAt) + 1 : 0),
        ).toISOString(),
      };
      const id = await messages.addMessage(message);
      presenter.present({ message: { id, ...message } });
    } catch (error) {
      if (error instanceof NotFoundError) {
        presenter.presentNotFound(error.message);
        return;
      }
      throw error;
    }
  }
}
