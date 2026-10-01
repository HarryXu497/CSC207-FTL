/**
 * Storage implementation #1: a Map held in the Node process.
 *
 * A `Map` is JavaScript's dictionary - the closest thing to a Python dict.
 * Everything here vanishes when the server restarts, which is exactly what you
 * want while developing: every `npm run dev` starts from the same clean data.
 */
import type { Call } from '@recall/shared';
import type { CallRepository } from './CallRepository';

/** Two demo rows so the dashboard is never empty on first run. */
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
  /* `readonly` stops anyone reassigning the Map itself. It does NOT freeze the
     contents - we still add entries below. */
  private readonly calls = new Map<string, Call>();

  constructor(seed: Call[] = SEED) {
    for (const call of seed) {
      this.calls.set(call.id, call);
    }
  }

  /* `async` makes a function return a Promise even when nothing inside it waits.
     That is all these two need in order to satisfy the interface. */

  async listCalls(): Promise<Call[]> {
    /* Newest first. Comparing ISO date strings alphabetically gives the same
       answer as comparing the dates - which is why we store them that way. */
    return [...this.calls.values()].sort((a, b) => b.handledAt.localeCompare(a.handledAt));
  }

  async saveCall(call: Call): Promise<void> {
    this.calls.set(call.id, call);
  }
}
