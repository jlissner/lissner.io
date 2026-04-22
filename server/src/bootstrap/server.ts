import { existsSync } from "fs";
import path from "path";
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
} from "../routes/index.js";
import {
  impersonateFirstAdminWhenAuthDisabled,
  requireAuth,
  jwtMiddleware,
} from "../auth/middleware.js";
import { errorHandler } from "../middleware/error-handler.js";
import { requestLogger } from "../logger.js";

export function createConfiguredApp(uiDistDir: string) {
  const app = express();
  app.set("trust proxy", true);

  app.get("/health", (_req, res) => {
    res.status(200).type("text/plain").send("ok");
  });

  app.use(cors({ origin: true, credentials: true }));
  app.use(requestLogger);
  app.use(express.json());
  app.use(jwtMiddleware());
  app.use(impersonateFirstAdminWhenAuthDisabled);

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);

  const requireAuthUnlessDisabled = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
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
    app.get("/{*any}", (_req, res) =>
      res.sendFile(path.join(uiDistDir, "index.html")),
    );
  } else {
    app.get("/", (_req, res) => res.send("Hello world"));
  }

  app.use(errorHandler);
  return app;
}

export function createConfiguredHttpServer(
  app: ReturnType<typeof createConfiguredApp>,
) {
  const server = createServer(app);
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  return server;
}
