import type { MessageSentiment } from '@recall/shared';
import type { CallRepository } from 'src/repository';
import {
  FirestoreCallRepository,
  type AnalyseMessages,
  type MessageRepositoryBuilder,
  type MessageResult,
} from 'src/repository';

export class GetCallSentiment {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly analyseMessages: AnalyseMessages,
  ) {}

  async handle(callId: string): Promise<MessageSentiment[]> {
    await this.callsRepo.getCall(callId);

    const messages = await this.messageRepoFactory(
      FirestoreCallRepository.COLLECTION,
      callId,
    ).getAllMessages();

    const results = await this.analyseMessages.handle({
      messages: messages.map((message) => message.content),
    });

    return messages
      .filter((_, i) => Boolean(results[i]))
      .map((message, i) => {
        const result = results[i] as MessageResult;

        return { messageId: message.id, result };
      });
  }
}
