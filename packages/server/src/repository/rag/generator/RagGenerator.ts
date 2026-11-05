import type { ChatModel } from '../llm';
import type { Document, Retriever } from '../retriever';
import type { GenerationResult, Generator } from './Generator';

/**
 * Helper type that represents a function that builds the LLM prompt.
 */
export type PromptBuilder = (query: string, sources: Document[]) => string;

/**
 * Implementation of Generator that uses a RAG system to augment LLM queries with
 * additional context.
 */
export class RagGenerator implements Generator {
  constructor(
    /** Retriever used to retrieve relevent documents from the RAG system */
    private readonly retriever: Retriever,
    /** Chat model used to answer queries */
    private readonly llm: ChatModel,
    /** Function used to build the LLM prompt */
    private readonly promptBuilder: PromptBuilder,
  ) {}

  /**
   * Answers a query using documents from the knowledge base.
   * @param query - User query
   * @param limit - Max documents to retrieve for context (defaults to 5)
   */
  async generate(query: string, limit: number = 5): Promise<GenerationResult> {
    const sources = await this.retriever.search(query, limit);
    const prompt = this.promptBuilder(query, sources);
    const answer = await this.llm.invoke(prompt);

    return {
      answer,
      sources,
    };
  }
}
