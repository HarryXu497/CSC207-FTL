/**
 * THE CONTRACT.
 *
 * This file is imported by BOTH the server and the browser, so there is exactly
 * one definition of what a "call" is. Rename a field here and both sides refuse
 * to compile until you fix them - which is the entire reason this package exists.
 */

/** One customer service call stored in the database. */
export interface Call {
  id: string;
  customerName: string;
  topic: string;
  /** Quality score out of 100. */
  score: number;
  /** ISO 8601 timestamp, e.g. '2026-09-28T16:05:00.000Z'. */
  handledAt: string;
}

/* ---- One request/response pair per endpoint. ---- */

/** GET /api/health */
export interface HealthResponse {
  status: 'ok';
  /** Which storage implementation the server booted with. */
  backend: 'memory' | 'firestore';
}

/** GET /api/calls */
export interface ListCallsResponse {
  calls: Call[];
}

/** POST /api/calls - the fields the user supplies; the server adds id + handledAt. */
export interface CreateCallRequest {
  customerName: string;
  topic: string;
  score: number;
}

export interface CreateCallResponse {
  call: Call;
}

/** Every failed request comes back in this one shape. */
export interface ApiErrorBody {
  error: { message: string; details?: unknown };
}
