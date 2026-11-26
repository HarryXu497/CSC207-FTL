import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { Document } from 'langchain';
import { mkdtemp, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildChunkIds, ChromaIngestor } from './ChromaIngestor';

const { addDocuments } = vi.hoisted(() => ({ addDocuments: vi.fn() }));

vi.mock('@langchain/community/vectorstores/chroma', () => ({
  Chroma: class {
    addDocuments = addDocuments;
  },
}));

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

describe('ChromaIngestor', () => {
  let directory: string;
  let ingestor: ChromaIngestor;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'recall-ingestor-'));
    addDocuments.mockReset().mockResolvedValue([]);
    const embeddings: EmbeddingsInterface = {
      embedDocuments: vi.fn(async () => []),
      embedQuery: vi.fn(async () => []),
    };
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 0 });
    ingestor = new ChromaIngestor(embeddings, splitter, 'http://localhost:8000', 'documents');
  });

  afterEach(async () => {
    const files = await readdir(directory);
    await Promise.all(files.map((file) => unlink(join(directory, file))));
    await rmdir(directory);
  });

  it('ingests only the requested file', async () => {
    const filePath = join(directory, 'policy.txt');
    await writeFile(filePath, 'Refunds are allowed.');
    await writeFile(join(directory, 'other.txt'), 'This document was not uploaded.');

    expect(await ingestor.ingestFile(filePath)).toBe(1);
    expect(addDocuments).toHaveBeenCalledExactlyOnceWith(
      [
        expect.objectContaining({
          pageContent: 'Refunds are allowed.',
          metadata: expect.objectContaining({ source: filePath }),
        }),
      ],
      { ids: [`${filePath}::0`] },
    );
  });

  it('continues to ingest all supported files in a directory', async () => {
    await writeFile(join(directory, 'policy.txt'), 'Refunds are allowed.');
    await writeFile(join(directory, 'handbook.md'), 'Ask for the order number.');

    expect(await ingestor.ingest(directory)).toBe(2);
    expect(addDocuments).toHaveBeenCalledOnce();
    expect(addDocuments.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('does not write to Chroma when the file has no chunks', async () => {
    const filePath = join(directory, 'empty.txt');
    await writeFile(filePath, '');

    expect(await ingestor.ingestFile(filePath)).toBe(0);
    expect(addDocuments).not.toHaveBeenCalled();
  });
});
