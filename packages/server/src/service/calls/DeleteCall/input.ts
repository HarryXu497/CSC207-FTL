import type { DeleteCallOutputBoundary } from './output';

export interface DeleteCallInputBoundary {
  handle(input: DeleteCallInputData, presenter: DeleteCallOutputBoundary): Promise<void>;
}

export interface DeleteCallInputData {
  callId: string;
}
