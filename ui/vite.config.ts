import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseDotenv } from "dotenv";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const repoRoot = path.join(__dirname, "..");
  const env = loadEnv(mode, repoRoot, "");
  if (mode === "production") {
    const prodPath = path.join(repoRoot, ".env.prod");
    if (existsSync(prodPath)) {
      Object.assign(env, parseDotenv(readFileSync(prodPath)));
    }
  }
  const apiPort = env.SERVER_PORT;
  const apiProxyTarget =
    env.API_PROXY_TARGET?.trim() || `http://${env.SERVER_HOST?.trim() || "127.0.0.1"}:${apiPort}`;
  const uiPortRaw = env.UI_PORT ?? env.VITE_DEV_SERVER_PORT ?? "8042";
  const devPortParsed = parseInt(uiPortRaw, 10);
  const devPort =
    Number.isFinite(devPortParsed) && devPortParsed > 0 && devPortParsed < 65536
      ? devPortParsed
      : 8042;

  return {
    root: __dirname,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    plugins: [react()],
    server: {
      port: devPort,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          timeout: 0,
          proxyTimeout: 0,
        },
        "/ws": {
          target: apiProxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
