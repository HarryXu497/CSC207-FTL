import type { LlmClient, LlmRequest } from 'src/service/accuracy/LlmClient';
import type { ChatModel } from '../rag/llm/ChatModel';

/**
 * LlmClient backed by the existing RAG `ChatModel`, which takes a single prompt string. The system
 * instructions and task input go into that one prompt, in separate labelled sections.
 */
export class ChatModelLlmClient implements LlmClient {
  constructor(private readonly model: ChatModel) {}

  complete({ system, user }: LlmRequest): Promise<string> {
    return this.model.invoke(`${system}\n\n---\n\n${user}`);
  }
}
