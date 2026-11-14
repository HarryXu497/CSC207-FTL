import type { Document } from 'src/entities';

/**
 * Interface for knowledge base document retrieval.
 */
export interface Retriever {
  /**
   * Searches for documents matching the given query.
   * @param query Search query text
   * @param limit Maximum number of documents to return
   * @return Array of relevant document objects
   */
  search(query: string, limit?: number): Promise<Document[]>;
}
