#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tsxCli = path.join(repoRoot, "node_modules/tsx/dist/cli.mjs");
const tsxWatchArgs = process.argv.slice(2);

if (tsxWatchArgs.length === 0) {
  console.error("usage: dev-watch.mjs <tsx watch args...>");
  process.exit(1);
}

const envFiles = [".env.local", ".env"].map((name) =>
  path.join(repoRoot, name),
);

const startTsxWatch = () =>
  spawn(process.execPath, [tsxCli, "watch", ...tsxWatchArgs], {
    cwd: repoRoot,
    stdio: "inherit",
  });

const debounce = (callback, delayMs) => {
  const state = { timeoutId: null };
  return () => {
    if (state.timeoutId != null) {
      clearTimeout(state.timeoutId);
    }
    state.timeoutId = setTimeout(callback, delayMs);
  };
};

const watcher = { child: startTsxWatch(), restarting: false };

const attachExitHandler = (proc) => {
  proc.on("exit", (code, signal) => {
    if (watcher.restarting) {
      return;
    }

    if (signal == null && code != null && code !== 0) {
      process.exit(code);
    }
  });
};

attachExitHandler(watcher.child);

const restartTsxWatch = debounce(() => {
  if (watcher.restarting) {
    return;
  }

  watcher.restarting = true;
  watcher.child.once("exit", () => {
    watcher.child = startTsxWatch();
    attachExitHandler(watcher.child);
    watcher.restarting = false;
  });
  watcher.child.kill("SIGTERM");
}, 150);

for (const envFile of envFiles) {
  if (!existsSync(envFile)) {
    continue;
  }

  watch(envFile, (eventType) => {
    if (eventType === "change") {
      restartTsxWatch();
    }
  });
}

const stop = (signal) => {
  watcher.child.kill(signal);
};

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
