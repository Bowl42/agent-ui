import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Archive02Icon,
  Copy01Icon,
  Delete01Icon,
  Logout01Icon,
  PencilEdit02Icon,
  Settings02Icon,
  Share03Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import {
  aboveTheSheet,
  onAPhone,
  opened,
  sheetGeometry,
  swipeDown,
} from "@/stories/phone"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const meta = {
  title: "Components/Dropdown Menu",
  component: DropdownMenu,
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

const onSelect = fn()

export const Basic: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Open
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onSelect("Profile")}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSelect("Billing")}>
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSelect("Settings")}>
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Support</DropdownMenuItem>
        <DropdownMenuItem disabled>API</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    onSelect.mockClear()
    const trigger = canvas.getByRole("button", { name: "Open" })
    await userEvent.tab()
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")

    const menu = await body.findByRole("menu")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(within(menu).getByRole("group")).toHaveAccessibleName(
      "My account"
    )
    await expect(
      within(menu).getByRole("menuitem", { name: "API" })
    ).toHaveAttribute("aria-disabled", "true")

    const profile = within(menu).getByRole("menuitem", { name: "Profile" })
    await waitFor(() => expect(profile).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")
    await expect(
      within(menu).getByRole("menuitem", { name: "Billing" })
    ).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(onSelect).toHaveBeenCalledWith("Billing")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())

    await userEvent.keyboard("{Enter}")
    await body.findByRole("menu")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const WithIcons: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Account
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Account" }))
    const menu = await body.findByRole("menu")
    await expect(within(menu).getAllByRole("menuitem")).toHaveLength(3)
  },
}

/**
 * As wide as its items: from an icon button, each item on one line, not
 * 128px wide with its words broken; from a wide trigger, as wide as it.
 */
export const ItsItemsWidth: Story = {
  render: () => (
    <div className="flex items-start gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="More" />}
        >
          <HugeiconsIcon icon={Share03Icon} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <HugeiconsIcon icon={Share03Icon} strokeWidth={2} />
            Open in the system browser
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            Copy link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-72" />}
        >
          Workspace
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuItem>Leave</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "More" }))
    let menu = await body.findByRole("menu")
    await opened(menu)
    for (const item of within(menu).getAllByRole("menuitem"))
      await expect(item.getBoundingClientRect().height).toBe(32)
    await expect(menu.getBoundingClientRect().width).toBeGreaterThan(128)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())

    const trigger = canvas.getByRole("button", { name: "Workspace" })
    await userEvent.click(trigger)
    menu = await body.findByRole("menu")
    await opened(menu)
    await expect(menu.getBoundingClientRect().width).toBe(
      trigger.getBoundingClientRect().width
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
  },
}

/**
 * Items with a line under their label, what each does, in grey: said
 * after the item's name, not in it, and still grey as it is focused.
 */
export const WithDescriptions: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Search another way
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuItem
          onClick={() => onSelect("messages")}
          description="Every conversation's messages, not just their titles"
        >
          Search messages
        </DropdownMenuItem>
        <DropdownMenuItem description="By file name, in this project">
          <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
          Search files
        </DropdownMenuItem>
        <DropdownMenuItem>Search the web</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    onSelect.mockClear()
    await userEvent.click(
      canvas.getByRole("button", { name: "Search another way" })
    )
    const menu = await body.findByRole("menu")
    const messages = within(menu).getByRole("menuitem", {
      name: "Search messages",
    })
    await expect(messages).toHaveAccessibleDescription(
      "Every conversation's messages, not just their titles"
    )
    await expect(
      within(menu).getByRole("menuitem", { name: "Search the web" })
    ).not.toHaveAttribute("aria-describedby")
    // Two lines, the description under the label, starting where it does.
    const label = messages.firstElementChild!.firstElementChild!
    const description = messages.querySelector(
      "[data-slot=dropdown-menu-item-description]"
    )!
    await expect(
      description.getBoundingClientRect().top
    ).toBeGreaterThanOrEqual(label.getBoundingClientRect().bottom)
    await expect(description.getBoundingClientRect().left).toBe(
      label.getBoundingClientRect().left
    )
    // Grey, focused or not; the label in the text's colour.
    messages.focus()
    await expect(messages).toHaveFocus()
    await expect(getComputedStyle(description).color).not.toBe(
      getComputedStyle(label).color
    )
    // Past an icon, under its label's text.
    const files = within(menu).getByRole("menuitem", { name: "Search files" })
    const textLeft = (node: Node, after?: Node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      if (after) range.setStartAfter(after)
      return range.getBoundingClientRect().left
    }
    await expect(
      Math.abs(
        textLeft(
          files.querySelector("[data-slot=dropdown-menu-item-description]")!
        ) -
          textLeft(
            files.firstElementChild!.firstElementChild!,
            files.querySelector("svg")!
          )
      )
    ).toBeLessThanOrEqual(1)
    await userEvent.click(messages)
    await expect(onSelect).toHaveBeenCalledWith("messages")
  },
}

export const WithShortcuts: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Chat
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Chat</DropdownMenuLabel>
          <DropdownMenuItem>
            New chat
            <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Search chats
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Toggle sidebar
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Chat" }))
    await body.findByRole("menuitem", { name: /New chat/ })
  },
}

