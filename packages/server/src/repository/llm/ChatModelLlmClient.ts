import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import type { LlmClient, LlmRequest } from './LlmClient';

/**
 * The slice of a LangChain chat model we rely on. Any `BaseChatModel` (ChatOpenAI, ...) satisfies
 * it, and tests can pass a plain object.
 */
export interface ChatModel {
  invoke(messages: BaseMessage[]): Promise<{ content: unknown }>;
}

/**
 * LlmClient backed by a LangChain chat model.
 * Build the model with temperature 0 so judgments are as repeatable as the provider allows.
 */
export class ChatModelLlmClient implements LlmClient {
  constructor(private readonly model: ChatModel) {}

  async complete(request: LlmRequest): Promise<string> {
    const reply = await this.model.invoke([
      new SystemMessage(request.system),
      new HumanMessage(request.user),
    ]);
    return contentToText(reply.content);
  }
}

/** Chat models return a string or a list of content blocks; keep only the text. */
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
