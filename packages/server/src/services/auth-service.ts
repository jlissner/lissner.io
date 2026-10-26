import { UI_HOST, UI_PORT } from "../config/env.js";

/** Public URL for magic-link redirects and email links (UI host, not API). */
export function getMagicLinkBaseUrl(): string {
  const protocol = UI_HOST === "localhost" ? "http" : "https";
  const withoutPort = `${protocol}://${UI_HOST}`;

  if (protocol === "https") return withoutPort;

  return `${withoutPort}:${UI_PORT}`;
}
