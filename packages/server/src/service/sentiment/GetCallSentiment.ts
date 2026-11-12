import type { MessageSentiment } from '@recall/shared';
import type { CallRepository } from 'src/repository/database/calls/CallRepository';
import type { MessageRepository } from 'src/repository/database/messages/MessageRepository';
import type { AnalyseMessages, MessageResult } from 'src/repository/sentiment/AnalyseMessages';

export class GetCallSentiment {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepoFactory: (callId: string) => MessageRepository,
    private readonly analyseMessages: AnalyseMessages,
  ) {}

  async handle(callId: string): Promise<MessageSentiment[]> {
    await this.callsRepo.getCall(callId);

    const messages = await this.messageRepoFactory(callId).getAllMessages();

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
