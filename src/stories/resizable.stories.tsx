import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor } from "storybook/test"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

const meta = {
  title: "Components/Resizable",
  component: ResizablePanelGroup,
  args: { orientation: "horizontal" },
} satisfies Meta<typeof ResizablePanelGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <ResizablePanelGroup
      {...args}
      className="max-w-md rounded-lg border md:min-w-md"
    >
      <ResizablePanel defaultSize="50%">
        <div className="flex h-50 items-center justify-center p-6">
          <span className="font-semibold">Chats</span>
        </div>
      </ResizablePanel>
      <ResizableHandle aria-label="Resize chats" />
      <ResizablePanel defaultSize="50%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Transcript</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
  play: async ({ canvas }) => {
    const handle = canvas.getByRole("separator", { name: "Resize chats" })
    const before = Number(handle.getAttribute("aria-valuenow"))
    await userEvent.tab()
    await expect(handle).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() =>
      expect(Number(handle.getAttribute("aria-valuenow"))).toBeGreaterThan(
        before
      )
    )
  },
}

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <ResizablePanelGroup
      {...args}
      className="min-h-50 max-w-md rounded-lg border md:min-w-md"
    >
      <ResizablePanel defaultSize="25%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Header</span>
        </div>
      </ResizablePanel>
      <ResizableHandle aria-label="Resize header" />
      <ResizablePanel defaultSize="75%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Content</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}

export const WithHandle: Story = {
  render: (args) => (
    <ResizablePanelGroup
      {...args}
      className="min-h-50 max-w-md rounded-lg border md:min-w-md"
    >
      <ResizablePanel defaultSize="25%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Sidebar</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Resize sidebar" />
      <ResizablePanel defaultSize="75%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Content</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}
