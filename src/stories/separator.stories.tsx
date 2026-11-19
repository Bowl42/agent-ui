import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { Separator } from "@/components/ui/separator"

const meta = {
  title: "Components/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <div className="flex w-sm flex-col gap-4 text-sm">
      <div className="flex flex-col gap-1">
        <div className="leading-none font-medium">agentui</div>
        <div className="text-muted-foreground">
          Components for agent workspaces
        </div>
      </div>
      <Separator />
      <div>
        A set of components that you can customize, extend, and build on.
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("separator")).toHaveAttribute(
      "aria-orientation",
      "horizontal"
    )
  },
}

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-4 text-sm">
      <div>Chats</div>
      <Separator orientation="vertical" />
      <div>Agents</div>
      <Separator orientation="vertical" />
      <div>Tools</div>
    </div>
  ),
  play: async ({ canvas }) => {
    for (const separator of canvas.getAllByRole("separator")) {
      await expect(separator).toHaveAttribute("aria-orientation", "vertical")
    }
  },
}

export const VerticalMenu: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex flex-col gap-1">
        <span className="font-medium">Settings</span>
        <span className="text-xs text-muted-foreground">
          Manage preferences
        </span>
      </div>
      <Separator orientation="vertical" />
      <div className="flex flex-col gap-1">
        <span className="font-medium">Account</span>
        <span className="text-xs text-muted-foreground">
          Profile & security
        </span>
      </div>
      <Separator orientation="vertical" />
      <div className="flex flex-col gap-1">
        <span className="font-medium">Help</span>
        <span className="text-xs text-muted-foreground">Support & docs</span>
      </div>
    </div>
  ),
}

export const InList: Story = {
  render: () => (
    <div className="flex w-xs flex-col gap-2 text-sm">
      {[
        ["Model", "claude-opus"],
        ["Tools", "12"],
        ["Runs", "348"],
      ].map(([term, value], index) => (
        <div key={term} className="flex flex-col gap-2">
          {index > 0 && <Separator />}
          <dl className="flex items-center justify-between">
            <dt>{term}</dt>
            <dd className="text-muted-foreground">{value}</dd>
          </dl>
        </div>
      ))}
    </div>
  ),
}
