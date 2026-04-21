import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseDotenv } from "dotenv";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon-192.png", "icon-512.png"],
        manifest: {
          name: "Family Media Manager",
          short_name: "Family Media",
          description: "Manage and share family photos",
          theme_color: "#1e293b",
          background_color: "#1e293b",
          display: "standalone",
          orientation: "any",
          start_url: "/",
          icons: [
            {
              src: "icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
          share_target: {
            action: "/share-target",
            method: "POST",
            enctype: "multipart/form-data",
            params: {
              files: [
                {
                  name: "files",
                  accept: ["image/*", "video/*"],
                },
              ],
            },
          },
          categories: ["photo", "social", "utilities"],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
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
