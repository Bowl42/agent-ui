import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent } from "storybook/test"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const meta = {
  title: "Components/Switch",
  component: Switch,
  args: { onCheckedChange: fn() },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Field orientation="horizontal">
      <Switch id="switch-airplane" {...args} />
      <FieldLabel htmlFor="switch-airplane">Airplane mode</FieldLabel>
    </Field>
  ),
  play: async ({ args, canvas }) => {
    const toggle = canvas.getByRole("switch", { name: "Airplane mode" })
    await userEvent.tab()
    await expect(toggle).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(toggle).toBeChecked()
    await expect(args.onCheckedChange).toHaveBeenCalledOnce()
    await userEvent.keyboard("{Enter}")
    await expect(toggle).not.toBeChecked()
  },
}

/** The whole card is the label, so clicking anywhere on it toggles. */
export const WithDescription: Story = {
  render: (args) => (
    <FieldLabel htmlFor="switch-auto-approve" className="w-96">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>Auto-approve read-only tools</FieldTitle>
          <FieldDescription>
            Tools that cannot change files or send data run without asking.
          </FieldDescription>
        </FieldContent>
        <Switch id="switch-auto-approve" {...args} />
      </Field>
    </FieldLabel>
  ),
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("switch", {
      name: /Auto-approve read-only tools/,
    })
    await userEvent.click(canvas.getByText(/Tools that cannot change/))
    await expect(toggle).toBeChecked()
  },
}

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch id="switch-streaming" defaultChecked {...args} />
      <Label htmlFor="switch-streaming">Stream responses</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Switch id="switch-disabled-off" disabled {...args} />
        <Label htmlFor="switch-disabled-off">Disabled (unchecked)</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="switch-disabled-on" defaultChecked disabled {...args} />
        <Label htmlFor="switch-disabled-on">Disabled (checked)</Label>
      </div>
    </div>
  ),
  play: async ({ args, canvas }) => {
    const toggle = canvas.getByRole("switch", { name: "Disabled (unchecked)" })
    await userEvent.click(toggle)
    await expect(toggle).not.toBeChecked()
    await expect(args.onCheckedChange).not.toHaveBeenCalled()
  },
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Switch id="switch-size-sm" size="sm" {...args} />
        <Label htmlFor="switch-size-sm">Small</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="switch-size-default" size="default" {...args} />
        <Label htmlFor="switch-size-default">Default</Label>
      </div>
    </div>
  ),
}

/**
 * At the reader's text size (a root font size other than 16px), small or
 * large, on or off: the thumb inside its track, at its ends.
 */
export const TextSizes: Story = {
  render: (args) => (
    <div className="flex gap-4">
      <Switch aria-label="Default off" {...args} />
      <Switch aria-label="Default on" defaultChecked {...args} />
      <Switch aria-label="Small off" size="sm" {...args} />
      <Switch aria-label="Small on" size="sm" defaultChecked {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const root = document.documentElement
    const size = root.style.fontSize
    try {
      for (const fontSize of ["20.5714px", "16px", "12px"]) {
        root.style.fontSize = fontSize
        for (const name of [
          "Default off",
          "Default on",
          "Small off",
          "Small on",
        ]) {
          const track = canvas.getByRole("switch", { name })
          const thumb = track.querySelector<HTMLElement>(
            "[data-slot=switch-thumb]"
          )!
          // Once it has grown, and its thumb moved, there.
          await Promise.all(
            track
              .getAnimations({ subtree: true })
              .map((animation) => animation.finished)
          )
          const outer = track.getBoundingClientRect()
          const inner = thumb.getBoundingClientRect()
          const border = 1
          const end = name.endsWith("on")
            ? outer.right - border - inner.right
            : inner.left - (outer.left + border)
          // At its end, not past it.
          await expect(Math.abs(end), `${name} at ${fontSize}`).toBeLessThan(
            0.5
          )
          await expect(inner.top).toBeGreaterThanOrEqual(
            outer.top + border - 0.5
          )
          await expect(inner.bottom).toBeLessThanOrEqual(
            outer.bottom - border + 0.5
          )
        }
      }
    } finally {
      root.style.fontSize = size
    }
  },
}
