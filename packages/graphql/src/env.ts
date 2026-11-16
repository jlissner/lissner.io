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

const VITE_GRAPHQL_DATABASE_NAME = getEnvVar("VITE_GRAPHQL_DATABASE_NAME");
const EXPOSED_POSTGRES_HOST = getEnvVar("EXPOSED_POSTGRES_HOST");
const EXPOSED_POSTGRES_PORT = getEnvVar("EXPOSED_POSTGRES_PORT");
const POSTGRES_PASSWORD = getEnvVar("POSTGRES_PASSWORD");
const POSTGRES_USER = getEnvVar("POSTGRES_USER");

export const DATABASE_URL = (() => {
  // assertSslMode(POSTGRES_SERVER_URL, "POSTGRES_SERVER_URL");
  const url = buildDatabaseUrl({
    host: EXPOSED_POSTGRES_HOST,
    port: EXPOSED_POSTGRES_PORT,
    password: POSTGRES_PASSWORD,
    user: POSTGRES_USER,
    databaseName: VITE_GRAPHQL_DATABASE_NAME,
  });

  // assertSslMode(url, "VITE_GRAPHQL database URL");
  return url;
})();

export const VITE_GRAPHQL_PORT = Number(
  getOptionalEnvVar("VITE_GRAPHQL_PORT", "5678"),
);
export const VITE_GRAPHQL_HOST = getOptionalEnvVar(
  "VITE_GRAPHQL_HOST",
  "localhost",
);
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
