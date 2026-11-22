import type { AccuracyTarget } from '../target';
import type { GetAccuracyOutputBoundary } from './output';

export interface GetAccuracyInputBoundary {
  handle(input: GetAccuracyInputData, presenter: GetAccuracyOutputBoundary): Promise<void>;
}

export interface GetAccuracyInputData {
  /** The id of the call or branch whose saved result is read. */
  id: string;
  target: AccuracyTarget;
}
