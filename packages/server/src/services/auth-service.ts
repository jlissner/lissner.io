import { VITE_PICS_UI_HOST, VITE_PICS_UI_PORT } from "../config/env.js";

/** Public URL for magic-link redirects and email links (UI host, not API). */
export function getMagicLinkBaseUrl(): string {
  const protocol = VITE_PICS_UI_HOST === "localhost" ? "http" : "https";
  const withoutPort = `${protocol}://${VITE_PICS_UI_HOST}`;

  if (protocol === "https") return withoutPort;

  return `${withoutPort}:${VITE_PICS_UI_PORT}`;
}
