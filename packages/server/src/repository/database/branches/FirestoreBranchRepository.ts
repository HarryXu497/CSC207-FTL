import type { Branch, Call } from '@recall/shared';
import { FirestoreCallRepository } from '../calls';
import { Firebase } from '../utils';
import type { BranchRepository } from './BranchRepository';

/**
 * Firebase implementation of call repository
 */
export class FirestoreBranchRepository implements BranchRepository {
  static readonly COLLECTION = 'branches';

  /**
   * Get all branches of a call, ordered by creation time in descending order
   * @returns a list of all branches of the given call
   */
  async getAllBranchesOfCall(callId: string): Promise<Branch[]> {
    const db = Firebase.getInstance();
    const query = db
      .collection(FirestoreBranchRepository.COLLECTION)
      .where('parentId', '==', callId)
      .orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Branch);
  }

  /**
   * Gets a branch with a given ID
   * @param branchId - The id of the Branch to get
   * @returns the Branch object
   */
  async getBranch(branchId: string): Promise<Branch> {
    const db = Firebase.getInstance();
    const docRef = db.collection(FirestoreBranchRepository.COLLECTION).doc(branchId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw Error(`Branch document with id does not exist, got ${branchId}`);
    }

    return { id: snapshot.id, ...snapshot.data() } as Branch;
  }

  /**
   * Creates a branch from a given call and branch index
   * @param callId The id of the call to branch from
   * @param branchIndex The messages index from which to branch off from
   */
  async createBranchFromCall(callId: string, branchIndex: number): Promise<string> {
    if (branchIndex < 0) {
      throw Error(`Branch index must be non-negative, got ${branchIndex}`);
    }
    const db = Firebase.getInstance();
    const collectionRef = db.collection(FirestoreBranchRepository.COLLECTION);

    const callSnapshot = await db.collection(FirestoreCallRepository.COLLECTION).doc(callId).get();
    if (!callSnapshot.exists) {
      throw Error(`Call document with id does not exist, got ${callId}`);
    }

    const callData = callSnapshot.data() as Omit<Call, 'id'>;
    const docRef = await collectionRef.add({
      ...callData,
      createdAt: new Date().toISOString(),
      parentId: callId,
      branchIndex: branchIndex,
    });
    return docRef.id;
  }

  /**
   * Inserts a branch object, overwriting if a branch with the same ID already exists.
   * @param branch - The branch to insert or overwrite
   */
  async setBranch(branch: Branch): Promise<void> {
    const db = Firebase.getInstance();
    const { id, ...data } = branch;
    await db.collection(FirestoreBranchRepository.COLLECTION).doc(id).set(data);
  }

  /**
   * Deletes a branch by its id
   * @param branchId - The id of the branch to delete
   */
  async deleteBranch(branchId: string): Promise<void> {
    const db = Firebase.getInstance();
    await db.collection(FirestoreBranchRepository.COLLECTION).doc(branchId).delete();
  }
}
