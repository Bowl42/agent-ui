import type { Decorator, Preview } from "@storybook/react-vite"
import { configure } from "storybook/test"

import "./preview.css"

// A play function's waitFor waits up to 5s, not 1s: on a loaded machine
// (a CI runner, the whole suite at once) a menu takes longer to open or
// close. Only a failing wait takes longer.
configure({ asyncUtilTimeout: 5000 })

// shadcn's convention: light by default, `dark` on <html> for dark.
const withTheme: Decorator = (Story, { globals }) => {
  document.documentElement.classList.toggle("dark", globals.theme === "dark")
  return <Story />
}

const preview: Preview = {
  decorators: [withTheme],
  // Story tests run in parallel pages; take keyboard focus before each one
  // so stories that press Tab start from this page.
  beforeEach: () => {
    window.focus()
  },
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  // The storybook-dark test project sets VITE_STORY_THEME to "dark".
  initialGlobals: { theme: import.meta.env.VITE_STORY_THEME ?? "light" },
  parameters: {
    // Accessibility violations fail the story's test, not just the panel.
    a11y: {
      test: "error",
      // Base UI's focus guards around an open popup are hidden from everyone
      // but get role="button" in WebKit; axe then reports them as unnamed.
      context: { include: ["body"], exclude: ["[data-base-ui-focus-guard]"] },
    },
    layout: "centered",
  },
}

export default preview
