import type { Document } from '@recall/shared';
import type { ChromaClient, QueryResult } from 'chromadb';
import type { Retriever } from './Retriever';

export class ChromaRetriever implements Retriever {
  private readonly client: ChromaClient;
  private readonly collectionName: string;

  constructor(client: ChromaClient, collectionName = 'documents') {
    this.client = client;
    this.collectionName = collectionName;
  }

  async search(query: string, limit = 5): Promise<Document[]> {
    type DirectQueryClient = {
      query: (params: { queryTexts: string[]; nResults: number }) => Promise<QueryResult>;
    };

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
