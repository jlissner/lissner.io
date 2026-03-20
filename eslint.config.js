import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/dist-types/**", "**/node_modules/**", "**/*.min.*"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  {
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  {
    files: ["server/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ["ui/**/*.{ts,tsx}"],
    ...react.configs.flat.recommended,
    ...react.configs.flat["jsx-runtime"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: { project: "./ui/tsconfig.json" },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // TypeScript replaces PropTypes; many valid patterns still use setState in effects.
      "react/prop-types": "off",
      "react-hooks/set-state-in-effect": "off",
      // Experimental; false positives on DOM props like naturalWidth (looks like ref access).
      "react-hooks/refs": "off",
      /** Bulletproof-style layering: shared + config never depend on app/features; features never depend on app. */
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./ui/src/features",
              from: "./ui/src/app",
              message:
                "Features must not import the app shell. Compose routes/providers in app/ only.",
            },
            {
              target: "./ui/src/components",
              from: "./ui/src/features",
              message: "Shared components must not import feature code (avoid upward deps).",
            },
            {
              target: "./ui/src/components",
              from: "./ui/src/app",
              message: "Shared components must not import the app shell.",
            },
            {
              target: "./ui/src/config",
              from: "./ui/src/features",
              message: "Config must not import feature code.",
            },
            {
              target: "./ui/src/config",
              from: "./ui/src/app",
              message: "Config must not import the app shell.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["shared/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  }
);
