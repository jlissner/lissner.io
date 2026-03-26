import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Match server: avoid proxy socket/request timeouts on very large uploads during dev.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
      "/ws": {
        target: "http://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
