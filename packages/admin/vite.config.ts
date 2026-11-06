import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseDotenv } from "dotenv";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const configDir = path.join(repoRoot, "config");

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, "");

  if (mode === "production") {
    const prodPath = path.join(configDir, ".env.prod");
    if (existsSync(prodPath)) {
      Object.assign(env, parseDotenv(readFileSync(prodPath)));
    }
  }
  const apiPort = env.SERVER_PORT;
  const viteApiHost = env.VITE_API_HOST.trim();
  const apiProxyTarget = `http://${viteApiHost}:${apiPort}`;
  const devPort = Number(env.ADMIN_UI_PORT);
  const apiProxy = {
    target: apiProxyTarget,
    changeOrigin: true,
    timeout: 0,
    proxyTimeout: 0,
  };

  return {
    root: __dirname,
    envDir: configDir,
    define: {
      "import.meta.env.VITE_API_HOST": JSON.stringify(viteApiHost),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@lissner/shared": path.resolve(__dirname, "../shared/src"),
      },
    },
    plugins: [react()],
    server: {
      port: devPort,
      proxy: {
        "/api": apiProxy,
      },
    },
  };
});
