/**
 * In memory implementation of the data layer
 */
import type { Branch } from '@recall/shared';
import type { CallRepository } from '../calls/CallRepository';
import type { BranchRepository } from './BranchRepository';

/** Demo rows */
const SEED: Branch[] = [
  {
    id: 'branch-2001',
    customerName: 'Priya Raman',
    topic: 'Damaged delivery, replacement refused',
    createdAt: '2026-09-26T14:12:00.000Z',
    parentId: 'call-1001',
    branchIndex: 3,
  },
  {
    id: 'branch-2002',
    customerName: 'Dana Olofsson',
    topic: 'Account lockout before a deadline',
    createdAt: '2026-09-28T16:05:00.000Z',
    parentId: 'call-1002',
    branchIndex: 2,
  },
];

export class InMemoryBranchRepository implements BranchRepository {
  private readonly branches = new Map<string, Branch>();

  constructor(
    private readonly callRepo: CallRepository,
    seed: Branch[] = SEED,
  ) {
    for (const branch of seed) {
      this.branches.set(branch.id, branch);
    }
  }

  async getAllBranchesOfCall(callId: string): Promise<Branch[]> {
    return [...this.branches.values()]
      .filter((b) => b.parentId === callId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getBranch(branchId: string): Promise<Branch> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw Error(`Branch document with id does not exist, got ${branchId}`);
    }
    return branch;
  }

  async createBranchFromCall(callId: string, branchIndex: number): Promise<string> {
    if (branchIndex < 0) {
      throw Error(`Branch index must be non-negative, got ${branchIndex}`);
    }
    const call = await this.callRepo.getCall(callId);
    const id = crypto.randomUUID();
    this.branches.set(id, {
      ...call,
      id,
      parentId: callId,
      branchIndex: branchIndex,
    });
    return id;
  }

  async setBranch(branch: Branch): Promise<void> {
    this.branches.set(branch.id, branch);
  }

  async deleteBranch(branchId: string): Promise<void> {
    this.branches.delete(branchId);
  }
}
