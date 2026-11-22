import type { Accuracy } from 'src/entities';

/**
 * Stores accuracy results by id. A branch is a call (`Branch extends Call`) with its own id, so a
 * branch's result is stored under its branch id in the same way.
 */
export interface AccuracyRepository {
  /**
   * @param callId - The id of the call (or branch) to get accuracy for
   * @returns the Accuracy object for the given call, or null if it hasn't been analyzed
   */
  getAccuracyForCall(callId: string): Promise<Accuracy | null>;

  /**
   * Inserts an Accuracy object, overwriting if an accuracy with the same callId already exists.
   * @param accuracy - The accuracy to insert or overwrite
   */
  setAccuracy(callId: string, accuracy: Accuracy): Promise<void>;

  /**
   * Deletes an accuracy by its callId
   * @param callId - The id of the call to delete accuracy for
   */
  deleteAccuracyForCall(callId: string): Promise<void>;
}
