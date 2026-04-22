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

if (process.env.NODE_ENV === "production") {
  const prodEnvPath = path.join(PROJECT_ROOT, ".env.prod");

  invariant(existsSync(prodEnvPath), "No .env.prod file found");

  config({ path: prodEnvPath, override: true });
} else {
  const envLocalPath = path.join(PROJECT_ROOT, ".env.local");

  invariant(existsSync(envLocalPath), "No .env.local file found");

  config({ path: envLocalPath, override: true });
}

function getEnvVar(name: string) {
  const val = process.env[name];

  invariant(val, `${name} not set`);

  return val;
}

export const DATA_DIR = getEnvVar("DATA_DIR");
export const NODE_ENV = getEnvVar("NODE_ENV");
export const SERVER_PORT = Number(getEnvVar("SERVER_PORT"));
export const UI_PORT = Number(getEnvVar("UI_PORT"));
export const OLLAMA_HOST = getEnvVar("OLLAMA_HOST");
export const SERVER_HOST = getEnvVar("SERVER_HOST");
export const SERVER_PROTOCOL = getEnvVar("SERVER_PROTOCOL");
export const AWS_ACCESS_KEY_ID = getEnvVar("AWS_ACCESS_KEY_ID");
export const AWS_SECRET_ACCESS_KEY = getEnvVar("AWS_SECRET_ACCESS_KEY");
export const AWS_REGION = getEnvVar("AWS_REGION");
export const SES_FROM_EMAIL = getEnvVar("SES_FROM_EMAIL");
