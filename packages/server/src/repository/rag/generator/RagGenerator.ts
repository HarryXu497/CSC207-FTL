import type { ChatModel } from '../llm';
import type { Document, Retriever } from '../retriever';
import type { GenerationResult, Generator } from './Generator';

type PromptBuilder = (query: string, sources: Document[]) => string;

export class RagGenerator implements Generator {
  constructor(
    private readonly retriever: Retriever,
    private readonly llm: ChatModel,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async generate(query: string, limit?: number): Promise<GenerationResult> {
    const sources = await this.retriever.search(query, limit);
    const prompt = this.promptBuilder(query, sources);
    const answer = await this.llm.invoke(prompt);

    return {
      answer,
      sources,
    };
  }
}
