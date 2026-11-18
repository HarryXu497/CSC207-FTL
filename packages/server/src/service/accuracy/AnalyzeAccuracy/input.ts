import type { TranscriptMessage } from 'src/entities';
import type { AnalyzeAccuracyOutputBoundary } from './output';

export interface AnalyzeAccuracyInputBoundary {
  handle(input: AnalyzeAccuracyInputData, presenter: AnalyzeAccuracyOutputBoundary): Promise<void>;
}

export interface AnalyzeAccuracyInputData {
  messages: TranscriptMessage[];
  /** Optional call topic; gives the analysis extra context. */
  topic?: string;
}
