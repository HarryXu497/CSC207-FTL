import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ChatModel } from './ChatModel';

/**
 * Thin wrapper on LangChain's BaseChatModel. Adapts functionality to fit the
 * ChatModel interface.
 */
export class LangChainChatModel implements ChatModel {
  constructor(
    /** LangChain base chat model */
    private readonly model: BaseChatModel,
  ) {}

  /**
   * Prompts the model with the given prompt.
   * @param prompt - The prompt for the model
   */
  async invoke(prompt: string): Promise<string> {
    const res = await this.model.invoke(prompt);

    if (typeof res.content === 'string') {
      return res.content;
    } else {
      return JSON.stringify(res.content);
    }
  }
}
