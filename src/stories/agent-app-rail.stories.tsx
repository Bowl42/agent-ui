import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BubbleChatIcon,
  Folder01Icon,
  Search01Icon,
  Settings02Icon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { coarseHitSize } from "@/stories/touch"

import { AgentApp, AgentAppHeader } from "@/components/agent-app/agent-app"
import {
  AgentAppRail,
  AgentAppRailBrand,
  AgentAppRailFooter,
  AgentAppRailItem,
  AgentAppRailMenu,
} from "@/components/agent-app/agent-app-rail"
import { AgentAppSidebar } from "@/components/agent-app/agent-app-sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const meta = {
  title: "Blocks/Agent App/Rail",
  component: AgentApp,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AgentApp>

export default meta
type Story = StoryObj<typeof meta>

const searched = fn()
const routed = fn()

type Area = "chat" | "files" | "settings"

/**
 * Chat's sidebar is an `AgentAppSidebar`, files' the app's own. With
 * `toggle`, the footer has a switch too: the dark theme on or off.
 */
function App({
  variant,
  toggle = false,
}: {
  variant?: "inset" | "sidebar"
  toggle?: boolean
}) {
  const [area, setArea] = React.useState<Area>("chat")
  const [dark, setDark] = React.useState(false)
  const go = (to: Area) => (event: React.MouseEvent) => {
    event.preventDefault()
    routed(to)
    setArea(to)
  }
  const rail = (
    <AgentAppRail label="Areas">
      <AgentAppRailItem
        icon={<HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} />}
        label="Chat"
        href="/chat"
        current={area === "chat"}
        onClick={go("chat")}
      />
      <AgentAppRailItem
        icon={<HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />}
        label="Files"
        href="/files"
        current={area === "files"}
        onClick={go("files")}
      />
      <AgentAppRailItem
        icon={<HugeiconsIcon icon={Search01Icon} strokeWidth={2} />}
        label="Search"
        onClick={() => searched()}
      />
      <AgentAppRailFooter>
        {toggle && (
          <AgentAppRailItem
            icon={
              <HugeiconsIcon
                icon={dark ? Moon02Icon : Sun03Icon}
                strokeWidth={2}
              />
            }
            label="Dark theme"
            pressed={dark}
            onClick={() => setDark((on) => !on)}
          />
        )}
        <AgentAppRailItem
          icon={<HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />}
          label="Settings"
          href="/settings"
          current={area === "settings"}
          onClick={go("settings")}
        />
      </AgentAppRailFooter>
    </AgentAppRail>
  )
  const sidebar =
    area === "files" ? (
      <Sidebar variant={variant ?? "inset"}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Files</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>All files</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <AgentAppRailMenu />
      </Sidebar>
    ) : (
      <AgentAppSidebar
        {...(variant ? { variant } : {})}
        header={<span className="text-sm font-semibold">Agent</span>}
        projects={[]}
        conversations={[
          { id: "a", title: "Translate a document" },
          { id: "b", title: "A quick question" },
        ]}
      />
    )
  return (
    <AgentApp rail={rail} sidebar={sidebar}>
      <AgentAppHeader title={area === "files" ? "Files" : "A conversation"} />
    </AgentApp>
  )
}

const body = within(document.body)
const center = (element: Element) => {
  const box = element.getBoundingClientRect()
  return box.top + box.height / 2
}
const container = (canvas: HTMLElement) =>
  canvas.ownerDocument.querySelector<HTMLElement>(
    "[data-slot=sidebar-container]"
  )!

/**
 * A column of the app's areas at the window's edge, then the area's
 * sidebar: its first item level with the sidebar's top bar, the area the
 * reader is in marked, each named in a tooltip and a finger's size on a
 * touch screen. Closed (⌘B), the sidebar goes under it and it stays.
 */
