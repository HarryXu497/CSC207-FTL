import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { ChromaClient, QueryResult } from 'chromadb';
import type { Retriever } from './Retriever';
import type { Document } from 'src/entities';

/**
 * ChromaDB implementation of the Retriever interface.
 * Connects to a Chroma collection to perform vector similarity search.
 */
export class ChromaRetriever implements Retriever {
  /**
   * @param client ChromaDB client instance
   * @param embeddings Must use the same model as document ingestion
   * @param collectionName Name of the collection to search (defaults to 'documents')
   */
  constructor(
    private readonly client: ChromaClient,
    private readonly embeddings: Pick<EmbeddingsInterface, 'embedQuery'>,
    private readonly collectionName = 'documents',
  ) {}

  /**
   * Searches the Chroma collection for documents matching the query.
   * @param query Search query text
   * @param limit Maximum number of documents to return (defaults to 5)
   * @return Array of matched document objects
   */
  async search(query: string, limit = 5): Promise<Document[]> {
    const collection = await this.client.getCollection({ name: this.collectionName });
    const embedding = await this.embeddings.embedQuery(query);
    const results = await collection.query({
      queryEmbeddings: [embedding],
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
