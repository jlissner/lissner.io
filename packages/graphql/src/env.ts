import { buildDatabaseUrl } from "@lissner/shared";
import { config } from "dotenv";
import { existsSync } from "fs";
import path from "path";
import invariant from "tiny-invariant";

const projectRoot = path.join(import.meta.dirname, "../../..");

const envFileName =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.local";
const envPath = path.join(projectRoot, "config", envFileName);

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

const assertSslMode = (url: string, label: string): void => {
  invariant(
    !/[?&]ssl=false(?:&|$)/i.test(url),
    `${label} must not use ssl=false — pg treats it as the string "false" and still enables TLS. For local Postgres without TLS use sslmode=disable. For RDS and other hosts that require TLS use sslmode=no-verify or sslmode=verify-full with a CA.`,
  );
  invariant(
    !/[?&]ssl=true(?:&|$)/i.test(url),
    `${label} must not use ssl=true — use sslmode=no-verify for RDS, or sslmode=verify-full with the RDS CA bundle.`,
  );
};

const POSTGRES_SERVER_URL = getEnvVar("POSTGRES_SERVER_URL");
const GRAPHQL_DATABASE_NAME = getEnvVar("GRAPHQL_DATABASE_NAME");

export const DATABASE_URL = (() => {
  assertSslMode(POSTGRES_SERVER_URL, "POSTGRES_SERVER_URL");
  const url = buildDatabaseUrl(POSTGRES_SERVER_URL, GRAPHQL_DATABASE_NAME);
  assertSslMode(url, "GRAPHQL database URL");
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
