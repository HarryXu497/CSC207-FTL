/**
 * Unit tests
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryCallRepository } from '../calls/InMemoryCallRepository';
import { InMemoryMessageRepository } from '../messages/InMemoryMessageRepository';
import { InMemoryBranchRepository } from './InMemoryBranchRepository';
import { createMessageRepositoryBuilder, type MessageRepositoryBuilder } from '../messages';
import { InvalidBranchPointError } from 'src/errors';

let callRepo: InMemoryCallRepository;
let branchRepo: InMemoryBranchRepository;

beforeEach(() => {
  const messageRepo = new InMemoryMessageRepository();
  callRepo = new InMemoryCallRepository();
  branchRepo = new InMemoryBranchRepository(callRepo, () => messageRepo);
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
  let factory: MessageRepositoryBuilder;

  beforeEach(async () => {
    factory = createMessageRepositoryBuilder('memory');
    branchRepo = new InMemoryBranchRepository(callRepo, factory, []);
    await factory('calls', 'call-1002').addMessages([
      { role: 'customer', content: 'Customer opening', createdAt: '2026-01-01T12:00:00.000Z' },
      { role: 'agent', content: 'Original agent reply', createdAt: '2026-01-01T12:01:00.000Z' },
      { role: 'customer', content: 'Later customer turn', createdAt: '2026-01-01T12:02:00.000Z' },
    ]);
  });

  it('keeps the selected turn by default and excludes it when branching before', async () => {
    const original = await factory('calls', 'call-1002').getAllMessages();
    const afterId = await branchRepo.createBranchFromCall('call-1002', 1);
    const beforeId = await branchRepo.createBranchFromCall('call-1002', 1, 'before');
    const after = await factory('branches', afterId).getAllMessages();
    const before = await factory('branches', beforeId).getAllMessages();

    expect(after.map((message) => message.content)).toEqual([
      'Customer opening',
      'Original agent reply',
    ]);
    expect(before).toEqual([{ ...original[0], id: expect.any(String) }]);
    expect(before[0]!.id).not.toBe(original[0]!.id);
    expect(await branchRepo.getBranch(beforeId)).toMatchObject({
      parentId: 'call-1002',
      branchIndex: 1,
      branchPosition: 'before',
    });
    expect((await branchRepo.getBranch(afterId)).branchPosition).toBe('after');

    await factory('branches', beforeId).addMessage({
      role: 'agent',
      content: 'Practice reply',
      createdAt: '2026-01-01T12:03:00.000Z',
    });
    expect(await factory('calls', 'call-1002').getAllMessages()).toEqual(original);
    expect(await factory('branches', afterId).getAllMessages()).toEqual(after);
  });

  it('creates an empty practice history before the first message', async () => {
    const id = await branchRepo.createBranchFromCall('call-1002', 0, 'before');
    expect(await factory('branches', id).getAllMessages()).toEqual([]);
    expect(await branchRepo.getBranch(id)).toMatchObject({
      branchIndex: 0,
      branchPosition: 'before',
    });
  });

  it('rejects an out-of-range point without creating a branch', async () => {
    await expect(branchRepo.createBranchFromCall('call-1002', 3, 'before')).rejects.toBeInstanceOf(
      InvalidBranchPointError,
    );
    expect(await branchRepo.getAllBranchesOfCall('call-1002')).toEqual([]);
  });

  it('throws when the call does not exist', async () => {
    await expect(branchRepo.createBranchFromCall('call-9999', 1)).rejects.toThrow('call-9999');
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
