/**
 * Environment and paths — load env files before reading `process.env`.
 *
 * Order: `.env` (base) → `.env.prod` when `NODE_ENV=production` (overrides) →
 * `.env.local` in non-production (overrides, local dev only).
 * Imported first by `paths.ts` so all server modules see the same env.
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import path from "path";
import invariant from "tiny-invariant";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (parent of `server/`). */
export const PROJECT_ROOT = path.join(__dirname, "..", "..", "..");

const envPath = path.join(PROJECT_ROOT, ".env");
if (existsSync(envPath)) {
  config({ path: envPath });
}

if (process.env.NODE_ENV === "production") {
  const prodEnvPath = path.join(PROJECT_ROOT, ".env.prod");
  if (existsSync(prodEnvPath)) {
    config({ path: prodEnvPath, override: true });
  }
} else {
  const envLocalPath = path.join(PROJECT_ROOT, ".env.local");
  if (existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: true });
  }
}

function resolveDataDir(): string {
  const raw = process.env.DATA_DIR?.trim();
  if (!raw) {
    return path.join(PROJECT_ROOT, "data");
  }
  return path.isAbsolute(raw) ? raw : path.join(PROJECT_ROOT, raw);
}

/** Resolved absolute data directory (honours `DATA_DIR`). */
export const DATA_DIR = resolveDataDir();

export const NODE_ENV = process.env.NODE_ENV ?? "development";

/** HTTP listen port (honours `SERVER_PORT`). */
export const SERVER_PORT = Number(process.env.SERVER_PORT);
/** Vite dev server port (magic-link redirects when the browser uses the UI origin). */
export const UI_PORT = Number(process.env.UI_PORT);
/** Base URL for Ollama (embeddings + vision). */
export const OLLAMA_HOST = process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";
/** API host for dev tooling (Vite proxy, `clear-index`) when `API_PROXY_TARGET` is unset. */
export const SERVER_HOST = process.env.SERVER_HOST;
export const SERVER_PROTOCOL = process.env.SERVER_PROTOCOL;

invariant(SERVER_PORT, "SERVER_PORT not set");
invariant(UI_PORT, "UI_PORT not set");
invariant(OLLAMA_HOST, "OLLAMA_HOST not set");
invariant(SERVER_HOST, "SERVER_HOST not set");
invariant(SERVER_PROTOCOL, "SERVER_PROTOCOL not set");
