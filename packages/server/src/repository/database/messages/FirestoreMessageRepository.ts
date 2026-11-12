/**
 * Firebase Firestore implementation of the data layer
 */
import type { Message } from '@recall/shared';
import { Firebase } from '../utils';
import type { MessageRepository } from './MessageRepository';

/**
 * Firebase implementation of message repository
 */
export class FirestoreMessageRepository implements MessageRepository {
  static readonly COLLECTION = 'messages';

  constructor(
    private readonly parentCollection: 'call' | 'branch',
    private readonly callId: string,
  ) {}

  /**
   * Get all messages, ordered by creation time ascending.
   * @returns a list of all messages
   */
  async getAllMessages(): Promise<Message[]> {
    const db = Firebase.getInstance();

    const collectionRef = db
      .collection(this.parentCollection)
      .doc(this.callId)
      .collection(FirestoreMessageRepository.COLLECTION);

    const snapshot = await collectionRef.get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Message);
  }

  /**
   * Appends a single message, automatically generating the id.
   * @param message - The message to append
   * @returns the id of the created messages
   */
  async addMessage(message: Omit<Message, 'id'>): Promise<string> {
    const db = Firebase.getInstance();

    const collectionRef = db
      .collection(this.parentCollection)
      .doc(this.callId)
      .collection(FirestoreMessageRepository.COLLECTION);

    const docRef = await collectionRef.add(message);
    return docRef.id;
  }

  /**
   * Appends multiple messages in one batch, automatically
   * generating the ids.
   * @param messages - The messages to append
   */
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

  /**
   * Subscribes to message updates.
   * @param callback - Called with all messages whenever a message is appended
   * @returns an unsubscribe function
   */
  subscribe(callback: (messages: Message[]) => void): () => void {
    const db = Firebase.getInstance();
    const collectionRef = db
      .collection(this.parentCollection)
      .doc(this.callId)
      .collection(FirestoreMessageRepository.COLLECTION);

    return collectionRef.onSnapshot((snapshot) => {
      callback(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Message));
    });
  }
}
