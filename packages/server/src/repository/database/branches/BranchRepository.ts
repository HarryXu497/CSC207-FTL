import type { Branch } from 'src/entities';

/**
 * Represents a repository object that operates with branches.
 */
export interface BranchRepository {
  /**
   * Get all branches of a call, ordered by creation time in descending order
   * @returns a list of all branches of the given call
   */
  getAllBranchesOfCall(callId: string): Promise<Branch[]>;

  /**
   * Gets a branch with a given ID
   * @param BranchId - The id of the Branch to get
   * @returns the Branch object
   */
  getBranch(branchId: string): Promise<Branch>;

  /**
   * Creates a branch from a given call and branch index
   * @param callId - The id of the call to branch from
   * @param branchIndex - The messages index from which to branch off from
   * @returns the id of the created branch
   */
  createBranchFromCall(callId: string, branchIndex: number): Promise<string>;

  /**
   * Inserts a branch object, overwriting if a branch with the same ID already exists.
   * @param branch - The branch to insert or overwrite
   */
  setBranch(branch: Branch): Promise<void>;

  /**
   * Deletes a branch by its id
   * @param branchId - The id of the branch to delete
   */
  deleteBranch(branchId: string): Promise<void>;
}
