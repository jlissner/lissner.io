import { existsSync } from "fs";
import path from "path";
import { createServer } from "node:http";
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
} from "../routes/index.js";
import { requireAuth, jwtMiddleware } from "../auth/middleware.js";
import { errorHandler } from "../middleware/error-handler.js";
import { logRequests } from "../middleware/logRequests.js";

export function createConfiguredApp(uiDistDir: string) {
  const app = express();

  app.set("trust proxy", true);
  app.get("/health", (_req, res) => {
    res.status(200).type("text/plain").send("ok");
  });

  app.use(logRequests);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(jwtMiddleware());

  app.use("/api/auth", authRouter);
  app.use("/api/admin", requireAuth, adminRouter);
  app.use("/api/activity", requireAuth, activityRouter);
  app.use("/api/media", requireAuth, mediaRouter);
  app.use("/api/people", requireAuth, peopleRouter);
  app.use("/api/search", requireAuth, searchRouter);
  app.use("/api/backup", requireAuth, backupRouter);

  if (existsSync(uiDistDir)) {
    app.use(express.static(uiDistDir));
    app.get("/{*any}", (_req, res) =>
      res.sendFile(path.join(uiDistDir, "index.html")),
    );
  }

  app.use(errorHandler);

  const server = createServer(app);

  // allow large uploads to continue for up to 30 minutes
  const TIMEOUT = 1000 * 60 * 30; // 30 minutes

  server.requestTimeout = TIMEOUT;
  server.headersTimeout = TIMEOUT;

  return server;
}
