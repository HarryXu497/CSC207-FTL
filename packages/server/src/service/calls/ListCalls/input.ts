import type { ListCallsOutputBoundary } from './output';

export interface ListCallsInputBoundary {
  handle(presenter: ListCallsOutputBoundary): Promise<void>;
}
