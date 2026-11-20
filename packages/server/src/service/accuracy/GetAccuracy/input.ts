import type { GetAccuracyOutputBoundary } from './output';

export interface GetAccuracyInputBoundary {
  handle(input: GetAccuracyInputData, presenter: GetAccuracyOutputBoundary): Promise<void>;
}

export interface GetAccuracyInputData {
  callId: string;
}
