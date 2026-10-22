import type { Call } from '../repository/database/calls';

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
