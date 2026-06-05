import "./polyfill.js";
import { VITE_API_HOST, SERVER_PORT } from "./config/env.js";
import { dbDir, mediaDir, thumbnailsDir } from "./config/paths.js";
import { maybeRestoreDbFromLatestS3BackupOnStartup } from "./s3/startup-db-restore.js";
import {
  ensureServerDirectories,
  runServerStartedTasks,
  runStartupMaintenance,
} from "./bootstrap/startup-tasks.js";
import { createConfiguredApp } from "./bootstrap/server.js";
import {
  attachActivityWebSocket,
  broadcastActivity,
} from "./activity/broadcast.js";
import { setIndexJobChangeListener } from "./indexing/job-store.js";
import { logger } from "./logger.js";
import { setSyncChangeListener } from "./s3/sync-state.js";

ensureServerDirectories({ mediaDir, dbDir, thumbnailsDir });

// Must happen before any DB modules are imported (DB opens at first `getDb()` call).
await maybeRestoreDbFromLatestS3BackupOnStartup();

runStartupMaintenance();

const app = createConfiguredApp();

setIndexJobChangeListener(() => broadcastActivity());
setSyncChangeListener(() => broadcastActivity());
attachActivityWebSocket(app);

app.listen(SERVER_PORT, "0.0.0.0", () => {
  logger.info({ host: VITE_API_HOST, port: SERVER_PORT }, "Server listening");
  runServerStartedTasks();
});

app.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      { port: SERVER_PORT },
      "Port already in use; stop the other process or change SERVER_PORT",
    );
  }

  logger.error({ err }, "Server startup error");

  process.exit(1);
});
