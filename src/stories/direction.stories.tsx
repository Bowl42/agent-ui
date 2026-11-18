import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import { DirectionProvider } from "@/components/ui/direction"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Right-to-left needs both halves: `dir="rtl"` on the document for CSS
 * (popups are portalled to `<body>`), and `DirectionProvider` for Base UI's
 * keyboard handling and popup placement.
 */
function RtlDocument({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute("dir")
    root.setAttribute("dir", "rtl")
    return () => {
      if (previous === null) root.removeAttribute("dir")
      else root.setAttribute("dir", previous)
    }
  }, [])
  return children
}

const withRtl: Decorator = (Story) => (
  <RtlDocument>
    <DirectionProvider direction="rtl">
      <div dir="rtl">
        <Story />
      </div>
    </DirectionProvider>
  </RtlDocument>
)

const meta = {
  title: "Components/Direction",
  component: DirectionProvider,
  decorators: [withRtl],
} satisfies Meta<typeof DirectionProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Menu: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Chat actions
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Research</DropdownMenuItem>
              <DropdownMenuItem>Ops</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Chat actions" })
    trigger.focus()
    await userEvent.keyboard("{ArrowDown}")
    const menu = await screen.findByRole("menu")
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "Rename" })
      ).toHaveFocus()
    )
    await userEvent.keyboard("{ArrowDown}")
    const subTrigger = within(menu).getByRole("menuitem", { name: "Move to" })
    await expect(subTrigger).toHaveFocus()

    // In RTL the submenu opens with ArrowLeft, towards the inline end.
    await userEvent.keyboard("{ArrowLeft}")
    const research = await screen.findByRole("menuitem", { name: "Research" })
    await waitFor(() => expect(research).toHaveFocus())
    const submenu = research.closest<HTMLElement>("[role=menu]")!
    await waitFor(() =>
      expect(submenu.getBoundingClientRect().right).toBeLessThanOrEqual(
        subTrigger.getBoundingClientRect().left + 8
      )
    )
    await expect(getComputedStyle(submenu).direction).toBe("rtl")

    // ArrowRight closes it again and returns to the trigger.
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(subTrigger).toHaveFocus())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const TabsKeyboard: Story = {
  name: "Tabs",
  render: () => (
    <Tabs defaultValue="chat" className="w-80">
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="runs">Runs</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
      </TabsList>
      <TabsContent value="chat">Talk to the agent.</TabsContent>
      <TabsContent value="runs">Every run.</TabsContent>
      <TabsContent value="tools">Available tools.</TabsContent>
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const chat = canvas.getByRole("tab", { name: "Chat" })
    const runs = canvas.getByRole("tab", { name: "Runs" })
    // The first tab is the rightmost one.
    await expect(chat.getBoundingClientRect().left).toBeGreaterThan(
      runs.getBoundingClientRect().left
    )
    await userEvent.tab()
    await expect(chat).toHaveFocus()
    // ArrowLeft moves to the next tab in reading order.
    await userEvent.keyboard("{ArrowLeft}")
    await expect(runs).toHaveFocus()
  },
}
