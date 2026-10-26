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

const host = process.env.POSTGRES_HOST?.trim() || "127.0.0.1";
const port = process.env.POSTGRES_PORT?.trim() || "5433";

/** Local Compose URL. Does not use GraphQL `DATABASE_URL` (may still be RDS). */
export const localUrl = (database: "lissner" | "media"): string => {
  const override =
    database === "media"
      ? process.env.MEDIA_DATABASE_URL?.trim()
      : process.env.LOCAL_DATABASE_URL?.trim();
  if (override) return override;
  const user = encodeURIComponent(requireEnv("POSTGRES_USER"));
  const pass = encodeURIComponent(requireEnv("POSTGRES_PASSWORD"));
  return `postgres://${user}:${pass}@${host}:${port}/${database}?sslmode=disable`;
};

export const mediaDatabaseUrl = (): string => localUrl("media");
export const lissnerDatabaseUrl = (): string => localUrl("lissner");

export const sqliteDbPath = (): string => {
  const raw = process.env.DATA_DIR ?? "data";
  const dataDir = path.isAbsolute(raw) ? raw : path.resolve(repoRoot, raw);
  return path.join(dataDir, "db", "media.db");
};

export { repoRoot };
