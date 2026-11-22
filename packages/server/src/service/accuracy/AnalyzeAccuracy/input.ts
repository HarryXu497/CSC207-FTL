import type { TranscriptMessage } from 'src/entities';
import type { AnalyzeAccuracyOutputBoundary } from './output';

export interface AnalyzeAccuracyInputBoundary {
  handle(input: AnalyzeAccuracyInputData, presenter: AnalyzeAccuracyOutputBoundary): Promise<void>;
}

export interface AnalyzeAccuracyInputData {
  messages: TranscriptMessage[];
  topic?: string;
}
