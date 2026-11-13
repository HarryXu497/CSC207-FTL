/** Error shape */
export interface ApiErrorBody {
  error: { message: string; details?: unknown };
}

export type WithError<T> = ApiErrorBody | T;
