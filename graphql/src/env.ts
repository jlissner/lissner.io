import { config } from "dotenv";
import { existsSync } from "fs";
import path from "path";
import invariant from "tiny-invariant";

const projectRoot = path.join(import.meta.dirname, "../..");

const envFileName =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.local";
const envPath = path.join(projectRoot, envFileName);

if (existsSync(envPath)) {
  config({ path: envPath, override: true });
}

function getEnvVar(name: string): string {
  const val = process.env[name];
  invariant(val, `${name} not set`);
  return val;
}

function getOptionalEnvVar(name: string, fallback: string): string {
  const val = process.env[name];
  return val == null || val === "" ? fallback : val;
}

export const DATABASE_URL = (() => {
  const url = getEnvVar("DATABASE_URL");
  invariant(
    !/[?&]ssl=false(?:&|$)/i.test(url),
    'DATABASE_URL must not use ssl=false — pg treats it as the string "false" and still enables TLS. For local Postgres without TLS use sslmode=disable. For RDS and other hosts that require TLS use sslmode=no-verify or sslmode=verify-full with a CA.',
  );
  invariant(
    !/[?&]ssl=true(?:&|$)/i.test(url),
    "DATABASE_URL must not use ssl=true — use sslmode=no-verify for RDS, or sslmode=verify-full with the RDS CA bundle.",
  );
  return url;
})();
export const GRAPHQL_PORT = Number(getOptionalEnvVar("GRAPHQL_PORT", "5678"));
export const GRAPHQL_HOST = getOptionalEnvVar("GRAPHQL_HOST", "localhost");
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const PG_SCHEMAS = getOptionalEnvVar("PG_SCHEMAS", "public")
  .split(",")
  .map((schema) => schema.trim())
  .filter(Boolean);

/** Signs `app.jwt_token` returns from `authenticate` as `jwtToken` on mutation payloads. */
export const PG_JWT_SECRET = getOptionalEnvVar(
  "PG_JWT_SECRET",
  getOptionalEnvVar("SESSION_SECRET", ""),
);
