import type { AccuracyFindings, TranscriptMessage } from 'src/entities';

export interface AccuracyAnalyzer {
  /** @throws LlmOutputError when the model keeps returning unusable replies */
  analyze(messages: TranscriptMessage[], topic?: string): Promise<AccuracyFindings>;
}
