/** API error types and helpers — kept free of browser globals so they are unit-testable. */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Map an unknown thrown value to a user-facing message, falling back to `fallback`. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}
