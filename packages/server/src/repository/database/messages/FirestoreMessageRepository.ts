/**
 * Firebase Firestore implementation of the data layer
 */
import type { Message } from '@recall/shared';
import { FirestoreCallRepository } from '../calls';
import { Firebase } from '../utils';
import type { MessageRepository } from './MessageRepository';

export class FirestoreMessageRepository implements MessageRepository {
  static readonly COLLECTION = 'messages';
  static readonly callRepo = new FirestoreCallRepository();

  constructor(
    private readonly parentCollection: 'call' | 'branch',
    private readonly callId: string,
  ) {}

  async getAllMessages(): Promise<Message[]> {
    const db = Firebase.getInstance();

    const collectionRef = db
      .collection(this.parentCollection)
      .doc(this.callId)
      .collection(FirestoreMessageRepository.COLLECTION);

    const snapshot = await collectionRef.get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Message);
  }

  async addMessage(message: Omit<Message, "id">): Promise<string> {
    const db = Firebase.getInstance();

    const collectionRef = db
      .collection(this.parentCollection)
      .doc(this.callId)
      .collection(FirestoreMessageRepository.COLLECTION);

    const docRef = await collectionRef.add(message)
    return docRef.id

  }
  async addMessages(messages: Omit<Message, 'id'>[]): Promise<void> {
    const db = Firebase.getInstance();
    const collectionRef = db
      .collection(this.parentCollection)
      .doc(this.callId)
      .collection(FirestoreMessageRepository.COLLECTION);

    // firestore caps batches at 500
    const BATCH_SIZE = 500;
    const commits: Promise<FirebaseFirestore.WriteResult[]>[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = db.batch();
      for (const message of messages.slice(i, i + BATCH_SIZE)) {
        batch.set(collectionRef.doc(), message);
      }
      commits.push(batch.commit());
    }
    await Promise.all(commits);
  }
}