export const Default: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas, canvasElement }) => {
    const rail = canvas.getByRole("navigation", { name: "Areas" })
    await expect(rail).toBeVisible()
    const chat = within(rail).getByRole("link", { name: "Chat" })
    await expect(chat).toHaveAttribute("aria-current", "page")
    await expect(
      within(rail).getByRole("link", { name: "Files" })
    ).not.toHaveAttribute("aria-current")

    // Beside it, the sidebar; its first item level with the sidebar's bar.
    const box = rail
      .closest("[data-slot=agent-app-rail]")!
      .getBoundingClientRect()
    const sidebar = container(canvasElement)
    await waitFor(() =>
      expect(
        Math.abs(sidebar.getBoundingClientRect().left - box.right)
      ).toBeLessThan(1)
    )
    const bar = canvasElement.ownerDocument.querySelector(
      "[data-slot=agent-app-sidebar-bar]"
    )!
    await expect(Math.abs(center(chat) - center(bar))).toBeLessThan(1)
    // The settings at its foot, level with a row in an inset sidebar's
    // footer: in its padding and the footer's, 16px up.
    const settings = within(rail).getByRole("link", { name: "Settings" })
    await expect(box.bottom - settings.getBoundingClientRect().bottom).toBe(16)
    await expect(coarseHitSize(chat).height).toBeGreaterThanOrEqual(44)

    // Its name in a tooltip.
    await userEvent.hover(chat)
    await expect(
      await body.findByText("Chat", {
        selector: "[data-slot=tooltip-content]",
      })
    ).toBeInTheDocument()
    await userEvent.unhover(chat)

    // Closed, the sidebar is under the rail, which stays; the main area
    // after it.
    await userEvent.keyboard("{Control>}b{/Control}")
    await waitFor(() =>
      expect(sidebar.getBoundingClientRect().right).toBeLessThanOrEqual(
        box.right + 0.5
      )
    )
    await expect(rail).toBeVisible()
    await expect(
      chat.contains(document.elementFromPoint(box.left + 24, center(chat)))
    ).toBe(true)
    const main = canvasElement.ownerDocument.getElementById("agent-app-main")!
    await expect(main.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      box.right
    )
    await userEvent.keyboard("{Control>}b{/Control}")
  },
}

/**
 * An area's item routes on a click; with ⌘, Ctrl or Shift the click is
 * the browser's (a new tab), and an item without an address, e.g.
 * search, only acts.
 */
export const Routes: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    routed.mockClear()
    searched.mockClear()
    const rail = within(canvas.getByRole("navigation", { name: "Areas" }))
    const files = rail.getByRole("link", { name: "Files" })
    await expect(files).toHaveAttribute("href", "/files")

    // A new tab's click is not the app's: not routed, nor prevented.
    for (const key of ["metaKey", "ctrlKey", "shiftKey"]) {
      const click = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        [key]: true,
      })
      // Not followed, here.
      const stop = (event: Event) => event.preventDefault()
      files.addEventListener("click", stop)
      files.dispatchEvent(click)
      files.removeEventListener("click", stop)
      await expect(routed).not.toHaveBeenCalled()
    }

    await userEvent.click(files)
    await expect(routed).toHaveBeenCalledWith("files")
    await expect(files).toHaveAttribute("aria-current", "page")
    // The files' sidebar, the app's own, beside the same rail.
    await expect(canvas.getByText("All files")).toBeVisible()

    await userEvent.click(rail.getByRole("button", { name: "Search" }))
    await expect(searched).toHaveBeenCalledOnce()
  },
}

/** With shadcn's plain sidebar too, the first item level with its bar. */
export const PlainSidebar: Story = {
  args: { sidebar: null },
  render: () => <App variant="sidebar" />,
  play: async ({ canvas, canvasElement }) => {
    const rail = canvas.getByRole("navigation", { name: "Areas" })
    const chat = within(rail).getByRole("link", { name: "Chat" })
    const bar = canvasElement.ownerDocument.querySelector(
      "[data-slot=agent-app-sidebar-bar]"
    )!
    await expect(Math.abs(center(chat) - center(bar))).toBeLessThan(1)
    await waitFor(() =>
      expect(
        Math.abs(
          container(canvasElement).getBoundingClientRect().left -
            rail.closest("[data-slot=agent-app-rail]")!.getBoundingClientRect()
              .right
        )
      ).toBeLessThan(1)
    )
  },
}

