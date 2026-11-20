import type { Accuracy } from 'src/entities';
import type { AccuracyRepository } from './AccuracyRepository';
import { Firebase } from '../utils';

export class FirestoreAccuracyRepository implements AccuracyRepository {
  static readonly COLLECTION = 'accuracy';

  /**
   *
   * @param callId - The id of the call to get accuracy for
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
   *
   * @param callId - The id of the call to set accuracy for
   * @param accuracy - The accuracy to insert or overwrite
   */
  async setAccuracy(callId: string, accuracy: Accuracy): Promise<void> {
    const db = Firebase.getInstance();
    const docRef = db.collection(FirestoreAccuracyRepository.COLLECTION).doc(callId);

    await docRef.set(accuracy);
  }

  /**
   *
   * @param callId - The id of the call to delete accuracy for
   */
  async deleteAccuracyForCall(callId: string): Promise<void> {
    const db = Firebase.getInstance();
    const docRef = db.collection(FirestoreAccuracyRepository.COLLECTION).doc(callId);

    await docRef.delete();
  }
}
