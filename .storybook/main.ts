import type { StorybookConfig } from "@storybook/react-vite"

// Storybook builds with the project's vite.config.ts (React, Tailwind, `@/`).
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: "@storybook/react-vite",
}

export default config
