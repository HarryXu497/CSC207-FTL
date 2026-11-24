import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChromaClient } from 'chromadb';
import type { CallRepository, MessageRepositoryBuilder } from '../repository/database';
import { ChatModelLlmClient } from '../repository/llm';
import { ChromaRetriever } from '../repository/rag/retriever';
import {
  RagSimulationGenerator,
  StoredSimulationRepository,
  type SimulationRepository,
} from '../repository/simulation';

export function buildSimulationRepository(
  callRepo: CallRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  env: NodeJS.ProcessEnv = process.env,
): SimulationRepository | null {
  if (env.SIMULATION_ENABLED !== 'true') return null;

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is required when SIMULATION_ENABLED=true.');
  const model = env.SIMULATION_MODEL?.trim();
  if (!model) throw new Error('SIMULATION_MODEL is required when SIMULATION_ENABLED=true.');

  const url = new URL(env.CHROMA_URL?.trim() || 'http://localhost:8000');
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

  const client = new ChromaClient({
    host: url.hostname,
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    ssl: url.protocol === 'https:',
  });
  const embeddings = new OpenAIEmbeddings({
    apiKey,
    model: env.RAG_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small',
    timeout: 30_000,
    maxRetries: 1,
  });
  const retriever = new ChromaRetriever(
    client,
    embeddings,
    env.CHROMA_COLLECTION?.trim() || 'documents',
  );
  const llm = new ChatModelLlmClient(
    new ChatOpenAI({ apiKey, model, timeout: 30_000, maxRetries: 1 }),
  );

  return new StoredSimulationRepository(
    callRepo,
    messageRepoFactory,
    new RagSimulationGenerator(retriever, llm),
  );
}
