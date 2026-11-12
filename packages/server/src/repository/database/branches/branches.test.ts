/**
 * Unit tests
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryCallRepository } from '../calls/InMemoryCallRepository';
import { InMemoryBranchRepository } from './InMemoryBranchRepository';

let callRepo: InMemoryCallRepository;
let branchRepo: InMemoryBranchRepository;

beforeEach(() => {
  callRepo = new InMemoryCallRepository();
  branchRepo = new InMemoryBranchRepository(callRepo);
});

describe('getAllBranchesOfCall', () => {
  it('returns seeded branches for a call', async () => {
    const branches = await branchRepo.getAllBranchesOfCall('call-1001');
    expect(branches).toHaveLength(1);
    expect(branches[0]?.id).toBe('branch-2001');
  });

  it('returns empty array for a call with no branches', async () => {
    const branches = await branchRepo.getAllBranchesOfCall('call-9999');
    expect(branches).toHaveLength(0);
  });
});

describe('getBranch', () => {
  it('returns the branch for a known id', async () => {
    const branch = await branchRepo.getBranch('branch-2001');
    expect(branch.id).toBe('branch-2001');
    expect(branch.parentId).toBe('call-1001');
  });

  it('throws for an unknown id', async () => {
    await expect(branchRepo.getBranch('branch-9999')).rejects.toThrow('branch-9999');
  });
});

describe('createBranchFromCall', () => {
  it('creates a branch from a call and returns its id', async () => {
    const id = await branchRepo.createBranchFromCall('call-1002', '4');
    const branch = await branchRepo.getBranch(id);

    expect(branch.parentId).toBe('call-1002');
    expect(branch.branchIndex).toBe(4);
    expect(branch.customerName).toBe('Dana Olofsson');
  });

  it('throws when the call does not exist', async () => {
    await expect(branchRepo.createBranchFromCall('call-9999', '1')).rejects.toThrow('call-9999');
  });
});

describe('setBranch', () => {
  it('overwrites an existing branch', async () => {
    const original = await branchRepo.getBranch('branch-2001');
    await branchRepo.setBranch({ ...original, topic: 'Updated topic' });
    const updated = await branchRepo.getBranch('branch-2001');
    expect(updated.topic).toBe('Updated topic');
  });
});

describe('deleteBranch', () => {
  it('removes the branch', async () => {
    await branchRepo.deleteBranch('branch-2001');
    await expect(branchRepo.getBranch('branch-2001')).rejects.toThrow('branch-2001');
  });
});
