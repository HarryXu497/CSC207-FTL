/** GET /api/health */
export interface HealthResponse {
  status: 'ok';
  /** Which storage implementation the server booted with. */
  backend: 'memory' | 'firestore';
}
