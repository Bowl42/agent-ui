import js from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import storybook from "eslint-plugin-storybook"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

// shadcn's Vite template config, plus Storybook's rules for stories.
export default defineConfig([
  globalIgnores([
    "dist",
    "public/r",
    "storybook-static",
    ".vitest",
    ".claude/worktrees",
    ".claude/skills",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "scripts/**",
      "*.config.ts",
      "vitest.firefox.ts",
      ".storybook/main.ts",
    ],
    languageOptions: { globals: globals.node },
  },
  storybook.configs["flat/recommended"],
])
