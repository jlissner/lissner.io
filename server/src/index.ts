import { SERVER_PORT } from "./config/env.js";
import { dbDir, mediaDir, thumbnailsDir, uiDistDir } from "./config/paths.js";
import { logger } from "./logger.js";
import { maybeRestoreDbFromLatestS3BackupOnStartup } from "./s3/startup-db-restore.js";

async function main(): Promise<void> {
  const {
    ensureServerDirectories,
    runServerStartedTasks,
    runStartupMaintenance,
  } = await import("./bootstrap/startup-tasks.js");

  ensureServerDirectories({ mediaDir, dbDir, thumbnailsDir });

  // Must happen before any DB modules are imported (DB opens at first `getDb()` call).
  await maybeRestoreDbFromLatestS3BackupOnStartup();

  const { createConfiguredApp, createConfiguredHttpServer } =
    await import("./bootstrap/server.js");
  const { attachActivityWebSocket, broadcastActivity } =
    await import("./activity/broadcast.js");
  const { setIndexJobChangeListener } = await import("./indexing/job-store.js");
  const { getS3Config, setSyncChangeListener } = await import("./s3/sync.js");

  const app = createConfiguredApp(uiDistDir);
  void runStartupMaintenance();
  const server = createConfiguredHttpServer(app);

  setIndexJobChangeListener(() => broadcastActivity());
  setSyncChangeListener(() => broadcastActivity());
  attachActivityWebSocket(server);

  server.listen(SERVER_PORT, "0.0.0.0", () => {
    logger.info({ port: SERVER_PORT }, "Server listening");
    runServerStartedTasks();

    const s3 = getS3Config();
    if (!s3.configured) {
      logger.warn(
        { missingVars: s3.missingVars },
        "S3 backup not configured; set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET to enable sync",
      );
    }
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        { port: SERVER_PORT, err },
        "Port already in use; stop the other process or change PORT (and API_PROXY_TARGET / SERVER_HOST for the Vite dev proxy)",
      );
    } else {
      logger.error({ err }, "Server listen error");
    }
    process.exit(1);
  });
}

void main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
