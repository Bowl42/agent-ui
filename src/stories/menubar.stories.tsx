import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  File01Icon,
  FloppyDiskIcon,
  Folder01Icon,
} from "@hugeicons/core-free-icons"
import { expect, userEvent, waitFor, within } from "storybook/test"

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"

/**
 * In WebKit, Base UI gives the focus guards around an open menu
 * `role="button"` so VoiceOver's virtual cursor stays trapped (see its
 * FocusGuard). Inside a menubar or menu that breaks axe's
 * aria-required-children, so the rule is off here in WebKit only.
 */
const webkit =
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Firefox/.test(navigator.userAgent)

const meta = {
  title: "Components/Menubar",
  component: Menubar,
  parameters: webkit
    ? {
        a11y: {
          options: { rules: { "aria-required-children": { enabled: false } } },
        },
      }
    : {},
} satisfies Meta<typeof Menubar>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/** Opens a top-level menu by click and waits for it to take focus. */
const openMenu = async (trigger: HTMLElement) => {
  await userEvent.click(trigger)
  const menu = await body.findByRole("menu", { name: trigger.textContent! })
  await waitFor(() => expect(menu).toHaveFocus())
  return menu
}

export const Basic: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarGroup>
            <MenubarItem>
              New chat <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              New window <MenubarShortcut>⇧⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>New private chat</MenubarItem>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarItem>
            Export… <MenubarShortcut>⌘E</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarGroup>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("menubar")).toBeInTheDocument()
    const file = canvas.getByRole("menuitem", { name: "File" })
    const edit = canvas.getByRole("menuitem", { name: "Edit" })

    // One tab stop; arrows move between the top-level menus.
    await userEvent.tab()
    await expect(file).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(edit).toHaveFocus())
    await userEvent.keyboard("{ArrowLeft}")
    await expect(file).toHaveFocus()

    await userEvent.keyboard("{ArrowDown}")
    const newChat = await body.findByRole("menuitem", { name: /New chat/ })
    await waitFor(() => expect(newChat).toHaveFocus())
    await expect(file).toHaveAttribute("aria-expanded", "true")

    // With a menu open, ArrowRight moves to the next menu.
    await userEvent.keyboard("{ArrowRight}")
    const editMenu = await body.findByRole("menu", { name: "Edit" })
    await expect(edit).toHaveAttribute("aria-expanded", "true")
    await waitFor(() => expect(editMenu).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")
    await expect(
      within(editMenu).getByRole("menuitem", { name: /Undo/ })
    ).toHaveFocus()

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await waitFor(() => expect(edit).toHaveFocus())
  },
}

export const WithSubmenu: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger>Share</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Copy link</MenubarItem>
              <MenubarItem>Email</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>
            Print… <MenubarShortcut>⌘P</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
  play: async ({ canvas }) => {
    const menu = await openMenu(canvas.getByRole("menuitem", { name: "File" }))
    const share = within(menu).getByRole("menuitem", { name: "Share" })
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(share).toHaveFocus())
    await userEvent.keyboard("{ArrowRight}")
    const copy = await body.findByRole("menuitem", { name: "Copy link" })
    await waitFor(() => expect(copy).toHaveFocus())
  },
}

export const WithCheckboxes: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent className="w-56">
          <MenubarCheckboxItem>Show tool calls</MenubarCheckboxItem>
          <MenubarCheckboxItem defaultChecked>
            Show token usage
          </MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarItem inset>
            Reload <MenubarShortcut>⌘R</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled inset>
            Force reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
  play: async ({ canvas }) => {
    const menu = await openMenu(canvas.getByRole("menuitem", { name: "View" }))
    const tools = within(menu).getByRole("menuitemcheckbox", {
      name: "Show tool calls",
    })
    await expect(
      within(menu).getByRole("menuitemcheckbox", { name: "Show token usage" })
    ).toBeChecked()
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(tools).toHaveFocus())
    await userEvent.keyboard(" ")
    await expect(tools).toBeChecked()
  },
}

export const WithRadio: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Model</MenubarTrigger>
        <MenubarContent>
          <MenubarRadioGroup defaultValue="sonnet">
            <MenubarRadioItem value="opus">Opus</MenubarRadioItem>
            <MenubarRadioItem value="sonnet">Sonnet</MenubarRadioItem>
            <MenubarRadioItem value="haiku">Haiku</MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
  play: async ({ canvas }) => {
    const menu = await openMenu(canvas.getByRole("menuitem", { name: "Model" }))
    const haiku = within(menu).getByRole("menuitemradio", { name: "Haiku" })
    await expect(
      within(menu).getByRole("menuitemradio", { name: "Sonnet" })
    ).toBeChecked()
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() => expect(haiku).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    await expect(haiku).toBeChecked()
  },
}

export const WithIcons: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
            New file <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
            Open folder
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <HugeiconsIcon icon={FloppyDiskIcon} strokeWidth={2} />
            Save <MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
  play: async ({ canvas }) => {
    const menu = await openMenu(canvas.getByRole("menuitem", { name: "File" }))
    await expect(
      within(menu).getByRole("menuitem", { name: /Open folder/ })
    ).toBeInTheDocument()
  },
}
