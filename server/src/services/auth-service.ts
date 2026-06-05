import { VITE_API_HOST, UI_PORT } from "../config/env.js";

/** Public URL for magic-link redirects and email links (from env or request). */
export function getMagicLinkBaseUrl(): string {
  const protocol = VITE_API_HOST === "localhost" ? "http" : "https";
  const withoutPort = `${protocol}://${VITE_API_HOST}`;

  if (protocol === "https") return withoutPort;

  return `${withoutPort}:${UI_PORT}`;
}
