import path from "path";
import { fileURLToPath } from "url";
import { transformWithOxc } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Vite 8/Oxc rejects JSX in `.js`; CRA sources use JSX without `.jsx`. */
const jsxInJs = () => ({
  name: "jsx-in-js",
  enforce: "pre",
  async transform(code, id) {
    if (!id.endsWith(".js") || id.includes("node_modules")) {
      return null;
    }
    return transformWithOxc(code, id, {
      lang: "jsx",
      jsx: { runtime: "classic" },
    });
  },
});

const react17 = path.resolve(__dirname, "node_modules/react");
const reactDom17 = path.resolve(__dirname, "node_modules/react-dom");

export default defineConfig({
  plugins: [react(), jsxInJs()],
  resolve: {
    alias: {
      // Nested copy so CJS require('react-dom') from RTL resolves to React 17, not root 19.
      "@testing-library/react": path.resolve(
        __dirname,
        "node_modules/@testing-library/react",
      ),
      react: react17,
      "react-dom": reactDom17,
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: { ".js": "jsx" },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.js"],
  },
});
