import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { TextSplitter } from '@langchain/textsplitters';

import { Chroma } from '@langchain/community/vectorstores/chroma';
import type { Ingestor } from './Ingestor';
import type { Document } from 'langchain';

export function buildChunkIds(chunks: Document[]): string[] {
  const perSource = new Map<string, number>();
  return chunks.map((chunk) => {
    const source = String(chunk.metadata.source);
    const n = perSource.get(source) ?? 0;
    perSource.set(source, n + 1);
    return `${source}::${n}`;
  });
}

export class ChromaIngestor implements Ingestor {
  constructor(
    private readonly embeddings: EmbeddingsInterface,
    private readonly splitter: TextSplitter,
    private readonly chromaUrl: string,
    private readonly collectionName: string,
  ) {}

  async ingest(directory: string): Promise<number> {
    const loader = new DirectoryLoader(directory, {
      '.txt': (path) => new TextLoader(path),
      '.md': (path) => new TextLoader(path),
      '.pdf': (path) => new PDFLoader(path),
    });

    const docs = await loader.load();
    const chunks = await this.splitter.splitDocuments(docs);

    if (chunks.length === 0) {
      return 0;
    }

    const store = new Chroma(this.embeddings, {
      collectionName: this.collectionName,
      url: this.chromaUrl,
    });

    const ids = buildChunkIds(chunks);
    await store.addDocuments(chunks, { ids });

    return chunks.length;
  }
}
