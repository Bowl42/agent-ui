import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BrowserIcon,
  CodeIcon,
  Home01Icon,
  MoreHorizontalIcon,
  Search01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const meta = {
  title: "Components/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

const panels = (
  <div className="rounded-lg border p-4">
    <TabsContent value="chat">
      Talk to the agent and review its replies.
    </TabsContent>
    <TabsContent value="runs">
      Every run with its status, duration and cost.
    </TabsContent>
    <TabsContent value="tools">
      Tools the agent may call during a run.
    </TabsContent>
  </div>
)

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="chat" className="w-96">
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="runs">Runs</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
      </TabsList>
      {panels}
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const chat = canvas.getByRole("tab", { name: "Chat" })
    const runs = canvas.getByRole("tab", { name: "Runs" })
    const tools = canvas.getByRole("tab", { name: "Tools" })
    await expect(chat).toHaveAttribute("aria-selected", "true")
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent(
      "Talk to the agent"
    )

    // Only the selected tab is in the tab order; arrows move between tabs.
    await userEvent.tab()
    await expect(chat).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(runs).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(runs).toHaveAttribute("aria-selected", "true")
    // The previous panel stays mounted (inert) until its exit ends.
    await waitFor(() =>
      expect(canvas.getByRole("tabpanel")).toHaveTextContent(
        "Every run with its status"
      )
    )

    await userEvent.keyboard("{End}")
    await expect(tools).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(chat).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(chat).toHaveAttribute("aria-selected", "true")
  },
}

export const Line: Story = {
  render: () => (
    <Tabs defaultValue="chat" className="w-96">
      <TabsList variant="line">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="runs">Runs</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
      </TabsList>
      {panels}
    </Tabs>
  ),
}

/**
 * Line tabs on a rule (`rule`): across their container on a hairline,
 * as wide as their words from its start, the current one's underline
 * over the rule.
 */
export const LineOnARule: Story = {
  render: () => (
    <Tabs defaultValue="chat" className="w-96">
      <TabsList variant="line" rule>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="runs">Runs</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
      </TabsList>
      {panels}
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole("tablist")
    const tabs = canvas.getAllByRole("tab")
    const box = list.getBoundingClientRect()
    await expect(box.width).toBe(384)
    // From its start, each as wide as its words.
    await expect(tabs[0]!.getBoundingClientRect().left - box.left).toBe(4)
    await expect(tabs[2]!.getBoundingClientRect().right).toBeLessThan(
      box.right - 100
    )
    await expect(getComputedStyle(list).boxShadow).toMatch(/inset/)
    // The underline's foot on the list's, over the rule.
    const underline = getComputedStyle(tabs[0]!, "::after")
    await expect(underline.opacity).toBe("1")
    await expect(
      tabs[0]!.getBoundingClientRect().bottom + 4 - parseFloat(underline.height)
    ).toBe(box.bottom - 2)
  },
}

export const Disabled: Story = {
  render: () => (
    <Tabs defaultValue="chat" className="w-96">
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="runs" disabled>
          Runs
        </TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
      </TabsList>
      {panels}
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const runs = canvas.getByRole("tab", { name: "Runs" })
    await expect(runs).toHaveAttribute("aria-disabled", "true")
    await userEvent.tab()
    await userEvent.keyboard("{ArrowRight}")
    // A disabled tab stays focusable (APG) but cannot be selected.
    await expect(runs).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(runs).toHaveAttribute("aria-selected", "false")
    await expect(canvas.getByRole("tab", { name: "Chat" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  },
}

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="preview">
      <TabsList>
        <TabsTrigger value="preview">
          <HugeiconsIcon icon={BrowserIcon} strokeWidth={2} />
          Preview
        </TabsTrigger>
        <TabsTrigger value="code">
          <HugeiconsIcon icon={CodeIcon} strokeWidth={2} />
          Code
        </TabsTrigger>
      </TabsList>
    </Tabs>
  ),
}

export const IconOnly: Story = {
  render: () => (
    <Tabs defaultValue="home">
      <TabsList>
        <TabsTrigger value="home" aria-label="Home">
          <HugeiconsIcon icon={Home01Icon} strokeWidth={2} />
        </TabsTrigger>
        <TabsTrigger value="search" aria-label="Search">
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </TabsTrigger>
        <TabsTrigger value="settings" aria-label="Settings">
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("tab", { name: "Search" }))
    await expect(canvas.getByRole("tab", { name: "Search" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  },
}

export const WithDropdown: Story = {
  render: () => (
    <Tabs defaultValue="chat" className="w-96">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="size-8" />}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
            <span className="sr-only">More options</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Export</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {panels}
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "More options" })
    trigger.focus()
    await userEvent.keyboard("{Enter}")
    const menu = await screen.findByRole("menu")
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "Export" })
      ).toBeVisible()
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="chat" orientation="vertical" className="w-96">
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="runs">Runs</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
      </TabsList>
      {panels}
    </Tabs>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await userEvent.keyboard("{ArrowDown}")
    await expect(canvas.getByRole("tab", { name: "Runs" })).toHaveFocus()
    await expect(canvas.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "vertical"
    )
  },
}

export const WithInputAndButton: Story = {
  render: () => (
    <Tabs defaultValue="chat" className="w-lg">
      <div className="flex items-center gap-4">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>
        <div className="ms-auto flex items-center gap-2">
          <Input
            type="search"
            aria-label="Search"
            placeholder="Search..."
            className="w-44"
          />
          <Button>New chat</Button>
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <TabsContent value="chat">
          Talk to the agent and review its replies.
        </TabsContent>
        <TabsContent value="runs">
          Every run with its status, duration and cost.
        </TabsContent>
      </div>
    </Tabs>
  ),
}
