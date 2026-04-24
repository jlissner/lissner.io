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

function getEnvVar(name: string) {
  const val = process.env[name];

  invariant(val, `${name} not set`);

  return val;
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
export const S3_BUCKET = getEnvVar("S3_BUCKET");
export const SERVER_HOST = getEnvVar("SERVER_HOST");
export const SERVER_PORT = Number(getEnvVar("SERVER_PORT"));
export const SERVER_PROTOCOL = getEnvVar("SERVER_PROTOCOL");
export const SESSION_SECRET = getEnvVar("SESSION_SECRET");
export const SES_FROM_EMAIL = getEnvVar("SES_FROM_EMAIL");
export const UI_PORT = Number(getEnvVar("UI_PORT"));
