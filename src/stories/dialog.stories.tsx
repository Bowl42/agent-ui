import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { onAPhone, windowOf } from "@/stories/phone"
import { onOneLine, settled } from "@/stories/grid-lines"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const meta = {
  title: "Components/Dialog",
  component: Dialog,
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Rename chat
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
          <DialogDescription>
            Give this chat a name you can find later.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="dialog-chat-name">Name</FieldLabel>
            <Input id="dialog-chat-name" defaultValue="Refactor the parser" />
          </Field>
          <Field>
            <FieldLabel htmlFor="dialog-chat-model">Model</FieldLabel>
            <Input id="dialog-chat-model" defaultValue="claude-opus" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Rename chat" })
    await userEvent.tab()
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.keyboard("{Enter}")

    const dialog = await body.findByRole("dialog", { name: "Rename chat" })
    await expect(dialog).toHaveAccessibleDescription(
      "Give this chat a name you can find later."
    )
    await waitFor(() =>
      expect(within(dialog).getByLabelText("Name")).toHaveFocus()
    )
    await onDialogTracks(dialog)

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())

    // Leave it open so the open state is checked by axe too.
    await userEvent.keyboard("{Enter}")
    const open = await body.findByRole("dialog", { name: "Rename chat" })
    // Its buttons under the content, on no band ruled off.
    const footer = getComputedStyle(
      open.querySelector("[data-slot=dialog-footer]")!
    )
    await expect(footer.borderTopWidth).toBe("0px")
    // On the dialog's own colour (it is kept at the foot as the rest
    // scrolls under it): no band of another.
    await expect(footer.backgroundColor).toBe(
      getComputedStyle(open).backgroundColor
    )
    // A text field's edge the light `field` grey, not the 3:1 `input`.
    const model = within(open).getByLabelText("Model")
    const probe = document.createElement("span")
    probe.className = "border border-field"
    open.append(probe)
    await expect(getComputedStyle(model).borderTopColor).toBe(
      getComputedStyle(probe).borderTopColor
    )
    probe.remove()
  },
}

export const ScrollableContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Release notes
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release notes</DialogTitle>
          <DialogDescription>What changed in this run.</DialogDescription>
        </DialogHeader>
        <div
          className="-mx-4 max-h-[50vh] overflow-y-auto px-4"
          role="region"
          aria-label="Notes"
          tabIndex={0}
        >
          {Array.from({ length: 10 }).map((_, index) => (
            <p key={index} className="mb-4 leading-normal">
              Step {index + 1}: the agent read the workspace, called a tool,
              checked the output and wrote a summary of what it found before
              moving on to the next step.
            </p>
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Release notes" }))
    const dialog = await body.findByRole("dialog", { name: "Release notes" })
    const notes = within(dialog).getByRole("region", { name: "Notes" })
    await waitFor(() => expect(notes).toBeVisible())
    // The scroll region is focusable, so it gets the initial focus.
    await waitFor(() => expect(notes).toHaveFocus())
  },
}

export const NoCloseButton: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        No close button
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>No close button</DialogTitle>
          <DialogDescription>
            This dialog has no close button in the corner.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "No close button" })
    )
    const dialog = await body.findByRole("dialog", { name: "No close button" })
    const closes = within(dialog).getAllByRole("button", { name: "Close" })
    await expect(closes).toHaveLength(1)
    await userEvent.click(closes[0])
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/** The close buttons' names in the app's language. */
export const CloseLabel: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Umbenennen
      </DialogTrigger>
      <DialogContent closeLabel="Schließen">
        <DialogHeader>
          <DialogTitle>Umbenennen</DialogTitle>
          <DialogDescription>
            Gib dieser Unterhaltung einen Namen, unter dem du sie wiederfindest.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton closeLabel="Abbrechen" />
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Umbenennen" }))
    const dialog = await body.findByRole("dialog", { name: "Umbenennen" })
    await expect(
      within(dialog).getByRole("button", { name: "Schließen" })
    ).toBeInTheDocument()
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Abbrechen" })
    )
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

const clauses = Array.from({ length: 24 }, (_, index) => (
  <p key={index}>
    Clause {index + 1}. The agent may read and edit files in this project, run
    its commands and reach the network through the proxy you set.
  </p>
))

/**
 * Taller than the window: no taller than it, 1rem from its edges; its
 * body (DialogBody) scrolls, its header and footer in place.
 */
