import type { AccuracyTarget } from '../target';
import type { AnalyzeAccuracyOutputBoundary } from '../AnalyzeAccuracy';

export interface AnalyzeStoredAccuracyInputBoundary {
  handle(
    input: AnalyzeStoredAccuracyInputData,
    presenter: AnalyzeAccuracyOutputBoundary,
  ): Promise<void>;
}

export interface AnalyzeStoredAccuracyInputData {
  /** The id of the call or branch whose stored transcript is analyzed. */
  id: string;
  target: AccuracyTarget;
}
