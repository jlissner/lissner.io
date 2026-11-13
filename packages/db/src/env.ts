import { buildDatabaseUrl } from "@lissner/shared";
import { config } from "dotenv";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const loadEnvFile = (filePath: string): void => {
  if (!existsSync(filePath)) return;
  // Do not override vars already set in the process environment
  config({ path: filePath, override: false });
};

loadEnvFile(path.join(repoRoot, "config", ".env"));
if (process.env.NODE_ENV === "production") {
  loadEnvFile(path.join(repoRoot, "config", ".env.prod"));
} else {
  loadEnvFile(path.join(repoRoot, "config", ".env.local"));
  loadEnvFile(path.join(repoRoot, "config", ".env.prod"));
}

const requireEnv = (name: string): string => {
  const val = process.env[name]?.trim();
  if (!val) {
    throw new Error(
      `${name} is required. Set it in config/.env.local or config/.env.prod (gitignored).`,
    );
  }
  return val;
};

/** Host-side scripts talk to the published bind (INTERNAL_*), not Compose DNS. */
const host = (): string =>
  process.env.INTERNAL_POSTGRES_HOST?.trim() || "127.0.0.1";
const port = (): string => process.env.INTERNAL_POSTGRES_PORT?.trim() || "5432";

const graphqlDatabaseName = (): string =>
  process.env.VITE_GRAPHQL_DATABASE_NAME?.trim() || "lissner";

const mediaDatabaseName = (): string =>
  process.env.MEDIA_DATABASE_NAME?.trim() || "media";

/**
 * Local / app Postgres URL for a named database (host tools / migrations).
 * Uses POSTGRES_USER/PASSWORD + INTERNAL_POSTGRES_* + VITE_GRAPHQL_/MEDIA_DATABASE_NAME.
 */
export const localUrl = (kind: "lissner" | "media"): string => {
  const dbName = kind === "media" ? mediaDatabaseName() : graphqlDatabaseName();
  const user = encodeURIComponent(requireEnv("POSTGRES_USER"));
  const pass = encodeURIComponent(requireEnv("POSTGRES_PASSWORD"));
  return `postgres://${user}:${pass}@${host()}:${port()}/${dbName}?sslmode=disable`;
};

export const mediaDatabaseUrl = (): string => localUrl("media");
export const lissnerDatabaseUrl = (): string => localUrl("lissner");

export { buildDatabaseUrl, repoRoot };
