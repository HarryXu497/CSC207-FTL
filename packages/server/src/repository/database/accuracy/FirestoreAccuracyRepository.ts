import type { Accuracy } from 'src/entities';
import type { AccuracyRepository } from './AccuracyRepository';
import { Firebase } from '../utils';

export class FirestoreAccuracyRepository implements AccuracyRepository {
  static readonly COLLECTION = 'accuracy';

  /**
   * Gets the accuracy for a specific call.
   * @param callId - The id of the call to get accuracy for
   * @returns the Accuracy object for the given call, or null if it doesn't exist
   */
  async getAccuracyForCall(callId: string): Promise<Accuracy | null> {
    const db = Firebase.getInstance();
    const docRef = db.collection(FirestoreAccuracyRepository.COLLECTION).doc(callId);

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as Accuracy;
  }

  /**
   * Sets the accuracy for a specific call.
   * @param callId - The id of the call to set accuracy for
   * @param accuracy - The accuracy object to set
   */
  async setAccuracy(callId: string, accuracy: Accuracy): Promise<void> {
    const db = Firebase.getInstance();
    const docRef = db.collection(FirestoreAccuracyRepository.COLLECTION).doc(callId);

    await docRef.set(accuracy);
  }

  /**
   * Deletes the accuracy for a specific call.
   * @param callId - The id of the call to delete accuracy for
   */
  async deleteAccuracyForCall(callId: string): Promise<void> {
    const db = Firebase.getInstance();
    const docRef = db.collection(FirestoreAccuracyRepository.COLLECTION).doc(callId);

    await docRef.delete();
  }
}
