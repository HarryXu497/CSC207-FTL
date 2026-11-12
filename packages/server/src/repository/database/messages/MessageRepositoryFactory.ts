import { FirestoreMessageRepository } from './FirestoreMessageRepository';
import { InMemoryMessageRepository } from './InMemoryMessageRepository';
import type { MessageRepository } from './MessageRepository';

export type MessageRepositoryBuilder = (
  parentCollection: 'calls' | 'branches',
  parentId: string,
) => MessageRepository;

/**
 * Helper function to abstract message repository instantiation
 * @param backend - The app backend implementation
 * @returns A callback called to create message repositories
 */
export function createMessageRepositoryBuilder(
  backend: 'firestore' | 'memory',
): MessageRepositoryBuilder {
  if (backend === 'firestore') {
    return (parentCollection, parentId) =>
      new FirestoreMessageRepository(parentCollection, parentId);
  }

  const instances = new Map<string, InMemoryMessageRepository>();
  return (_parentCollection, parentId) => {
    let instance = instances.get(parentId);
    if (!instance) {
      instance = new InMemoryMessageRepository([]);
      instances.set(parentId, instance);
    }
    return instance;
  };
}
