/**
 * Firebase Firestore implementation of the data layer
 */
import type { Call } from '@recall/shared';
import type { CallRepository } from './CallRepository';
import { Firebase } from '../utils';

const COLLECTION = 'calls';

export class FirestoreCallRepository implements CallRepository {
  async listCalls(): Promise<Call[]> {
    const db = Firebase.getInstance();
    const snapshot = await db.collection(COLLECTION).orderBy('handledAt', 'desc').get();
    return snapshot.docs.map((doc) => doc.data() as Call);
  }

  async saveCall(call: Call): Promise<void> {
    const db = Firebase.getInstance();
    await db.collection(COLLECTION).doc(call.id).set(call);
  }
}
