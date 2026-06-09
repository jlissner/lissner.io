/**
 * Central fetch helpers for the JSON API (JWT cookies, consistent errors, silent refresh).
 * ALWAYS use this over raw `fetch("/api/...")` so credentials and error parsing stay consistent.
 */

import { ApiError } from "./errors";

const AUTH_PATHS = new Set([
  "auth/refresh",
  "auth/magic-link",
  "auth/verify-code",
  "auth/config",
]);

const { VITE_API_HOST } = import.meta.env;

const apiUrl =
  VITE_API_HOST === "localhost" ? "/api" : `https://${VITE_API_HOST}`;
const webSocketUrl =
  VITE_API_HOST === "localhost"
    ? `ws://${window.location.host}/ws`
    : `wss//${VITE_API_HOST}/ws`;

/** Path under `/api`, e.g. `"activity"` or `"/activity"` → `/api/activity` (or absolute API origin URL in production). */
export function prependApiUrl(path: string): string {
  const rel = path.startsWith("/") ? path : `/${path}`;

  return `${apiUrl}${rel}`;
}

export function prependWebSocketUrl(path: string): string {
  const rel = path.startsWith("/") ? path : `/${path}`;

  return `${webSocketUrl}${rel}`;
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
