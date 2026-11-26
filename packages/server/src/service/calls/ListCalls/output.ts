import type { Call } from 'src/entities';

export interface ListCallsOutputBoundary {
  present(output: ListCallsOutputData): void;
}

export interface ListCallsOutputData {
  calls: Call[];
}
