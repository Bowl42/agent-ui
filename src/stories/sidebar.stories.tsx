import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BubbleChatIcon,
  Clock04Icon,
  Robot01Icon,
  Search01Icon,
  SlidersHorizontalIcon,
  Tick02Icon,
  UnfoldMoreIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import * as React from "react"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

const workspaces = ["Personal", "Research", "Ops"]

const nav = [
  {
    title: "Today",
    items: [
      { title: "Summarise inbox", isActive: true },
      { title: "Fix flaky test" },
      { title: "Plan release" },
    ],
  },
  {
    title: "Previous 7 days",
    items: [
      { title: "Draft blog post" },
      { title: "Benchmark models" },
      { title: "Refactor tools" },
    ],
  },
]

function Placeholder() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-64 flex-1 rounded-xl bg-muted/50" />
    </div>
  )
}

function SidebarDemo() {
  const [workspace, setWorkspace] = React.useState(workspaces[0])
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <span className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">Workspace</span>
                    <span className="text-xs">{workspace}</span>
                  </span>
                  <HugeiconsIcon
                    icon={UnfoldMoreIcon}
                    strokeWidth={2}
                    className="ms-auto"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {workspaces.map((name) => (
                    <DropdownMenuItem
                      key={name}
                      onClick={() => setWorkspace(name)}
                    >
                      {name}
                      {name === workspace && (
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          strokeWidth={2}
                          className="ms-auto"
                        />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
          <form role="search" onSubmit={(event) => event.preventDefault()}>
            <SidebarGroup className="py-0">
              <SidebarGroupContent className="relative">
                <Label htmlFor="sidebar-search" className="sr-only">
                  Search chats
                </Label>
                <SidebarInput
                  id="sidebar-search"
                  placeholder="Search chats..."
                  className="ps-8"
                />
                <HugeiconsIcon
                  icon={Search01Icon}
                  strokeWidth={2}
                  className="pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 opacity-50 select-none"
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </form>
        </SidebarHeader>
        <SidebarContent>
          {nav.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={
                          <a
                            href="#chat"
                            aria-current={item.isActive ? "page" : undefined}
                          />
                        }
                        isActive={item.isActive}
                      >
                        {item.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ms-1" />
          <h1 className="text-sm font-medium">Summarise inbox</h1>
        </header>
        <Placeholder />
      </SidebarInset>
    </SidebarProvider>
  )
}

function sidebarState(canvasElement: HTMLElement) {
  return canvasElement
    .querySelector("[data-slot=sidebar]")
    ?.getAttribute("data-state")
}

export const Default: Story = {
  render: () => <SidebarDemo />,
  play: async ({ canvas, canvasElement }) => {
    await expect(sidebarState(canvasElement)).toBe("expanded")
    // Its actions' larger hit areas under a finger reach past its edge:
    // the content scrolls up and down only, never sideways.
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=sidebar-content]"
    )!
    await expect(getComputedStyle(content).overflowX).toBe("hidden")
    await expect(getComputedStyle(content).overflowY).toBe("auto")
    await expect(
      canvas.getByRole("link", { name: "Summarise inbox" })
    ).toHaveAttribute("aria-current", "page")
    await expect(
      canvas.getByRole("textbox", { name: "Search chats" })
    ).toBeVisible()

    // Switch workspace from the header menu with the keyboard.
    const switcher = canvas.getByRole("button", { name: /Workspace/ })
    switcher.focus()
    await userEvent.keyboard("{Enter}")
    const menu = await screen.findByRole("menu")
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Research" })
    )
    await waitFor(() => expect(switcher).toHaveTextContent("Research"))

    // The trigger and Ctrl+B both toggle the sidebar.
    // The rail shares the name but is out of the tab order.
    const trigger = within(canvas.getByRole("main")).getByRole("button", {
      name: "Toggle Sidebar",
    })
    trigger.focus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(sidebarState(canvasElement)).toBe("collapsed"))
    await userEvent.keyboard("{Control>}b{/Control}")
    await waitFor(() => expect(sidebarState(canvasElement)).toBe("expanded"))
  },
}

const items = [
  { title: "Chats", icon: BubbleChatIcon, isActive: true },
  { title: "Agents", icon: Robot01Icon },
  { title: "Tools", icon: Wrench01Icon },
  { title: "Runs", icon: Clock04Icon },
]

/** Collapses to icons; each button shows its label in a tooltip. */
export const CollapsibleIcon: Story = {
  render: () => (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.isActive}
                    >
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Settings">
                <HugeiconsIcon icon={SlidersHorizontalIcon} strokeWidth={2} />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ms-1" />
        </header>
        <Placeholder />
      </SidebarInset>
    </SidebarProvider>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(sidebarState(canvasElement)).toBe("collapsed")
    await expect(
      canvasElement.querySelector("[data-slot=sidebar]")
    ).toHaveAttribute("data-collapsible", "icon")
    // Keyboard focus shows the label of an icon-only button.
    await userEvent.tab()
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Agents" })).toHaveFocus()
    await expect(
      await screen.findByText("Agents", {
        selector: "[data-slot=tooltip-content]",
      })
    ).toBeInTheDocument()

    await userEvent.click(
      within(canvas.getByRole("main")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    await waitFor(() => expect(sidebarState(canvasElement)).toBe("expanded"))
  },
}
