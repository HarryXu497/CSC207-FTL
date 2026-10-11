/**
 * Shared types between the frontend and backend.
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

/** POST /api/calls; server adds the id and handledAt fields */
export interface CreateCallRequest {
  customerName: string;
  topic: string;
  score: number;
}

export interface CreateCallResponse {
  call: Call;
}

/** Error shape */
export interface ApiErrorBody {
  error: { message: string; details?: unknown };
}
