import type { Document } from '@recall/shared';
import type { ChromaClient, QueryResult } from 'chromadb';
import type { Retriever } from './Retriever';

/**
 * Type definition for clients/mocks that support direct querying without
 * requiring a separate collection lookup.
 */
type DirectQueryClient = {
  query: (params: { queryTexts: string[]; nResults: number }) => Promise<QueryResult>;
};

/**
 * ChromaDB implementation of the Retriever interface.
 * Connects to a Chroma collection to perform vector similarity search.
 */
export class ChromaRetriever implements Retriever {
  private readonly client: ChromaClient;
  private readonly collectionName: string;

  /**
   * @param client ChromaDB client instance
   * @param collectionName Name of the collection to search (defaults to 'documents')
   */
  constructor(client: ChromaClient, collectionName = 'documents') {
    this.client = client;
    this.collectionName = collectionName;
  }

  /**
   * Searches the Chroma collection for documents matching the query.
   * @param query Search query text
   * @param limit Maximum number of documents to return (defaults to 5)
   * @return Array of matched document objects
   */
  async search(query: string, limit = 5): Promise<Document[]> {
    // If the client provides a direct query method (e.g. in test mocks or custom wrappers),
    // use it directly. Otherwise, fall back to standard collection retrieval.
    if (typeof (this.client as unknown as DirectQueryClient).query === 'function') {
      const results = await (this.client as unknown as DirectQueryClient).query({
        queryTexts: [query],
        nResults: limit,
      });
      return this.formatResults(results);
    }

    const collection = await this.client.getOrCreateCollection({ name: this.collectionName });
    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
    });

    return this.formatResults(results);
  }

  /**
   * Formats raw Chroma QueryResult batches into an array of Document objects.
   * @param results Raw query result batch from Chroma
   * @return Array of formatted Document objects
   */
  private formatResults(results: QueryResult): Document[] {
    const formatted: Document[] = [];
    const docBatches = results.documents ?? [];
    if (docBatches.length === 0) {
      return formatted;
    }

    const docs = docBatches[0] ?? [];
    const ids = results.ids?.[0] ?? [];
    const metadatas = results.metadatas?.[0] ?? [];

    for (let i = 0; i < docs.length; i++) {
      const content = docs[i];
      if (content !== null && content !== undefined) {
        formatted.push({
          id: ids[i],
          content,
          metadata: (metadatas[i] as Record<string, unknown>) ?? undefined,
        });
      }
    }

    return formatted;
  }
}
