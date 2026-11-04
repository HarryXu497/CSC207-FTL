import type { Document } from '@recall/shared';
import type { Retriever } from './Retriever';

export class InMemoryRetriever implements Retriever {
  private readonly mockData: Document[];

  constructor(mockData: Document[] = []) {
    this.mockData = [...mockData];
  }

  async search(query: string, limit = 5): Promise<Document[]> {
    return this.mockData.filter((doc) => doc.content.includes(query)).slice(0, limit);
  }

  addDocuments(...docs: Document[]): void {
    this.mockData.push(...docs);
  }
}
