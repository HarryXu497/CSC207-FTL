import { LlmOutputError } from 'src/errors';
import type { LlmClient } from '../llm';
import type { Retriever } from '../rag/retriever';
import { buildSimulationRetrievalQuery } from './context';
import { buildSimulationPrompt } from './prompts';
import type { SimulationGenerationInput, SimulationGenerator } from './SimulationGenerator';

/** Generates customer replies using conversation history and retrieved company documents. */
export class RagSimulationGenerator implements SimulationGenerator {
  constructor(
    private readonly retriever: Retriever,
    private readonly llm: LlmClient,
  ) {}

  async generate({ scenario, history }: SimulationGenerationInput): Promise<string> {
    const query = buildSimulationRetrievalQuery(scenario.topic, history);
    const documents = await this.retriever.search(query, 5);
    const prompt = buildSimulationPrompt({ scenario, history, documents });
    const reply = (await this.llm.complete(prompt)).trim();

    if (!reply) {
      throw new LlmOutputError('The model returned an empty customer reply.');
    }

    return reply;
  }
}