export const WithSubmenu: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Team
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Members</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
              <DropdownMenuItem>Message</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>More…</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem>
          New team
          <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Team" }))
    await body.findByRole("menu")
    const sub = body.getByRole("menuitem", { name: "Invite users" })
    await expect(sub).toHaveAttribute("aria-haspopup", "menu")

    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    await waitFor(() => expect(sub).toHaveFocus())
    await userEvent.keyboard("{ArrowRight}")
    const email = await body.findByRole("menuitem", { name: "Email" })
    await waitFor(() => expect(email).toHaveFocus())

    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() =>
      expect(body.queryByRole("menuitem", { name: "Email" })).toBeNull()
    )
    await waitFor(() => expect(sub).toHaveFocus())
  },
}

export const WithCheckboxes: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuCheckboxItem defaultChecked>
            Tool calls
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem disabled>
            Token usage
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Timestamps</DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "View" }))
    const menu = await body.findByRole("menu")
    const tools = within(menu).getByRole("menuitemcheckbox", {
      name: "Tool calls",
    })
    const timestamps = within(menu).getByRole("menuitemcheckbox", {
      name: "Timestamps",
    })
    await expect(tools).toBeChecked()
    await expect(timestamps).not.toBeChecked()

    // Disabled items stay reachable with the arrow keys, but do nothing.
    const usage = within(menu).getByRole("menuitemcheckbox", {
      name: "Token usage",
    })
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(tools).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")
    await expect(usage).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(usage).not.toBeChecked()
    await userEvent.keyboard("{ArrowDown}")
    await expect(timestamps).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(timestamps).toBeChecked()
  },
}

export const WithRadioGroup: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Model
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Model</DropdownMenuLabel>
          <DropdownMenuRadioGroup defaultValue="sonnet">
            <DropdownMenuRadioItem value="opus">Opus</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="sonnet">Sonnet</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="haiku" disabled>
              Haiku
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Model" }))
    const menu = await body.findByRole("menu")
    const opus = within(menu).getByRole("menuitemradio", { name: "Opus" })
    const sonnet = within(menu).getByRole("menuitemradio", { name: "Sonnet" })
    await expect(sonnet).toBeChecked()

    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(opus).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    await expect(opus).toBeChecked()
    await expect(sonnet).not.toBeChecked()
  },
}

export const WithDestructiveItems: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Actions
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HugeiconsIcon icon={Share03Icon} strokeWidth={2} />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <HugeiconsIcon icon={Archive02Icon} strokeWidth={2} />
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive">
          <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Actions" }))
    await body.findByRole("menu")
    // Highlight the destructive item so its focus colours are checked too.
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}")
    await waitFor(() =>
      expect(body.getByRole("menuitem", { name: "Delete" })).toHaveFocus()
    )
  },
}

/**
 * On a phone, a sheet from the bottom: across the screen over a scrim,
 * its rows 44px tall, its title on top; a tap on the scrim or a swipe
 * down on its handle closes it.
 */
export const Phone: Story = {
  ...onAPhone,
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Actions
      </DropdownMenuTrigger>
      <DropdownMenuContent sheetTitle="Release notes.md">
        <DropdownMenuItem>
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
          Rename
          <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HugeiconsIcon icon={Share03Icon} strokeWidth={2} />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    const open = async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Actions" }))
      return opened(await body.findByRole("menu"))
    }
    const menu = await open()
    await expect(menu).toHaveAttribute("data-phone-sheet")
    await expect(sheetGeometry(menu, body.getAllByRole("menuitem"))).toEqual({
      across: true,
      atBottom: true,
      rows: [44, 44, 44],
    })
    await expect(within(menu).getByText("Release notes.md")).toBeVisible()
    // Its top on the grid: 8px, a 4px handle, the title's 36px.
    await expect(
      menu
        .querySelector("[data-slot=phone-sheet-header]")!
        .getBoundingClientRect().height
    ).toBe(48)
    await expect(within(menu).getByText("⌘R")).not.toBeVisible()

    // A tap on the scrim closes it.
    await userEvent.click(aboveTheSheet())
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())

    // So does a swipe down on its handle.
    const again = await open()
    await swipeDown(again.querySelector("[data-slot=phone-sheet-header]")!, 200)
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
  },
}

const sides = [
  "inline-start",
  "left",
  "top",
  "bottom",
  "right",
  "inline-end",
] as const

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-2">
      {sides.map((side) => (
        <DropdownMenu key={side}>
          <DropdownMenuTrigger
            render={<Button variant="outline" className="capitalize" />}
          >
            {side.replace("-", " ")}
          </DropdownMenuTrigger>
          <DropdownMenuContent side={side}>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  ),
}

export const InDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message</DialogTitle>
          <DialogDescription>A menu opened inside a dialog.</DialogDescription>
        </DialogHeader>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" className="w-fit" />}
          >
            Message actions
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open dialog" }))
    const dialog = await body.findByRole("dialog", { name: "Message" })
    const trigger = within(dialog).getByRole("button", {
      name: "Message actions",
    })
    await userEvent.click(trigger)
    const copy = await body.findByRole("menuitem", { name: "Copy" })
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(copy).toHaveFocus())

    // Escape closes the menu and leaves the dialog open.
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())
    await expect(
      body.getByRole("dialog", { name: "Message" })
    ).toBeInTheDocument()
  },
}
