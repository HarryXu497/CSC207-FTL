import type { GetCallOutputBoundary } from './output';

export interface GetCallInputBoundary {
  handle(input: GetCallInputData, presenter: GetCallOutputBoundary): Promise<void>;
}

export interface GetCallInputData {
  callId: string;
}