export const TallerThanTheWindow: Story = {
  ...windowOf("short", 800, 480),
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Terms</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terms of use</DialogTitle>
          <DialogDescription>Read them before you start.</DialogDescription>
        </DialogHeader>
        <DialogBody>{clauses}</DialogBody>
        <DialogFooter>
          <DialogClose render={<Button />}>Accept</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Terms" }))
    const dialog = await body.findByRole("dialog")
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect(box.top).toBeGreaterThanOrEqual(15.5)
      expect(box.bottom).toBeLessThanOrEqual(window.innerHeight - 15.5)
    })
    const scroller = dialog.querySelector<HTMLElement>(
      "[data-slot=dialog-body]"
    )!
    await expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
    await expect(dialog.scrollHeight).toBeLessThanOrEqual(dialog.clientHeight)
    const accept = within(dialog).getByRole("button", { name: "Accept" })
    await expect(accept.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      dialog.getBoundingClientRect().bottom
    )
    await userEvent.click(accept)
  },
}

function WideDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Pick a folder
      </DialogTrigger>
      <DialogContent size="wide">
        <DialogHeader>
          <DialogTitle>Pick a folder</DialogTitle>
          <DialogDescription>A list and a view beside it.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

/**
 * `size="wide"`: a picker's, 768px wide and 640px tall whatever it
 * shows, so it does not jump as its content changes.
 */
export const Wide: Story = {
  ...windowOf("laptop", 1280, 800),
  render: () => <WideDialog />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Pick a folder" }))
    const dialog = await body.findByRole("dialog", { name: "Pick a folder" })
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect([box.width, box.height]).toEqual([768, 640])
    })
  },
}

function FullDialog({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Read</DialogTrigger>
      <DialogContent size="full" className={className}>
        <DialogHeader>
          <DialogTitle>Release notes</DialogTitle>
          <DialogDescription>A reader over the app.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

/** `size="full"`: a reader's, the window but for 32px round it. */
export const Full: Story = {
  ...windowOf("laptop", 1280, 800),
  render: () => <FullDialog />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Read" }))
    const dialog = await body.findByRole("dialog", { name: "Release notes" })
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect([box.left, box.top, box.width, box.height]).toEqual([
        32,
        32,
        window.innerWidth - 64,
        window.innerHeight - 64,
      ])
    })
  },
}

/** With a max width (a table's preview): centred, as tall as the rest. */
export const FullWithAMaxWidth: Story = {
  ...windowOf("laptop", 1280, 800),
  render: () => <FullDialog className="sm:max-w-3xl" />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Read" }))
    const dialog = await body.findByRole("dialog", { name: "Release notes" })
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect([box.left, box.top, box.width, box.height]).toEqual([
        (window.innerWidth - 768) / 2,
        32,
        768,
        window.innerHeight - 64,
      ])
    })
  },
}

/** On a phone, the whole screen. */
export const FullOnAPhone: Story = {
  ...onAPhone,
  render: () => <FullDialog />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Read" }))
    const dialog = await body.findByRole("dialog", { name: "Release notes" })
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect([box.left, box.top, box.width, box.height]).toEqual([
        0,
        0,
        window.innerWidth,
        window.innerHeight,
      ])
    })
  },
}

/** On a phone, the whole screen. */
export const WideOnAPhone: Story = {
  ...onAPhone,
  render: () => <WideDialog />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Pick a folder" }))
    const dialog = await body.findByRole("dialog", { name: "Pick a folder" })
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect([box.left, box.top, box.width, box.height]).toEqual([
        0,
        0,
        window.innerWidth,
        window.innerHeight,
      ])
    })
  },
}

/** The middle of an element's box, down the page. */
const middle = (element: Element) => {
  const box = element.getBoundingClientRect()
  return box.top + box.height / 2
}

/**
 * The close button on the title's middle line, and the header clear of
 * it: a long title wraps before it, not under it.
 */
export const CloseOnTheTitleLine: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Rename the conversation about the registry's failing build
          </DialogTitle>
          <DialogDescription>A new name for it.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const dialog = await body.findByRole("dialog")
    const close = within(dialog).getByRole("button", { name: "Close" })
    const title = dialog.querySelector("[data-slot=dialog-title]")!
    const header = dialog.querySelector("[data-slot=dialog-header]")!
    await waitFor(() =>
      expect(
        Math.abs(
          middle(close) -
            (title.getBoundingClientRect().top +
              parseFloat(getComputedStyle(title).lineHeight) / 2)
        )
      ).toBeLessThan(1)
    )
    await expect(
      title.getBoundingClientRect().right -
        parseFloat(getComputedStyle(title).paddingRight)
    ).toBeLessThanOrEqual(close.getBoundingClientRect().left)
    // Its description, under the button, the header's whole width.
    await expect(getComputedStyle(header).paddingRight).toBe("0px")
  },
}

function SheetDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Terms</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terms of use</DialogTitle>
          <DialogDescription>Read them before you start.</DialogDescription>
        </DialogHeader>
        {clauses}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Later</DialogClose>
          <DialogClose render={<Button />}>Accept</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * On a phone, a sheet from the bottom: the screen's width, its top
 * corners round; its title scrolls with the rest, its footer kept at the
 * foot, clear of the home indicator; the close button on the title's
 * line.
 */
export const OnAPhone: Story = {
  ...onAPhone,
  render: () => <SheetDialog />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Terms" }))
    const dialog = await body.findByRole("dialog", { name: "Terms of use" })
    await onDialogTracks(dialog)
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect([box.left, box.width, Math.round(box.bottom)]).toEqual([
        0,
        window.innerWidth,
        window.innerHeight,
      ])
    })
    await expect(getComputedStyle(dialog).borderBottomLeftRadius).toBe("0px")
    await expect(getComputedStyle(dialog).borderTopLeftRadius).not.toBe("0px")
    const close = within(dialog).getByRole("button", { name: "Close" })
    const title = within(dialog).getByRole("heading", { name: "Terms of use" })
    await expect(Math.abs(middle(close) - middle(title))).toBeLessThan(1)
    // The whole sheet scrolls, its title with it; the footer stays.
    await expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight)
    const footer = dialog.querySelector("[data-slot=dialog-footer]")!
    await expect(Math.round(footer.getBoundingClientRect().bottom)).toBe(
      Math.round(dialog.getBoundingClientRect().bottom)
    )
    const before = title.getBoundingClientRect().top
    dialog.scrollTop = 120
    await waitFor(() =>
      expect(title.getBoundingClientRect().top).toBeLessThan(before - 100)
    )
    await expect(Math.round(footer.getBoundingClientRect().bottom)).toBe(
      Math.round(dialog.getBoundingClientRect().bottom)
    )
  },
}

/** On a short phone screen (on its side), the footer's buttons in a row. */
export const OnAShortPhone: Story = {
  ...windowOf("small landscape", 568, 320),
  render: () => <SheetDialog />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Terms" }))
    const dialog = await body.findByRole("dialog", { name: "Terms of use" })
    const later = within(dialog).getByRole("button", { name: "Later" })
    const accept = within(dialog).getByRole("button", { name: "Accept" })
    await waitFor(() =>
      expect(later.getBoundingClientRect().top).toBe(
        accept.getBoundingClientRect().top
      )
    )
    await expect(accept.getBoundingClientRect().left).toBeGreaterThan(
      later.getBoundingClientRect().left
    )
  },
}

/**
 * `size="wide"`, its height fixed: a list filling it (`flex-1`) and a
 * footer after it, at its foot, not lifted to where it would stick.
 */
export const WideWithAFooter: Story = {
  ...windowOf("laptop", 1100, 760),
  render: () => (
    <Dialog defaultOpen>
      {/* Not clipped, as an app's may be (a popup out of it). */}
      <DialogContent size="wide" className="overflow-visible">
        <DialogHeader>
          <DialogTitle>Pick a model</DialogTitle>
          <DialogDescription>One for this conversation.</DialogDescription>
        </DialogHeader>
        <Command className="min-h-0 flex-1">
          <CommandInput placeholder="Search models" />
          <CommandList className="max-h-none flex-1">
            {Array.from({ length: 6 }, (_, index) => (
              <CommandItem key={index}>Model {index + 1}</CommandItem>
            ))}
          </CommandList>
        </Command>
        <DialogFooter>
          <DialogClose render={<Button />}>Use it</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const dialog = await body.findByRole("dialog", { name: "Pick a model" })
    const footer = dialog.querySelector("[data-slot=dialog-footer]")!
    await waitFor(() =>
      expect(
        Math.round(
          dialog.getBoundingClientRect().bottom -
            footer.getBoundingClientRect().bottom
        )
      ).toBe(16)
    )
  },
} /**
 * A dialog's tracks: its title, its words and its fields start on its
 * leading line; its close glyph, its fields and its footer's last button
 * end on its trailing line.
 */
async function onDialogTracks(dialog: HTMLElement) {
  await settled(dialog)
  const buttons = dialog.querySelectorAll("[data-slot=dialog-footer] button")
  const field = dialog.querySelector("input")
  await onOneLine(
    "dialog leading line",
    {
      title: dialog.querySelector("[data-slot=dialog-title]"),
      description: dialog.querySelector("[data-slot=dialog-description]"),
      field,
    },
    { least: 2 }
  )
  await onOneLine(
    "dialog trailing line",
    {
      close: dialog.querySelector("[data-slot=dialog-close] svg"),
      field,
      footer: buttons[buttons.length - 1],
    },
    { edge: "end", least: 2 }
  )
}