/** A phone's width, in the story tests too (Storybook sets it in Vitest). */
const phoneWidth = {
  parameters: {
    viewport: {
      options: {
        phone: {
          name: "Phone",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
} satisfies Partial<Story>

/**
 * On a phone there is no column: the areas are a bar at the foot of the
 * sidebar's sheet, icons over their names, once; going to one closes the sheet. An app's own
 * sidebar has it where its `AgentAppRailMenu` is.
 */
export const Phone: Story = {
  ...phoneWidth,
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    routed.mockClear()
    await expect(
      canvas.queryByRole("navigation", { name: "Areas" })
    ).not.toBeInTheDocument()
    const open = () =>
      userEvent.click(
        within(canvas.getByRole("banner")).getByRole("button", {
          name: "Toggle Sidebar",
        })
      )
    await open()
    const sheet = within(await body.findByRole("dialog"))
    const areas = within(sheet.getByRole("navigation", { name: "Areas" }))
    await expect(
      body.getAllByRole("navigation", { name: "Areas" })
    ).toHaveLength(1)
    const files = areas.getByRole("link", { name: "Files" })
    // Its name under its icon, not in a tooltip.
    await waitFor(() => expect(within(files).getByText("Files")).toBeVisible())
    await expect(areas.getByRole("link", { name: "Chat" })).toHaveAttribute(
      "aria-current",
      "page"
    )

    await userEvent.click(files)
    await expect(routed).toHaveBeenCalledWith("files")
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
    )
    // The files' sidebar has it too.
    await open()
    const again = within(await body.findByRole("dialog"))
    await waitFor(() => expect(again.getByText("All files")).toBeVisible())
    await expect(
      within(again.getByRole("navigation", { name: "Areas" })).getByRole(
        "link",
        { name: "Files" }
      )
    ).toHaveAttribute("aria-current", "page")
  },
}

/**
 * A switch among the areas (`pressed`), e.g. the dark theme: pressed
 * or not, its icon saying which. In the column it is a toggle button
 * named by its tooltip.
 */
export const Toggle: Story = {
  args: { sidebar: null },
  render: () => <App toggle />,
  play: async ({ canvas }) => {
    const rail = within(canvas.getByRole("navigation", { name: "Areas" }))
    const dark = rail.getByRole("button", { name: "Dark theme" })
    await expect(dark).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(dark)
    await expect(dark).toHaveAttribute("aria-pressed", "true")
    // Not an area: the one the reader is in stays so.
    await expect(dark).not.toHaveAttribute("aria-current")
    await expect(rail.getByRole("link", { name: "Chat" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  },
}

/**
 * On a phone, a switch in the sheet's bar leaves the sheet open, where
 * the reader sees what it changed; going to an area still closes it.
 */
export const PhoneToggle: Story = {
  ...phoneWidth,
  args: { sidebar: null },
  render: () => <App toggle />,
  play: async ({ canvas }) => {
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    const sheet = within(await body.findByRole("dialog"))
    const areas = within(sheet.getByRole("navigation", { name: "Areas" }))
    const dark = areas.getByRole("button", { name: "Dark theme" })
    // Opened all the way first.
    await waitFor(() =>
      expect(within(dark).getByText("Dark theme")).toBeVisible()
    )
    const dialog = body.getByRole("dialog")
    await userEvent.click(dark)
    await expect(dark).toHaveAttribute("aria-pressed", "true")
    await expect(dialog).not.toHaveAttribute("data-closed")
    await userEvent.click(dark)
    await expect(dark).toHaveAttribute("aria-pressed", "false")
    await expect(dialog).not.toHaveAttribute("data-closed")
    await expect(dialog).toBeVisible()
    await userEvent.click(areas.getByRole("link", { name: "Files" }))
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
    )
  },
}

/**
 * The app's mark: letters on a filled tile; its own logo, an SVG or an
 * image, in its own colours, with no tile under it.
 */
export const Brand: Story = {
  args: { sidebar: null },
  parameters: { layout: "centered" },
  render: () => (
    <div className="flex gap-4">
      <AgentAppRailBrand label="Letters">A</AgentAppRailBrand>
      <AgentAppRailBrand label="Logo">
        <svg viewBox="0 0 26 26" aria-hidden>
          <circle cx="13" cy="13" r="12" fill="oklch(0.6 0.15 40)" />
          <circle cx="13" cy="13" r="5" fill="oklch(0.98 0.02 85)" />
        </svg>
      </AgentAppRailBrand>
    </div>
  ),
  play: async ({ canvas }) => {
    const tile = (name: string) =>
      getComputedStyle(canvas.getByRole("img", { name })).backgroundColor
    await expect(tile("Letters")).not.toBe("rgba(0, 0, 0, 0)")
    await expect(tile("Logo")).toBe("rgba(0, 0, 0, 0)")
    // The logo fills the mark's place, as the tile does.
    const logo = canvas.getByRole("img", { name: "Logo" })
    await expect(logo.querySelector("svg")!.getBoundingClientRect().width).toBe(
      logo.getBoundingClientRect().width
    )
  },
}
