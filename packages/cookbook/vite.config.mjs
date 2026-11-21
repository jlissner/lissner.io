import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, transformWithOxc } from "vite";
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

export default defineConfig(({ mode }) => ({
  root: __dirname,
  plugins: [react(), jsxInJs()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  resolve: {
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: { ".js": "jsx" },
    },
  },
}));
