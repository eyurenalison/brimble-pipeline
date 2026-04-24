export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'MISSING_FILE'
  | 'NOT_FOUND'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}

export function apiError(
  code: ApiErrorCode,
  error: string,
  details?: unknown
): ApiErrorResponse {
  return details === undefined ? { code, error } : { code, error, details };
}
