import type { Document } from '@recall/shared';

/**
 * Represents a generation result with backing sources.
 */
export interface GenerationResult {
  /** Query answer */
  answer: string;
  /** Chunks that the answer was sourced from */
  sources: Document[];
}

/**
 * Interface for answering questions using retrieved context from RAG.
 */
export interface Generator {
  /**
   * Answers a query using documents from the RAG knowledge base.
   * @param query - User query
   * @param limit - Max documents to retrieve for context
   */
  generate(query: string, limit?: number): Promise<GenerationResult>;
}
