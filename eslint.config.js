import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dist-types/**",
      "**/node_modules/**",
      "**/*.min.*",
    ],
  },

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
      "@typescript-eslint/no-import-type-side-effects": "warn",
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },

  {
    files: ["scripts/**/*.{ts,mjs}"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-console": "off",
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
    files: ["server/**/*.ts"],
    rules: {
      "no-console": "error",
    },
  },

  {
    files: ["server/**/*.ts"],
    ignores: ["server/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[computed=false][object.object.name='process'][object.property.name='env'][property.name!=/^(NODE_ENV|BDD_.*|DATA_EXPLORER_ENABLED)$/]",
          message:
            "Read validated config from server/src/config/env.ts, not process.env directly. NODE_ENV, BDD_* test stubs, and explorer flags are the only allowed direct reads.",
        },
      ],
    },
  },

  {
    files: ["ui/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: { project: "./ui/tsconfig.json" },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",
      // Experimental; false positives on DOM props like naturalWidth (looks like ref access).
      "react-hooks/refs": "off",
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
  },
);
