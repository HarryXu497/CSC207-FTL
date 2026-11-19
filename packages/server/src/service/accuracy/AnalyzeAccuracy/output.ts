import type { Accuracy } from 'src/entities';

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface AnalyzeAccuracyOutputBoundary {
  present(output: AnalyzeAccuracyOutputData): void;
  presentBadRequest(message: string, details?: ValidationIssue[]): void;
  presentServiceUnavailable(): void;
  presentModelFailure(): void;
}

export interface AnalyzeAccuracyOutputData {
  accuracy: Accuracy;
}
