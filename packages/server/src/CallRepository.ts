/**
 * THE STORAGE INTERFACE (the "port").
 *
 * Read this and notice what is NOT here: no Firestore, no `collection`, no `doc`,
 * no SQL. It is written entirely in OUR words - `Call` - and describes only WHAT
 * the app needs from storage, never HOW storage works.
 *
 * Two classes implement it:
 *   InMemoryCallRepository  - a Map in RAM. Zero setup.
 *   FirestoreCallRepository - real Google Cloud Firestore.
 *
 * Everything else in the app holds a `CallRepository` and cannot tell which one
 * it got. That is the Dependency Inversion Principle, and it is why the app runs
 * with no Firebase account and why the test needs no network.
 *
 * Note every method returns a Promise, even the in-memory ones that could answer
 * instantly. If `listCalls()` were synchronous here, Firestore - which MUST be
 * async - could not implement this interface at all. You design an interface for
 * the SLOWEST implementation you might plug in.
 */
import type { Call } from '@recall/shared';

export interface CallRepository {
  /** Every call, newest first. */
  listCalls(): Promise<Call[]>;

  /** Insert or overwrite one call. */
  saveCall(call: Call): Promise<void>;
}
