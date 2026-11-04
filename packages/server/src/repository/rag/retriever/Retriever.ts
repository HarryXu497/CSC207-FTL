import type { Document } from '@recall/shared';

export type { Document };

export interface Retriever {
  search(query: string, limit?: number): Promise<Document[]>;
}
