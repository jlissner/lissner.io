import { PICS_UI_HOST, PICS_UI_PORT } from "../config/env.js";

/** Public URL for magic-link redirects and email links (UI host, not API). */
export function getMagicLinkBaseUrl(): string {
  const protocol = PICS_UI_HOST === "localhost" ? "http" : "https";
  const withoutPort = `${protocol}://${PICS_UI_HOST}`;

  if (protocol === "https") return withoutPort;

  return `${withoutPort}:${PICS_UI_PORT}`;
}
