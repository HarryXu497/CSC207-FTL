import type { CallRepository, MessageRepositoryBuilder } from 'src/repository';
import type { CreateCallInputBoundary, CreateCallInputData } from './input';
import type { CreateCallOutputBoundary } from './output';

export class CreateCallInteractor implements CreateCallInputBoundary {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) {}

  async handle(
    { callData, messageData }: CreateCallInputData,
    presenter: CreateCallOutputBoundary,
  ): Promise<void> {
    const callId = await this.callRepo.addCall(callData);
    const callMessageRepo = this.messageRepoFactory('calls', callId);

    await callMessageRepo.addMessages(messageData);

    presenter.present({ callId });
  }
}
