import type { MessageSentiment } from 'src/entities';
import { describe, expect, it } from 'vitest';
import { InMemorySentimentRepository } from './InMemorySentimentRepository';

const sentiments = (messageId: string): MessageSentiment[] => [
  { messageId, result: { ok: false, reason: 'empty' } },
];

describe('InMemorySentimentRepository', () => {
  it('returns null for a call that has not been analyzed', async () => {
    expect(await new InMemorySentimentRepository().getSentimentForCall('missing')).toBeNull();
  });

  it('returns what was saved', async () => {
    const repo = new InMemorySentimentRepository();
    await repo.setSentiment('call-1', sentiments('m1'));

    expect(await repo.getSentimentForCall('call-1')).toEqual(sentiments('m1'));
  });

  it('overwrites an earlier result for the same call', async () => {
    const repo = new InMemorySentimentRepository();
    await repo.setSentiment('call-1', sentiments('m1'));
    await repo.setSentiment('call-1', sentiments('m2'));

    expect(await repo.getSentimentForCall('call-1')).toEqual(sentiments('m2'));
  });

  it('deletes a result, and deleting a missing one does not throw', async () => {
    const repo = new InMemorySentimentRepository();
    await repo.setSentiment('call-1', sentiments('m1'));
    await repo.deleteSentimentForCall('call-1');

    expect(await repo.getSentimentForCall('call-1')).toBeNull();
    await expect(repo.deleteSentimentForCall('call-1')).resolves.toBeUndefined();
  });
});
