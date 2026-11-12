import type { Call } from '../repository/database/calls';

/** GET /api/calls */
export interface GetCallsResponse {
  calls: Call[];
}

/** GET /api/calls/:id */
export interface GetCallResponse {
  call: Call;
}

/** POST /api/calls */
export interface CreateCallResponse {
  call: Call;
}