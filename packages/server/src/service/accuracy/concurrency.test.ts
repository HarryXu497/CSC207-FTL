import { describe, expect, it } from 'vitest';
import { mapLimit } from './concurrency';

describe('mapLimit', () => {
  it('keeps the result order even when tasks finish out of order', async () => {
    const delays = [30, 5, 15];
    const result = await mapLimit(delays, 3, async (ms, i) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return i;
    });
    expect(result).toEqual([0, 1, 2]);
  });

  it('never runs more than the limit at once', async () => {
    let running = 0;
    let peak = 0;
    await mapLimit([1, 2, 3, 4, 5, 6], 2, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
    });
    expect(peak).toBe(2);
  });

  it('handles an empty list', async () => {
    expect(await mapLimit([], 4, async () => 1)).toEqual([]);
  });
});
