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
  const viteApiHost = env.VITE_API_HOST;
  const apiPort = env.SERVER_PORT;
  const apiProxy = {
    target: `http://${viteApiHost}:${apiPort}`,
    changeOrigin: true,
    timeout: 0,
    proxyTimeout: 0,
    rewrite: (path: string) => path.replace(/^\/api/, ""),
  };

  const graphqlHost = env.VITE_GRAPHQL_HOST;
  const graphqlPort = env.VITE_GRAPHQL_PORT;
  const graphqlProxy = {
    target: `http://${graphqlHost}:${graphqlPort}`,
    changeOrigin: true,
    timeout: 0,
    proxyTimeout: 0,
    rewrite: (path: string) => path.replace(/^\/graphql/, ""),
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
        "@lissner/ui-utils": path.resolve(__dirname, "../ui-utils/src"),
      },
    },
    plugins: [react()],
    server: {
      port: Number(env.VITE_ADMIN_UI_PORT),
      proxy: {
        "/api": apiProxy,
        "/graphql": graphqlProxy,
      },
    },
  };
});
