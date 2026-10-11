/**
 * In memory implementation of the data layer
 */
import type { Call } from '@recall/shared';
import type { CallRepository } from './CallRepository';

/** Demo rows */
const SEED: Call[] = [
  {
    id: 'call-1001',
    customerName: 'Priya Raman',
    topic: 'Damaged delivery, replacement refused',
    score: 19,
    handledAt: '2026-09-26T14:12:00.000Z',
  },
  {
    id: 'call-1002',
    customerName: 'Dana Olofsson',
    topic: 'Account lockout before a deadline',
    score: 91,
    handledAt: '2026-09-28T16:05:00.000Z',
  },
];

export class InMemoryCallRepository implements CallRepository {
  private readonly calls = new Map<string, Call>();

  constructor(seed: Call[] = SEED) {
    for (const call of seed) {
      this.calls.set(call.id, call);
    }
  }

  async listCalls(): Promise<Call[]> {
    return [...this.calls.values()].sort((a, b) => b.handledAt.localeCompare(a.handledAt));
  }

  async saveCall(call: Call): Promise<void> {
    this.calls.set(call.id, call);
  }
}
