/** `{ error: { code, message, statusCode, details } }` as a thrown value. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
export const isUnauthorized = (e: unknown): boolean => isApiError(e) && e.statusCode === 401;
export const isNotFound = (e: unknown): boolean => isApiError(e) && e.statusCode === 404;

/** A message safe to show: the API's own, else a generic one. */
export function errorMessage(e: unknown): string {
  return isApiError(e) ? e.message : "Something went wrong. Try again.";
}
