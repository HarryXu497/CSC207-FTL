import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChromaIngestor, type Ingestor } from '../repository/rag/ingestor';

export function buildRagIngestor(env: NodeJS.ProcessEnv = process.env): Ingestor | null {
  if (env.RAG_ENABLED !== 'true') {
    return null;
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when RAG_ENABLED=true.');
  }

  const embeddings = new OpenAIEmbeddings({
    apiKey,
    model: env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',
  });
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

  return new ChromaIngestor(
    embeddings,
    splitter,
    env.CHROMA_URL || 'http://localhost:8000',
    env.CHROMA_COLLECTION || 'documents',
  );
}
