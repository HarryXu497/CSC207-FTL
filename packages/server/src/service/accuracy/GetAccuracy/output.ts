import type { Accuracy } from 'src/entities';

export interface GetAccuracyOutputBoundary {
  present(output: GetAccuracyOutputData): void;
  presentNotFound(message: string): void;
  presentServiceUnavailable(): void;
}

export interface GetAccuracyOutputData {
  accuracy: Accuracy;
}
