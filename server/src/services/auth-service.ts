import { SERVER_HOST, SERVER_PROTOCOL, UI_PORT } from "../config/env.js";

/** Public URL for magic-link redirects and email links (from env or request). */
export function getMagicLinkBaseUrl(): string {
  const withoutPort = `${SERVER_PROTOCOL}://${SERVER_HOST}`;

  if (SERVER_HOST !== "localhost") return withoutPort;

  return `${withoutPort}:${UI_PORT}`;
}
