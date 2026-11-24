import type { Message } from 'src/entities';
import { describe, expect, it } from 'vitest';
import { buildSimulationRetrievalQuery } from './context';

describe('buildSimulationRetrievalQuery', () => {
  it('uses the topic and recent turns while preserving the full history', () => {
    const history: Pick<Message, 'role' | 'content'>[] = [
      { role: 'customer', content: 'An old billing question.' },
      { role: 'agent', content: 'The billing question is resolved.' },
      { role: 'customer', content: 'My delivery arrived damaged.' },
      { role: 'agent', content: 'When did it arrive?' },
      { role: 'customer', content: 'Yesterday.' },
      { role: 'agent', content: 'I will check the replacement policy.' },
    ];
    const original = structuredClone(history);

    const query = buildSimulationRetrievalQuery('Damaged delivery', history);

    expect(query).toContain('Damaged delivery');
    expect(query).not.toContain('billing');
    expect(query).toContain('My delivery arrived damaged.');
    expect(query).toContain('When did it arrive?');
    expect(query).toContain('Yesterday.');
    expect(query).toContain('I will check the replacement policy.');
    expect(query.indexOf('My delivery arrived damaged.')).toBeLessThan(query.indexOf('Yesterday.'));
    expect(history).toEqual(original);
  });

  it('bounds long input without losing the latest question', () => {
    const latestQuestion = 'What is the replacement deadline?';
    const history: Pick<Message, 'role' | 'content'>[] = [
      { role: 'customer', content: 'a'.repeat(5000) },
      { role: 'agent', content: 'b'.repeat(5000) },
      { role: 'customer', content: 'c'.repeat(5000) },
      { role: 'agent', content: `Earlier details. ${'d'.repeat(5000)} ${latestQuestion}` },
    ];

    const query = buildSimulationRetrievalQuery('Delivery policy '.repeat(1000), history);

    expect(query.length).toBeLessThan(2500);
    expect(query).toContain(latestQuestion);
    expect(query).not.toContain('Earlier details.');
  });
});
