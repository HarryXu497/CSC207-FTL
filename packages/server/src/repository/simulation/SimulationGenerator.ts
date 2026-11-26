import type { Call, Message } from 'src/entities';

export interface SimulationGenerationInput {
  scenario: Pick<Call, 'customerName' | 'topic'>;
  history: readonly Pick<Message, 'role' | 'content'>[];
}

export interface SimulationGenerator {
  /** Generates the next customer reply without saving it. */
  generate(input: SimulationGenerationInput): Promise<string>;
}
