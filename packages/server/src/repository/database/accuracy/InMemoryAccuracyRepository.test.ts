import type { Accuracy } from 'src/entities';
import { describe, expect, it } from 'vitest';
import { InMemoryAccuracyRepository } from './InMemoryAccuracyRepository';

const accuracy = (score: number): Accuracy => ({
  score,
  counts: { supported: 0, contradicted: 0, unsupported: 0, not_verifiable: 0 },
  claims: [],
  documents: { required: [], recommended: [] },
  claimsTruncated: false,
  promptVersion: 'test',
  analyzedAt: '2026-11-20T12:00:00.000Z',
});

describe('InMemoryAccuracyRepository', () => {
  it('returns null for a call that has not been analyzed', async () => {
    expect(await new InMemoryAccuracyRepository().getAccuracyForCall('missing')).toBeNull();
  });

  it('returns what was saved', async () => {
    const repo = new InMemoryAccuracyRepository();
    await repo.setAccuracy('call-1', accuracy(80));

    expect(await repo.getAccuracyForCall('call-1')).toEqual(accuracy(80));
  });

  it('overwrites an earlier result for the same call', async () => {
    const repo = new InMemoryAccuracyRepository();
    await repo.setAccuracy('call-1', accuracy(80));
    await repo.setAccuracy('call-1', accuracy(50));

    expect((await repo.getAccuracyForCall('call-1'))?.score).toBe(50);
  });

  it('deletes a result, and deleting a missing one does not throw', async () => {
    const repo = new InMemoryAccuracyRepository();
    await repo.setAccuracy('call-1', accuracy(80));
    await repo.deleteAccuracyForCall('call-1');

    expect(await repo.getAccuracyForCall('call-1')).toBeNull();
    await expect(repo.deleteAccuracyForCall('call-1')).resolves.toBeUndefined();
  });
});
