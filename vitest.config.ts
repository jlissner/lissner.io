import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "packages/pics/src"),
      "@lissner/shared": path.resolve(__dirname, "packages/shared/src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "packages/server/src/**/*.test.ts",
      "packages/pics/src/**/*.test.ts",
      "packages/shared/src/**/*.test.ts",
      "packages/graphql/src/**/*.test.ts",
    ],
    /** Quiet TensorFlow native INFO logs when tests import `faces` → tfjs-node. */
    env: {
      TF_CPP_MIN_LOG_LEVEL: "3",
      TF_ENABLE_ONEDNN_OPTS: "0",
      API_HOST: "localhost",
    },
    /** Suppress Node DEP0169 from a transitive `url.parse()` user (tfjs dependency chain). */
    execArgv: ["--disable-warning=DEP0169"],
  },
});
