import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { AspectRatio } from "@/components/ui/aspect-ratio"

const photo =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#a1a1aa"/><stop offset="1" stop-color="#27272a"/></linearGradient></defs><rect width="1" height="1" fill="url(#g)"/></svg>'
  )

const meta = {
  title: "Components/Aspect Ratio",
  component: AspectRatio,
  args: { ratio: 16 / 9 },
  render: (args) => (
    <div className="w-sm">
      <AspectRatio {...args} className="rounded-lg bg-muted">
        <img
          src={photo}
          alt="Gradient placeholder"
          className="size-full rounded-lg object-cover dark:brightness-50"
        />
      </AspectRatio>
    </div>
  ),
} satisfies Meta<typeof AspectRatio>

export default meta
type Story = StoryObj<typeof meta>

export const Widescreen: Story = {
  name: "16:9",
  play: async ({ canvas }) => {
    const { width, height } = canvas
      .getByRole("img")
      .parentElement!.getBoundingClientRect()
    await expect(width / height).toBeCloseTo(16 / 9, 1)
  },
}

export const Ultrawide: Story = { name: "21:9", args: { ratio: 21 / 9 } }

export const Square: Story = {
  name: "1:1",
  args: { ratio: 1 },
  play: async ({ canvas }) => {
    const { width, height } = canvas
      .getByRole("img")
      .parentElement!.getBoundingClientRect()
    await expect(width).toBeCloseTo(height, 0)
  },
}

export const Portrait: Story = { name: "9:16", args: { ratio: 9 / 16 } }
