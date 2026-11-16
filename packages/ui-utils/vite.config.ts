import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** SPA library: only `VITE_*` may reach client code — never secrets from config/.env*. */
export default defineConfig({
  envPrefix: "VITE_",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@lissner/shared": path.resolve(__dirname, "../shared/src"),
      "@lissner/ui-utils": path.resolve(__dirname, "../ui-utils/src"),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "ui-utils",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@tanstack/react-query",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
