import path from "node:path";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const hooks = pathToFileURL(
  path.join(repoRoot, "scripts/resolve-shared-hooks.mjs"),
).href;

register(hooks, import.meta.url);
