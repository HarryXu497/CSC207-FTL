import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChromaIngestor, type Ingestor } from '../repository/rag/ingestor';
import { ChromaClient } from 'chromadb';
import { ChromaRetriever } from '../repository/rag/retriever';

export function buildRagDependencies(apiKey: string, env: NodeJS.ProcessEnv = process.env) {
  const host = env.CHROMA_HOST?.trim() || 'localhost';
  const port = env.CHROMA_PORT?.trim() || '8000';
  const url = new URL(env.CHROMA_URL?.trim() || `http://${host}:${port}`);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error('CHROMA_URL must be an HTTP(S) origin without a path or credentials.');
  }

  return {
    url,
    collectionName: env.CHROMA_COLLECTION?.trim() || 'documents',
    embeddings: new OpenAIEmbeddings({
      apiKey,
      model: env.RAG_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small',
      timeout: 30_000,
      maxRetries: 1,
    }),
  };
}

export function buildRagRetriever(apiKey: string, env: NodeJS.ProcessEnv = process.env) {
  const { url, collectionName, embeddings } = buildRagDependencies(apiKey, env);
  const client = new ChromaClient({
    host: url.hostname,
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    ssl: url.protocol === 'https:',
  });
  return new ChromaRetriever(client, embeddings, collectionName);
}

export function buildRagIngestor(env: NodeJS.ProcessEnv = process.env): Ingestor | null {
  if (env.RAG_ENABLED !== 'true') return null;

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when RAG_ENABLED=true.');
  }

  return createRagIngestor(apiKey, env);
}

export function createRagIngestor(apiKey: string, env: NodeJS.ProcessEnv = process.env): Ingestor {
  const { url, collectionName, embeddings } = buildRagDependencies(apiKey, env);
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  return new ChromaIngestor(embeddings, splitter, url.origin, collectionName);
}
