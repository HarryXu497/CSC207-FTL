import type { Accuracy } from 'src/entities';

export interface AnalyzeAccuracyOutputBoundary {
  present(output: AnalyzeAccuracyOutputData): void;
  /** The model kept returning replies that could not be parsed. */
  presentModelFailure(): void;
}

export interface AnalyzeAccuracyOutputData {
  accuracy: Accuracy;
}
