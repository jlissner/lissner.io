import "./polyfill.js";
import { SERVER_HOST, SERVER_PORT } from "./config/env.js";
import { dbDir, mediaDir, thumbnailsDir, uiDistDir } from "./config/paths.js";
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
import { gray, green, red, yellow } from "yoctocolors";
import { setSyncChangeListener } from "./s3/sync-state.js";

ensureServerDirectories({ mediaDir, dbDir, thumbnailsDir });

// Must happen before any DB modules are imported (DB opens at first `getDb()` call).
await maybeRestoreDbFromLatestS3BackupOnStartup();

runStartupMaintenance();

const app = createConfiguredApp(uiDistDir);

setIndexJobChangeListener(() => broadcastActivity());
setSyncChangeListener(() => broadcastActivity());
attachActivityWebSocket(app);

app.listen(SERVER_PORT, "0.0.0.0", () => {
  console.info(`
${gray("Server listening:")}
${gray("[HOST]")} ${green(SERVER_HOST)}
${gray("[PORT]")} ${yellow(String(SERVER_PORT))}`);
  runServerStartedTasks();
});

app.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.info();
    console.error(red(`Port ${SERVER_PORT} already in use`));
    console.error(red(`stop the other process or change SERVER_PORT`));
  }

  console.info();
  console.error(red(err.stack ?? "Unknown Startup Error"));

  process.exit(1);
});
