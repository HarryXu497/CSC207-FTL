import type { Accuracy } from 'src/entities';

export interface AnalyzeAccuracyOutputBoundary {
  present(output: AnalyzeAccuracyOutputData): void;
  presentBadRequest(message: string, details?: unknown): void;
  /** The language model kept returning something unusable: an upstream failure. */
  presentBadGateway(message: string): void;
  presentServiceUnavailable(): void;
}

export interface AnalyzeAccuracyOutputData {
  accuracy: Accuracy;
}
