import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight02Icon,
  FloppyDiskIcon,
} from "@hugeicons/core-free-icons"
import { expect, screen, userEvent, waitFor } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const meta = {
  title: "Components/Kbd",
  component: Kbd,
  args: { children: "⌘K" },
} satisfies Meta<typeof Kbd>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Basic: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd>Ctrl</Kbd>
      <Kbd>⌘K</Kbd>
      <Kbd>Ctrl + B</Kbd>
    </div>
  ),
}

export const Group: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>Ctrl</Kbd>
      <Kbd>Shift</Kbd>
      <Kbd>P</Kbd>
    </KbdGroup>
  ),
}

export const ArrowKeys: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd>↑</Kbd>
      <Kbd>↓</Kbd>
      <Kbd>←</Kbd>
      <Kbd>→</Kbd>
    </div>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        Left
      </Kbd>
      <Kbd>
        Right
        <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} />
      </Kbd>
    </KbdGroup>
  ),
}

export const InInputGroup: Story = {
  render: () => (
    <InputGroup className="w-xs">
      <InputGroupInput aria-label="Message" placeholder="Send a message" />
      <InputGroupAddon align="inline-end">
        <Kbd>⏎</Kbd>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const InTooltip: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={<Button size="icon-sm" variant="outline" aria-label="Save" />}
      >
        <HugeiconsIcon icon={FloppyDiskIcon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent className="pe-1.5">
        <div className="flex items-center gap-2">
          Save changes <Kbd>S</Kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Save" })).toHaveFocus()
    const content = await screen.findByText("Save changes")
    await waitFor(() => expect(content).toBeVisible())
    await userEvent.keyboard("{Escape}")
  },
}

export const WithSamp: Story = {
  render: () => (
    <Kbd>
      <samp>File</samp>
    </Kbd>
  ),
}
