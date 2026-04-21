/**
 * Central fetch helpers for the JSON API (JWT cookies, consistent errors, silent refresh).
 * Prefer this over raw `fetch("/api/...")` so credentials and error parsing stay consistent.
 */

const API_PREFIX = "/api";

const AUTH_PATHS = new Set([
  "auth/refresh",
  "auth/me",
  "auth/magic-link",
  "auth/verify-code",
  "auth/config",
]);

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

const refreshState: { promise: Promise<boolean> | null } = { promise: null };

function attemptRefresh(): Promise<boolean> {
  if (refreshState.promise) return refreshState.promise;
  refreshState.promise = fetch(apiUrl("auth/refresh"), {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshState.promise = null;
    });
  return refreshState.promise;
}

function normalizedPath(path: string): string {
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return trimmed.startsWith("api/") ? trimmed.slice(4) : trimmed;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    ...init,
  });

  if (res.status === 401 && !AUTH_PATHS.has(normalizedPath(path))) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return fetch(apiUrl(path), { credentials: "include", ...init });
    }
  }

  return res;
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
