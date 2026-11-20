import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LlmClient, LlmRequest } from './LlmClient';

export class ChatModelLlmClient implements LlmClient {
  constructor(private readonly model: BaseChatModel) {}

  async complete(request: LlmRequest): Promise<string> {
    const reply = await this.model.invoke([
      new SystemMessage(request.system),
      new HumanMessage(request.user),
    ]);
    return contentToText(reply.content);
  }
}

/** Chat models reply with a string or a list of content blocks; keeps only the text. */
function contentToText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object' && 'text' in block) return String(block.text);
        return '';
      })
      .join('');
  }
  return '';
}
