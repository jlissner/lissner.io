#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sharedHook = path.join(repoRoot, "scripts/resolve-shared.mjs");
const tsxCli = path.join(repoRoot, "node_modules/tsx/dist/cli.mjs");
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
  [tsxCli, "watch", "--import", sharedHook, "server/src/index.ts"],
  { cwd: repoRoot, stdio: "inherit" },
);
process.exit(watch.status ?? 0);
