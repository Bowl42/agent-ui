import { addons } from "storybook/manager-api"
import { create } from "storybook/theming"

// The published Storybook's name, linking to the repository.
addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "agent-ui",
    brandUrl: "https://github.com/Bowl42/agent-ui",
  }),
})
