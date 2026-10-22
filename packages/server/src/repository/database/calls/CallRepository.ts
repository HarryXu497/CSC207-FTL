/**
 * Interface for the data layer
 */
import type { Call } from '@recall/shared';

export interface CallRepository {
  /** Every call, newest first. */
  listCalls(): Promise<Call[]>;

  /** Insert or overwrite one call. */
  saveCall(call: Call): Promise<void>;
}
