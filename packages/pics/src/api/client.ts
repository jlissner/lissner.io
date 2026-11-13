/**
 * Central fetch helpers for the JSON API (JWT cookies, consistent errors, silent refresh).
 * ALWAYS use this over raw `fetch("/auth/...")` so credentials and error parsing stay consistent.
 */
import { baseUrl, webSocketUrl } from "@lissner/ui-utils";
import { ApiError } from "./errors";

const AUTH_PATHS = new Set([
  "auth/refresh",
  "auth/magic-link",
  "auth/verify-code",
  "auth/config",
]);

/** API path segment, e.g. `"activity"` → `/activity` locally or `https://api.example/activity` in production. */
export function prependApiUrl(path: string): string {
  return `${baseUrl}${path}`;
}

export function prependWebSocketUrl(path: string): string {
  return `${webSocketUrl}${path}`;
}

const refreshState: { promise: Promise<boolean> | null } = { promise: null };

function attemptRefresh(): Promise<boolean> {
  if (refreshState.promise) return refreshState.promise;
  refreshState.promise = fetch(prependApiUrl("auth/refresh"), {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .catch((err) => {
      console.error({ err }, "auth refresh request failed");
      return false;
    })
    .finally(() => {
      refreshState.promise = null;
    });
  return refreshState.promise;
}

function normalizedPath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = prependApiUrl(path);
  const res = await fetch(url, {
    credentials: "include",
    ...init,
  });

  if (res.status === 401 && !AUTH_PATHS.has(normalizedPath(path))) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return fetch(prependApiUrl(path), { credentials: "include", ...init });
    }
  }

  return res;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
