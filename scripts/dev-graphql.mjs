#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const devWatch = path.join(repoRoot, "scripts/dev-watch.mjs");
const sharedHook = path.join(repoRoot, "scripts/resolve-shared.mjs");
const tscCli = path.join(repoRoot, "node_modules/typescript/lib/tsc.js");

const tsc = spawnSync(process.execPath, [tscCli, "-b", "shared"], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

const watch = spawnSync(
  process.execPath,
  [devWatch, "--import", sharedHook, "graphql/src/index.ts"],
  { cwd: repoRoot, stdio: "inherit" },
);
process.exit(watch.status ?? 0);
