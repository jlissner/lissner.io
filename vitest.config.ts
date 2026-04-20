import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/src/**/*.test.ts"],
    /** Quiet TensorFlow native INFO logs when tests import `faces` → tfjs-node. */
    env: {
      TF_CPP_MIN_LOG_LEVEL: "3",
      TF_ENABLE_ONEDNN_OPTS: "0",
      SERVER_HOST: "localhost",
    },
    /** Suppress Node DEP0169 from a transitive `url.parse()` user (tfjs dependency chain). */
    execArgv: ["--disable-warning=DEP0169"],
  },
});
