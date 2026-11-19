import type { Accuracy } from 'src/entities';

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface AnalyzeAccuracyOutputBoundary {
  present(output: AnalyzeAccuracyOutputData): void;
  presentBadRequest(message: string, details?: ValidationIssue[]): void;
  presentServiceUnavailable(): void;
  /** The model kept returning replies that could not be parsed. */
  presentModelFailure(): void;
}

export interface AnalyzeAccuracyOutputData {
  accuracy: Accuracy;
}
