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
import { corsStrictHttpsEnabled, isAllowedLissnerCorsOrigin } from "@shared";

export function createConfiguredApp() {
  const app = express();

  app.set("trust proxy", true);
  app.get("/health", (_req, res) => {
    res.status(200).type("text/plain").send("ok");
  });

  app.use(logRequests);
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        const strict = corsStrictHttpsEnabled();
        if (!strict) {
          callback(null, true);
          return;
        }
        if (origin === undefined) {
          callback(null, true);
          return;
        }
        if (isAllowedLissnerCorsOrigin(origin, true)) {
          callback(null, origin);
          return;
        }
        callback(null, false);
      },
    }),
  );
  app.use(express.json());
  app.use(jwtMiddleware());

  app.use("/auth", authRouter);
  app.use("/admin", requireAuth, adminRouter);
  app.use("/activity", requireAuth, activityRouter);
  app.use("/media", requireAuth, mediaRouter);
  app.use("/people", requireAuth, peopleRouter);
  app.use("/search", requireAuth, searchRouter);
  app.use("/backup", requireAuth, backupRouter);

  app.use(errorHandler);

  const server = createServer(app);

  // allow large uploads to continue for up to 30 minutes
  const TIMEOUT = 1000 * 60 * 30; // 30 minutes

  server.requestTimeout = TIMEOUT;
  server.headersTimeout = TIMEOUT;

  return server;
}
