/**
 * Firebase Firestore implementation of the data layer
 */
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { Call } from '@recall/shared';
import type { CallRepository } from './CallRepository';

const COLLECTION = 'calls';

let cached: Firestore | undefined;

function getDb(): Firestore {
  if (cached) return cached;
  // Corresponds to the JSON key file specified by the GOOGLE_APPLICATION_CREDENTIALS env variable
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  cached = getFirestore();
  return cached;
}

export class FirestoreCallRepository implements CallRepository {
  async listCalls(): Promise<Call[]> {
    const snapshot = await getDb().collection(COLLECTION).orderBy('handledAt', 'desc').get();
    return snapshot.docs.map((doc) => doc.data() as Call);
  }

  async saveCall(call: Call): Promise<void> {
    await getDb().collection(COLLECTION).doc(call.id).set(call);
  }
}
