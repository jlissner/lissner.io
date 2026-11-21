import { createRequire } from "node:module";
import { access, constants } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cookbookRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rtlDir = path.join(
  cookbookRoot,
  "node_modules",
  "@testing-library",
  "react",
);

const isNestedReact17 = async () => {
  try {
    await access(rtlDir, constants.R_OK);
    const require = createRequire(path.join(rtlDir, "package.json"));
    const reactDomPath = require.resolve("react-dom");
    const { version } = require(
      path.join(path.dirname(reactDomPath), "package.json"),
    );
    return version.startsWith("17.");
  } catch {
    return false;
  }
};

if (await isNestedReact17()) {
  process.exit(0);
}

const result = spawnSync(
  "npm",
  [
    "install",
    "@testing-library/react@8.0.9",
    "--no-workspaces",
    "--no-package-lock",
    "--no-save",
  ],
  { cwd: cookbookRoot, stdio: "inherit" },
);

process.exit(result.status ?? 1);
