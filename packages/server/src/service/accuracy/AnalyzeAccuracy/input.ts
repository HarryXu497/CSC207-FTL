import type { TranscriptMessage } from 'src/entities';
import type { AnalyzeAccuracyOutputBoundary } from './output';

export interface AnalyzeAccuracyInputBoundary {
  handle(input: AnalyzeAccuracyInputData, presenter: AnalyzeAccuracyOutputBoundary): Promise<void>;
}

export interface AnalyzeAccuracyInputData {
  /** When set, the result is saved under this call. Without it the analysis is not stored. */
  callId?: string;
  messages: TranscriptMessage[];
  topic?: string;
}
