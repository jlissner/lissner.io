/** Application-level error mapped to an HTTP status (use from services or routes). */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}
