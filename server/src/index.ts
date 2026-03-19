import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";
import path from "path";

// Load .env and .env.local (local overrides)
config();
const envLocal = path.join(process.cwd(), ".env.local");
if (existsSync(envLocal)) {
  config({ path: envLocal, override: true });
}

// Node 23+ removed/deprecated util helpers; tfjs-node and deps still use them
import util from "util";
if (typeof (util as any).isNullOrUndefined !== "function") {
  (util as any).isNullOrUndefined = (v: unknown) => v === null || v === undefined;
}
// Override deprecated util.isArray to silence deprecation from tfjs deps
(util as any).isArray = Array.isArray;

import cors from "cors";
import express from "express";
import { fileURLToPath } from "url";
import { mediaRouter } from "./routes/media.js";
import { peopleRouter } from "./routes/people.js";
import { searchRouter } from "./routes/search.js";
import { backupRouter } from "./routes/backup.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { sessionMiddleware, requireAuth, impersonateFirstAdminWhenAuthDisabled } from "./auth.js";
import { getS3Config } from "./s3-sync.js";
import * as authDb from "./auth-db.js";
import * as db from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../../data");
const uiDistDir = path.join(__dirname, "../../ui/dist");
mkdirSync(path.join(dataDir, "media"), { recursive: true });
mkdirSync(path.join(dataDir, "db"), { recursive: true });
mkdirSync(path.join(dataDir, "thumbnails"), { recursive: true });

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware());
app.use(impersonateFirstAdminWhenAuthDisabled);

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

const requireAuthUnlessDisabled = (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  if (process.env.AUTH_ENABLED !== "true") return next();
  requireAuth(req, res, next);
};

app.use("/api/media", requireAuthUnlessDisabled, mediaRouter);
app.use("/api/people", requireAuthUnlessDisabled, peopleRouter);
app.use("/api/search", requireAuthUnlessDisabled, searchRouter);
app.use("/api/backup", requireAuthUnlessDisabled, backupRouter);

if (existsSync(uiDistDir)) {
  app.use(express.static(uiDistDir));
  // Express 5 / path-to-regexp v8: unnamed "*" is invalid; use a named splat for SPA fallback
  app.get("/{*any}", (_req, res) => res.sendFile(path.join(uiDistDir, "index.html")));
} else {
  app.get("/", (_req, res) => res.send("Hello world"));
}

try {
  db.migrateNullOwnersToDefault(authDb.getDefaultOwnerId);
} catch (err) {
  console.error("[db] migrateNullOwnersToDefault failed (continuing startup):", err);
}

const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

  const s3 = getS3Config();
  if (!s3.configured) {
    console.warn(
      "\n⚠ S3 backup not configured. Missing:",
      s3.missingVars.join(", ")
    );
    console.warn(
      "  Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET to enable S3 sync.\n"
    );
  }
});
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n✖ Port ${PORT} is already in use. Stop the other process using it, or change PORT in server/src/index.ts (and the /api proxy in ui/vite.config.ts).\n`
    );
  } else {
    console.error("Server listen error:", err);
  }
  process.exit(1);
});
