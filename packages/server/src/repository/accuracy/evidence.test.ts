import { describe, expect, it } from 'vitest';
import { quoteAppearsIn, sourceOf } from './evidence';

describe('quoteAppearsIn', () => {
  const chunk =
    'Items may be returned within 30 days of delivery.\nRefunds take 5-7 business days.';

  it('tolerates case, whitespace and punctuation differences', () => {
    expect(quoteAppearsIn('REFUNDS  take 5 7 business days', chunk)).toBe(true);
  });

  it('rejects altered quotes', () => {
    expect(quoteAppearsIn('returned within 60 days of delivery', chunk)).toBe(false);
  });
});

describe('sourceOf', () => {
  it('uses metadata.source, then the chunk id prefix', () => {
    expect(sourceOf({ content: 'x', metadata: { source: 'a.md' }, id: 'b.md::2' })).toBe('a.md');
    expect(sourceOf({ content: 'x', id: 'docs/b.md::2' })).toBe('docs/b.md');
  });
});
