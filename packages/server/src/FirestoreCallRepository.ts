/**
 * Storage implementation #2: real Google Cloud Firestore.
 *
 * Same interface as InMemoryCallRepository, completely different mechanism - a
 * hash map versus a network database. Nothing above this file changes when you
 * switch between them.
 *
 * Firestore is a DOCUMENT database, not a relational one:
 *   collection ~ a folder            "calls"
 *   document   ~ a JSON file in it   "calls/call-1001"
 *
 * Note we use `firebase-admin`, the SERVER SDK. It bypasses Firestore security
 * rules entirely, so its credentials are secrets and must never reach the
 * browser. Our React app never touches Firestore - it asks this server instead,
 * which is the safer of the two common Firebase designs.
 */
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { Call } from '@recall/shared';
import type { CallRepository } from './CallRepository';

const COLLECTION = 'calls';

let cached: Firestore | undefined;

/**
 * `initializeApp()` throws if called twice, and `tsx watch` re-runs modules on
 * every save - hence the guard and the cache.
 */
function getDb(): Firestore {
  if (cached) return cached;
  if (getApps().length === 0) {
    initializeApp({
      /* Reads the JSON key file named by GOOGLE_APPLICATION_CREDENTIALS - or,
         once deployed on Google Cloud, the machine's own service account. */
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  cached = getFirestore();
  return cached;
}

export class FirestoreCallRepository implements CallRepository {
  async listCalls(): Promise<Call[]> {
    /* The DATABASE does the sorting, not us, so this stays fast as rows pile up. */
    const snapshot = await getDb().collection(COLLECTION).orderBy('handledAt', 'desc').get();
    /* Firestore returns untyped JSON, so `as Call` is us promising something
       TypeScript cannot verify. It is the one spot where the type system trusts
       us - the trade-off every database driver makes. */
    return snapshot.docs.map((doc) => doc.data() as Call);
  }

  async saveCall(call: Call): Promise<void> {
    /* Supplying our own document id (rather than letting Firestore generate one)
       makes this idempotent: saving the same call twice updates it instead of
       creating a duplicate. */
    await getDb().collection(COLLECTION).doc(call.id).set(call);
  }
}
