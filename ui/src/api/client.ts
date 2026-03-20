/**
 * Central fetch helpers for the JSON API (cookie sessions, consistent errors).
 * Prefer this over raw `fetch("/api/...")` so credentials and error parsing stay consistent.
 */

const API_PREFIX = "/api";

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

/** Path under `/api`, e.g. `"activity"` or `"/activity"` → `/api/activity`. */
export function apiUrl(path: string): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  return trimmed.startsWith("/api") ? trimmed : `${API_PREFIX}${trimmed}`;
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), {
    credentials: "include",
    ...init,
  });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  const data = (text ? JSON.parse(text) : null) as unknown;
  if (!res.ok) {
    const message =
      data !== null &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : res.statusText;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}
