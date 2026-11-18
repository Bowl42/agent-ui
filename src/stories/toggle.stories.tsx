import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Bookmark02Icon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent } from "storybook/test"

import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  args: { onPressedChange: fn() },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    "aria-label": "Bold",
    children: <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />,
  },
  play: async ({ args, canvas }) => {
    const toggle = canvas.getByRole("button", { name: "Bold" })
    await expect(toggle).toHaveAttribute("aria-pressed", "false")
    await userEvent.tab()
    await expect(toggle).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
    await expect(args.onPressedChange).toHaveBeenLastCalledWith(
      true,
      expect.anything()
    )
    await userEvent.keyboard(" ")
    await expect(toggle).toHaveAttribute("aria-pressed", "false")
  },
}

export const Basic: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle aria-label="Bold" defaultPressed>
        <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />
      </Toggle>
      <Toggle aria-label="Italic">
        <HugeiconsIcon icon={TextItalicIcon} strokeWidth={2} />
      </Toggle>
      <Toggle aria-label="Underline">
        <HugeiconsIcon icon={TextUnderlineIcon} strokeWidth={2} />
      </Toggle>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  },
}

export const Outline: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle variant="outline">
        <HugeiconsIcon icon={TextItalicIcon} strokeWidth={2} />
        Italic
      </Toggle>
      <Toggle variant="outline">
        <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />
        Bold
      </Toggle>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle variant="outline" size="sm">
        Small
      </Toggle>
      <Toggle variant="outline" size="default">
        Default
      </Toggle>
      <Toggle variant="outline" size="lg">
        Large
      </Toggle>
    </div>
  ),
}

/** Toggles line up with buttons of the same size. */
export const WithButton: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["sm", "default", "lg"] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          <Button size={size} variant="outline">
            <HugeiconsIcon
              icon={TextBoldIcon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Button
          </Button>
          <Toggle size={size} variant="outline">
            <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />
            Toggle
          </Toggle>
        </div>
      ))}
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle disabled>Disabled</Toggle>
      <Toggle variant="outline" disabled>
        Disabled outline
      </Toggle>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Disabled outline" })
    ).toBeDisabled()
  },
}

export const WithIcon: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle aria-label="Bookmark" defaultPressed>
        <HugeiconsIcon
          icon={Bookmark02Icon}
          strokeWidth={2}
          className="group-aria-pressed/toggle:fill-foreground"
        />
      </Toggle>
      <Toggle variant="outline">
        <HugeiconsIcon
          icon={Bookmark02Icon}
          strokeWidth={2}
          className="group-aria-pressed/toggle:fill-foreground"
        />
        Bookmark
      </Toggle>
    </div>
  ),
}
