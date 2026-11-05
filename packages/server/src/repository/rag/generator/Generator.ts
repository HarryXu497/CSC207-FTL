import type { Document } from '@recall/shared';

export interface GenerationResult {
  answer: string;
  sources: Document[];
}

export interface Generator {
  generate(query: string, limit?: number): Promise<GenerationResult>;
}
