import type { Accuracy } from 'src/entities';

export interface AccuracyRepository {
  /**
   * @param callId - The id of the call to get accuracy for
   * @returns the Accuracy object for the given call
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
