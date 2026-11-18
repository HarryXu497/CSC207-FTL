import { describe, expect, it } from 'vitest';
import { quoteAppearsIn } from './evidence';

describe('quoteAppearsIn', () => {
  const chunk =
    'Items may be returned within 30 days of delivery.\nRefunds take 5-7 business days.';

  it('matches verbatim quotes', () => {
    expect(quoteAppearsIn('returned within 30 days of delivery', chunk)).toBe(true);
  });

  it('tolerates case, whitespace and punctuation drift', () => {
    expect(quoteAppearsIn('REFUNDS  take 5 7 business days', chunk)).toBe(true);
  });

  it('rejects invented or altered quotes', () => {
    expect(quoteAppearsIn('returned within 60 days of delivery', chunk)).toBe(false);
    expect(quoteAppearsIn('', chunk)).toBe(false);
  });
});
