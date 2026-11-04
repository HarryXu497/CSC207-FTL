import type { Document } from '@recall/shared';
import type { Retriever } from './Retriever';

/**
 * In-memory implementation of the Retriever interface.
 * Useful for unit testing and offline development without running ChromaDB.
 */
export class InMemoryRetriever implements Retriever {
  private readonly mockData: Document[];

  /**
   * @param mockData Initial documents to seed the retriever with
   */
  constructor(mockData: Document[] = []) {
    this.mockData = [...mockData];
  }

  /**
   * Searches local mock data for documents containing the query text.
   * @param query Term to filter documents by
   * @param limit Maximum number of documents to return (defaults to 5)
   */
  async search(query: string, limit = 5): Promise<Document[]> {
    return this.mockData.filter((doc) => doc.content.includes(query)).slice(0, limit);
  }

  /**
   * Adds additional documents to the in-memory store.
   * @param docs Documents to append
   */
  addDocuments(...docs: Document[]): void {
    this.mockData.push(...docs);
  }
}
