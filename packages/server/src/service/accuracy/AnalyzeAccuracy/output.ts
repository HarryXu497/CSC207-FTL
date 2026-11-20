import type { Accuracy } from 'src/entities';

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface AnalyzeAccuracyOutputBoundary {
  present(output: AnalyzeAccuracyOutputData): void;
  presentBadRequest(message: string, details?: ValidationIssue[]): void;
  presentNotFound(message: string): void;
  presentServiceUnavailable(): void;
  presentModelFailure(): void;
}

export interface AnalyzeAccuracyOutputData {
  accuracy: Accuracy;
}
