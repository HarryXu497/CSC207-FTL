import type { Document } from '@recall/shared';

export type { Document };

/**
 * Interface for knowledge base document retrieval.
 */
export interface Retriever {
  /**
   * Searches for documents matching the given query.
   * @param query Search query text
   * @param limit Maximum number of documents to return
   */
  search(query: string, limit?: number): Promise<Document[]>;
}
