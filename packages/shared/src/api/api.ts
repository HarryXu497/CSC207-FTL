/** Error shape */
export interface ApiErrorBody {
  error: { message: string; details?: unknown };
}

export type ServerResponse<T> = ApiErrorBody | T;
