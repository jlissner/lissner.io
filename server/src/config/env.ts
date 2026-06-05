/**
 * Environment and paths — load env files before reading `process.env`.
 *
 * Loads **one** file when present: `.env.prod` if `NODE_ENV=production`, else
 * `.env.local` (override). There is no automatic `.env` load here — set vars in
 * the shell or the chosen file.
 * Imported first by `paths.ts` so all server modules see the same env.
 *
 * This module is the single source for **validated deployment config** (AWS
 * credentials, bucket, Ollama hosts/models, secrets, ports). Read those vars
 * via the exports here, never `process.env` directly — an ESLint guard enforces
 * this. `NODE_ENV`, the `BDD_*` test stubs, and the explorer feature flags are
 * intentionally read directly at their call sites (they must observe runtime/test
 * overrides and not trigger this module's `dotenv` load), so they live elsewhere.
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import path from "path";
import invariant from "tiny-invariant";

function getEnvVar(name: string) {
  const val = process.env[name];

  invariant(val, `${name} not set`);

  return val;
}

function getOptionalEnvVar(name: string, fallback: string): string {
  const val = process.env[name];
  return val == null || val === "" ? fallback : val;
}

export const PROJECT_ROOT = path.join(
  import.meta.dirname ?? __dirname,
  "../../..",
);

const envFileName =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.local";
const envPath = path.join(PROJECT_ROOT, envFileName);

if (existsSync(envPath)) {
  config({ path: envPath, override: true });
}

export const AWS_ACCESS_KEY_ID = getEnvVar("AWS_ACCESS_KEY_ID");
export const AWS_REGION = getEnvVar("AWS_REGION");
export const AWS_SECRET_ACCESS_KEY = getEnvVar("AWS_SECRET_ACCESS_KEY");
export const DATA_DIR = getEnvVar("DATA_DIR");
export const FIRST_ADMIN_EMAIL = getEnvVar("FIRST_ADMIN_EMAIL");
export const OLLAMA_HOST = getEnvVar("OLLAMA_HOST");
export const OLLAMA_VISION_MODEL = getEnvVar("OLLAMA_VISION_MODEL");
export const OLLAMA_EMBED_MODEL = getOptionalEnvVar(
  "OLLAMA_EMBED_MODEL",
  "nomic-embed-text",
);
export const S3_BUCKET = getEnvVar("S3_BUCKET");
export const VITE_API_HOST = getEnvVar("VITE_API_HOST");
export const SERVER_PORT = Number(getEnvVar("SERVER_PORT"));
export const SESSION_SECRET = getEnvVar("SESSION_SECRET");
export const SES_FROM_EMAIL = getEnvVar("SES_FROM_EMAIL");
export const UI_PORT = Number(getEnvVar("UI_PORT"));
