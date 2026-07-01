import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sharedRoot = path.join(repoRoot, "shared/dist/src");

function resolveShared(specifier) {
  if (specifier === "@shared") {
    return pathToFileURL(path.join(sharedRoot, "index.js")).href;
  }
  if (specifier.startsWith("@shared/")) {
    const subpath = specifier.slice("@shared/".length).replace(/\.js$/, "");
    return pathToFileURL(path.join(sharedRoot, `${subpath}.js`)).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const url = resolveShared(specifier);
  if (url != null) {
    return { shortCircuit: true, url };
  }
  return nextResolve(specifier, context);
}
