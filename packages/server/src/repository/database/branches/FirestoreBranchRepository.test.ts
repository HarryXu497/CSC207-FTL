import { InvalidBranchPointError } from 'src/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Firebase } from '../utils';
import { FirestoreBranchRepository } from './FirestoreBranchRepository';

const opening = {
  role: 'customer',
  content: 'Customer opening',
  createdAt: '2026-01-01T12:00:00.000Z',
};
const agentReply = {
  role: 'agent',
  content: 'Original agent reply',
  createdAt: '2026-01-01T12:01:00.000Z',
};
const laterTurn = {
  role: 'customer',
  content: 'Later customer turn',
  createdAt: '2026-01-01T12:02:00.000Z',
};

function mockFirestore() {
  const writes: Record<string, unknown>[] = [];
  const docs = [opening, agentReply, laterTurn].map((message) => ({ data: () => message }));
  const source = {
    get: async () => ({
      exists: true,
      data: () => ({
        customerName: 'Priya',
        topic: 'Damaged delivery',
        createdAt: opening.createdAt,
      }),
    }),
    collection: () => ({ orderBy: () => ({ get: async () => ({ size: docs.length, docs }) }) }),
  };
  const target = { id: 'new-branch', collection: () => ({ doc: () => ({}) }) };
  const batch = vi.fn(() => ({
    set: (_ref: unknown, data: Record<string, unknown>) => {
      writes.push(data);
    },
    commit: async () => [],
  }));
  const db = {
    collection: (name: string) => ({ doc: () => (name === 'calls' ? source : target) }),
    batch,
  };
  vi.spyOn(Firebase, 'getInstance').mockReturnValue(
    db as unknown as ReturnType<typeof Firebase.getInstance>,
  );
  return { writes, batch };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FirestoreBranchRepository', () => {
  it.each([
    ['before', 1, [opening]],
    [undefined, 1, [opening, agentReply]],
    ['before', 0, []],
  ] as const)(
    'copies the correct prefix for position %s at index %i',
    async (position, index, prefix) => {
      const { writes } = mockFirestore();
      const repository = new FirestoreBranchRepository();

      expect(await repository.createBranchFromCall('call-1', index, position)).toBe('new-branch');
      expect(writes).toEqual([
        expect.objectContaining({
          parentId: 'call-1',
          branchIndex: index,
          branchPosition: position ?? 'after',
        }),
        ...prefix,
      ]);
    },
  );

  it('rejects an invalid cut before starting a write batch', async () => {
    const { writes, batch } = mockFirestore();
    const repository = new FirestoreBranchRepository();

    await expect(repository.createBranchFromCall('call-1', 3, 'before')).rejects.toBeInstanceOf(
      InvalidBranchPointError,
    );
    expect(batch).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });
});
