import { existsSync, mkdirSync } from "fs";
import path from "path";

// Node 23+ removed/deprecated util helpers; tfjs-node and deps still use them
import util from "util";
type UtilWithCompat = typeof util & {
  isNullOrUndefined?: (v: unknown) => boolean;
  isArray?: (v: unknown) => boolean;
};
const utilCompat = util as UtilWithCompat;
if (typeof utilCompat.isNullOrUndefined !== "function") {
  utilCompat.isNullOrUndefined = (v: unknown) => v === null || v === undefined;
}
// Override deprecated util.isArray to silence deprecation from tfjs deps
utilCompat.isArray = Array.isArray;

import { createServer } from "node:http";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import express from "express";
import {
  activityRouter,
  adminRouter,
  authRouter,
  backupRouter,
  mediaRouter,
  peopleRouter,
  searchRouter,
} from "./routes/index.js";
import {
  sessionMiddleware,
  requireAuth,
  impersonateFirstAdminWhenAuthDisabled,
} from "./auth/middleware.js";
import { attachActivityWebSocket, broadcastActivity } from "./activity/broadcast.js";
import { setIndexJobChangeListener } from "./indexing/job-store.js";
import { getS3Config, setSyncChangeListener } from "./s3/sync.js";
import * as authDb from "./db/auth.js";
import * as db from "./db/media.js";
import { PORT } from "./config/env.js";
import { deleteOrphanedLocalThumbnailFiles } from "./lib/orphan-thumbnails.js";
import { dbDir, mediaDir, thumbnailsDir, uiDistDir } from "./config/paths.js";
import { errorHandler } from "./middleware/error-handler.js";
import { logger, requestLogger } from "./logger.js";

mkdirSync(mediaDir, { recursive: true });
mkdirSync(dbDir, { recursive: true });
mkdirSync(thumbnailsDir, { recursive: true });

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(requestLogger);
app.use(express.json());
app.use(sessionMiddleware());
app.use(impersonateFirstAdminWhenAuthDisabled);

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

const requireAuthUnlessDisabled = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.AUTH_ENABLED !== "true") return next();
  requireAuth(req, res, next);
};

app.use("/api/activity", requireAuthUnlessDisabled, activityRouter);
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

app.use(errorHandler);

try {
  db.migrateNullOwnersToDefault(authDb.getDefaultOwnerId);
} catch (err) {
  logger.error({ err }, "[db] migrateNullOwnersToDefault failed (continuing startup)");
}
try {
  db.relinkAllMotionPairs();
} catch (err) {
  logger.error({ err }, "[db] relinkAllMotionPairs failed (continuing startup)");
}

const server = createServer(app);

setIndexJobChangeListener(() => broadcastActivity());
setSyncChangeListener(() => broadcastActivity());
attachActivityWebSocket(server);

server.listen(PORT, () => {
  logger.info({ port: PORT }, "Server listening");

  void deleteOrphanedLocalThumbnailFiles().then((removed) => {
    if (removed > 0) {
      logger.info({ removed }, "[thumbnails] Removed orphaned local thumbnail files");
    }
  });

  const s3 = getS3Config();
  if (!s3.configured) {
    logger.warn(
      { missingVars: s3.missingVars },
      "S3 backup not configured; set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET to enable sync"
    );
  }
});
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      { port: PORT, err },
      "Port already in use; stop the other process or change PORT (and the /api proxy in ui/vite.config.ts)"
    );
  } else {
    logger.error({ err }, "Server listen error");
  }
  process.exit(1);
});
