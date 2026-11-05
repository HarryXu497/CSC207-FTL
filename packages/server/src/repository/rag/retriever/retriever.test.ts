import type { ChromaClient, QueryResult } from 'chromadb';
import { describe, expect, it, vi } from 'vitest';
import { ChromaRetriever } from './ChromaRetriever';
import { InMemoryRetriever } from './InMemoryRetriever';

describe('InMemoryRetriever', () => {
  it('returns documents containing the search query up to the limit', async () => {
    const retriever = new InMemoryRetriever([
      { id: '1', content: 'Customer requested refund for damaged shipment.' },
      { id: '2', content: 'User could not login after password reset.' },
      { id: '3', content: 'Delivery tracking showed refund approved.' },
    ]);

    const results = await retriever.search('refund', 1);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('1');

    const allMatches = await retriever.search('refund', 5);
    expect(allMatches).toHaveLength(2);
    expect(allMatches.map((d) => d.id)).toEqual(['1', '3']);
  });

  it('supports adding documents dynamically', async () => {
    const retriever = new InMemoryRetriever();
    retriever.addDocuments({ id: 'doc-1', content: 'Hello world' });

    const results = await retriever.search('world');
    expect(results).toHaveLength(1);
    expect(results[0]?.content).toBe('Hello world');
  });
});

describe('ChromaRetriever', () => {
  it('formats query results into Document array correctly', async () => {
    const mockQueryResult = {
      ids: [['id-1', 'id-2']],
      embeddings: [],
      documents: [['Doc 1 text', 'Doc 2 text']],
      metadatas: [[{ source: 'manual.pdf' }, { source: 'faq.md' }]],
      distances: [[0.1, 0.2]],
      uris: [],
      include: [],
    } as unknown as QueryResult;

    const mockCollection = {
      query: vi.fn().mockResolvedValue(mockQueryResult),
    };

    const mockClient = {
      getOrCreateCollection: vi.fn().mockResolvedValue(mockCollection),
    };

    const retriever = new ChromaRetriever(mockClient as unknown as ChromaClient, 'test-collection');
    const results = await retriever.search('refund', 2);

    expect(mockClient.getOrCreateCollection).toHaveBeenCalledWith({ name: 'test-collection' });
    expect(mockCollection.query).toHaveBeenCalledWith({
      queryTexts: ['refund'],
      nResults: 2,
    });
    expect(results).toEqual([
      { id: 'id-1', content: 'Doc 1 text', metadata: { source: 'manual.pdf' } },
      { id: 'id-2', content: 'Doc 2 text', metadata: { source: 'faq.md' } },
    ]);
  });
});
