import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ClipboardIcon,
  Copy01Icon,
  Delete01Icon,
  Scissor01Icon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { onAPhone, opened, sheetGeometry } from "@/stories/phone"

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

const meta = {
  title: "Components/Context Menu",
  component: ContextMenu,
} satisfies Meta<typeof ContextMenu>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

const area =
  "flex h-24 w-72 items-center justify-center rounded-lg border border-dashed text-sm"

const openAt = async (target: Element) => {
  await userEvent.pointer({ keys: "[MouseRight]", target })
  const menu = await body.findByRole("menu")
  // The popup takes focus once open; arrow keys then move through the items.
  await waitFor(() => expect(menu).toHaveFocus())
  return menu
}

const onSelect = fn()

export const Basic: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={area}>Right click here</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem onClick={() => onSelect("Back")}>
            Back
          </ContextMenuItem>
          <ContextMenuItem disabled>Forward</ContextMenuItem>
          <ContextMenuItem onClick={() => onSelect("Reload")}>
            Reload
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvas }) => {
    onSelect.mockClear()
    const menu = await openAt(canvas.getByText("Right click here"))
    const back = within(menu).getByRole("menuitem", { name: "Back" })
    const forward = within(menu).getByRole("menuitem", { name: "Forward" })
    await expect(forward).toHaveAttribute("aria-disabled", "true")

    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(back).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    await expect(
      within(menu).getByRole("menuitem", { name: "Reload" })
    ).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(onSelect).toHaveBeenCalledWith("Reload")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())

    await openAt(canvas.getByText("Right click here"))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
  },
}

/**
 * On a phone, a long press opens it as a sheet from the bottom, its rows
 * 44px tall, its `sheetTitle` on top.
 */
export const Phone: Story = {
  ...onAPhone,
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={area}>Press and hold</ContextMenuTrigger>
      <ContextMenuContent sheetTitle="report.pdf">
        <ContextMenuItem onClick={() => onSelect("Open")}>Open</ContextMenuItem>
        <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvas }) => {
    onSelect.mockClear()
    const menu = await opened(await openAt(canvas.getByText("Press and hold")))
    await expect(menu).toHaveAttribute("data-phone-sheet")
    await expect(within(menu).getByText("report.pdf")).toBeVisible()
    await expect(
      sheetGeometry(menu, within(menu).getAllByRole("menuitem"))
    ).toEqual({ across: true, atBottom: true, rows: [44, 44] })
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Open" }))
    await expect(onSelect).toHaveBeenCalledWith("Open")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
  },
}

export const WithIcons: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={area}>
        Right click a message
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem>
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            Copy
          </ContextMenuItem>
          <ContextMenuItem>
            <HugeiconsIcon icon={Scissor01Icon} strokeWidth={2} />
            Cut
          </ContextMenuItem>
          <ContextMenuItem>
            <HugeiconsIcon icon={ClipboardIcon} strokeWidth={2} />
            Paste
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem variant="destructive">
            <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} />
            Delete
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvas }) => {
    const menu = await openAt(canvas.getByText("Right click a message"))
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "Delete" })
      ).toHaveFocus()
    )
  },
}

export const WithShortcuts: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={area}>Right click here</ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuGroup>
          <ContextMenuItem>
            Back
            <ContextMenuShortcut>⌘[</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled>
            Forward
            <ContextMenuShortcut>⌘]</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Reload
            <ContextMenuShortcut>⌘R</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvas }) => {
    const menu = await openAt(canvas.getByText("Right click here"))
    await expect(within(menu).getByText("⌘R")).toBeInTheDocument()
  },
}

export const WithSubmenu: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={area}>
        Right click a chat
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem>Rename</ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move to</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Research</ContextMenuItem>
              <ContextMenuItem>Ops</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem>New project…</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem>Pin</ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvas }) => {
    const menu = await openAt(canvas.getByText("Right click a chat"))
    const moveTo = within(menu).getByRole("menuitem", { name: "Move to" })
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    await waitFor(() => expect(moveTo).toHaveFocus())
    await userEvent.keyboard("{ArrowRight}")
    const research = await body.findByRole("menuitem", { name: "Research" })
    await waitFor(() => expect(research).toHaveFocus())
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() =>
      expect(body.queryByRole("menuitem", { name: "Research" })).toBeNull()
    )
    await waitFor(() => expect(moveTo).toHaveFocus())
  },
}

export const WithCheckboxesAndRadio: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={area}>
        Right click the log
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuGroup>
          <ContextMenuLabel>Show</ContextMenuLabel>
          <ContextMenuCheckboxItem defaultChecked>
            Tool calls
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem>Timestamps</ContextMenuCheckboxItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel>Density</ContextMenuLabel>
          <ContextMenuRadioGroup defaultValue="comfortable">
            <ContextMenuRadioItem value="compact">Compact</ContextMenuRadioItem>
            <ContextMenuRadioItem value="comfortable">
              Comfortable
            </ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvas }) => {
    const menu = await openAt(canvas.getByText("Right click the log"))
    const timestamps = within(menu).getByRole("menuitemcheckbox", {
      name: "Timestamps",
    })
    const compact = within(menu).getByRole("menuitemradio", {
      name: "Compact",
    })
    await expect(
      within(menu).getByRole("menuitemcheckbox", { name: "Tool calls" })
    ).toBeChecked()
    await expect(
      within(menu).getByRole("menuitemradio", { name: "Comfortable" })
    ).toBeChecked()

    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    await waitFor(() => expect(timestamps).toHaveFocus())
    await userEvent.keyboard(" ")
    await expect(timestamps).toBeChecked()
    await userEvent.keyboard("{ArrowDown}")
    await expect(compact).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(compact).toBeChecked()
  },
}
