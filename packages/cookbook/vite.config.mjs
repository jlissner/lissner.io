import { existsSync, readFileSync } from "fs";
import path from "path";
import { parse as parseDotenv } from "dotenv";
import { fileURLToPath } from "url";
import { defineConfig, transformWithOxc, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const configDir = path.join(repoRoot, "config");

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, "");
  const isProd = mode === "production";

  if (isProd) {
    const prodPath = path.join(configDir, ".env.prod");
    if (existsSync(prodPath)) {
      Object.assign(env, parseDotenv(readFileSync(prodPath)));
    }
  }

  if (!env.VITE_GRAPHQL_HOST) {
    throw new Error("Missing required VITE_GRAPHQL_HOST env variable");
  }

  const viteGraphqlHost = `http${isProd ? "s" : ""}://${env.VITE_GRAPHQL_HOST}`;

  return {
    root: __dirname,
    envDir: configDir,
    plugins: [react(), jsxInJs()],
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "import.meta.env.VITE_GRAPHQL_HOST": JSON.stringify(viteGraphqlHost),
    },
    resolve: {
      alias: {
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        "@material-ui/icons": path.resolve(
          __dirname,
          "node_modules/@material-ui/icons/esm",
        ),
      },
    },
    optimizeDeps: {
      rolldownOptions: {
        moduleTypes: { ".js": "jsx" },
      },
    },
  };
});
