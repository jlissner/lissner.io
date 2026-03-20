/**
 * Environment and paths — load `.env` / `.env.local` before reading `process.env`.
 * Imported first by `paths.ts` so all server modules see the same env.
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (parent of `server/`). */
export const PROJECT_ROOT = path.join(__dirname, "..", "..", "..");

config();
const envLocal = path.join(process.cwd(), ".env.local");
if (existsSync(envLocal)) {
  config({ path: envLocal, override: true });
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

const portRaw = parseInt(process.env.PORT ?? "3000", 10);
/** HTTP listen port (honours `PORT`). */
export const PORT = Number.isFinite(portRaw) && portRaw > 0 && portRaw < 65536 ? portRaw : 3000;
