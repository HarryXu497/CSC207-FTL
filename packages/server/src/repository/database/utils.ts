import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export class Firebase {
  private static instance: Firestore | undefined;

  public static getInstance(): Firestore {
    if (Firebase.instance) {
      return Firebase.instance;
    }

    // Corresponds to the JSON key file specified by the GOOGLE_APPLICATION_CREDENTIALS env variable
    if (getApps().length === 0) {
      initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    Firebase.instance = getFirestore();
    return Firebase.instance;
  }
}
