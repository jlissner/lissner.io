import { applyNodeRuntimeCompat } from "./bootstrap/runtime-compat.js";
import { createConfiguredApp, createConfiguredHttpServer } from "./bootstrap/server.js";
import { ensureServerDirectories, runServerStartedTasks, runStartupMaintenance } from "./bootstrap/startup-tasks.js";
import { attachActivityWebSocket, broadcastActivity } from "./activity/broadcast.js";
import { setIndexJobChangeListener } from "./indexing/job-store.js";
import { getS3Config, setSyncChangeListener } from "./s3/sync.js";
import { PORT } from "./config/env.js";
import { dbDir, mediaDir, thumbnailsDir, uiDistDir } from "./config/paths.js";
import { logger } from "./logger.js";

applyNodeRuntimeCompat();
ensureServerDirectories({ mediaDir, dbDir, thumbnailsDir });
const app = createConfiguredApp(uiDistDir);
runStartupMaintenance();
const server = createConfiguredHttpServer(app);

setIndexJobChangeListener(() => broadcastActivity());
setSyncChangeListener(() => broadcastActivity());
attachActivityWebSocket(server);

server.listen(PORT, () => {
  logger.info({ port: PORT }, "Server listening");
  runServerStartedTasks();

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
