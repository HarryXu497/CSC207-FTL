import { describe, expect, it } from 'vitest';
import { buildChunkIds } from './ChromaIngestor';
import type { Document } from 'langchain';

describe('buildChunkIds', () => {
  it('numbers chunks independently per source', () => {
    const chunks = [
      { metadata: { source: 'a.txt' } },
      { metadata: { source: 'a.txt' } },
      { metadata: { source: 'b.txt' } },
    ] as unknown as Document[];
    expect(buildChunkIds(chunks)).toEqual(['a.txt::0', 'a.txt::1', 'b.txt::0']);
  });

  it('is stable regardless of other files growing', () => {
    const grown = [
      { metadata: { source: 'a.txt' } },
      { metadata: { source: 'a.txt' } },
      { metadata: { source: 'a.txt' } },
      { metadata: { source: 'b.txt' } },
    ] as unknown as Document[];
    expect(buildChunkIds(grown)).toContain('b.txt::0');
  });
});
