import { ChatOpenAI } from '@langchain/openai';
import type { CallRepository, MessageRepositoryBuilder } from '../repository/database';
import { ChatModelLlmClient } from '../repository/llm';
import {
  RagSimulationGenerator,
  StoredSimulationRepository,
  type SimulationRepository,
} from '../repository/simulation';
import { buildRagRetriever } from './rag';

export function buildSimulationRepository(
  callRepo: CallRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  env: NodeJS.ProcessEnv = process.env,
): SimulationRepository | null {
  const enabled = env.SIMULATION_ENABLED?.trim();
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (enabled && enabled !== 'true') return null;
  if (!apiKey) {
    if (enabled === 'true') {
      throw new Error('OPENAI_API_KEY is required when SIMULATION_ENABLED=true.');
    }
    return null;
  }

  const model = env.SIMULATION_MODEL?.trim() || 'gpt-4o-mini';

  const llm = new ChatModelLlmClient(
    new ChatOpenAI({ apiKey, model, timeout: 30_000, maxRetries: 1 }),
  );

  return new StoredSimulationRepository(
    callRepo,
    messageRepoFactory,
    new RagSimulationGenerator(buildRagRetriever(apiKey, env), llm),
  );
}
