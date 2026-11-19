import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import {
  Browser,
  useBrowser,
  type BrowserRemote,
  type BrowserRemoteInput,
} from "@/components/browser"

/** A made-up page as a remote browser would draw it, at a viewport's size. */
const frameOf = (width: number, height: number, label = "Pricing") =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#fafafa"/><rect x="24" y="24" width="${Math.max(0, width - 48)}" height="56" rx="8" fill="#e4e4e7"/><text x="40" y="60" font-family="sans-serif" font-size="20" fill="#18181b">${label}</text><rect x="24" y="112" width="160" height="40" rx="8" fill="#18181b"/></svg>`
  )}`

const received = fn<(input: BrowserRemoteInput) => void>()
const copied = fn()
const viewChanged = fn()

/**
 * The panel's browser on a remote page: the app's side played here, its
 * frames drawn at the size the page's room says, the input recorded.
 */
function Remote({
  initial = {},
  pending = false,
  field = false,
}: {
  initial?: Partial<BrowserRemote>
  pending?: boolean
  /** The page's search field, its grey bar: a press in it puts a caret there. */
  field?: boolean
}) {
  const [remote, setRemote] = React.useState<BrowserRemote>(initial)
  const browser = useBrowser({
    defaultValue: {
      tabs: [
        {
          id: "browser",
          pages: [
            {
              id: "browser",
              title: "Browser",
              location: "https://example.com/pricing",
              content: {
                type: "web",
                url: "https://example.com/pricing",
                running: true,
                remote: {},
              },
            },
          ],
          index: 0,
          pinned: true,
        },
      ],
      active: "browser",
    },
  })
  const { update } = browser
  React.useEffect(() => {
    update({
      id: "browser",
      title: "Browser",
      location: "https://example.com/pricing",
      content: {
        type: "web",
        url: "https://example.com/pricing",
        running: true,
        remote,
      },
    })
  }, [update, remote])
  return (
    <div
      data-testid="frame"
      className="h-150 w-140.5 max-w-full overflow-hidden rounded-xl border"
    >
      <Browser
        browser={browser}
        onRemoteInput={(_, input) => {
          received(input)
          // The remote browser: a viewport the page's size, drawn.
          if (input.type === "resize" && !pending)
            setRemote((current) => ({
              ...current,
              frame: {
                src: frameOf(input.width, input.height),
                width: input.width,
                height: input.height,
              },
            }))
          // A press focuses the field it is in, or nothing, as the page
          // says a moment later.
          if (field && input.type === "pointer" && input.action === "down") {
            const inField = input.y >= 24 && input.y <= 80
            setTimeout(
              () =>
                setRemote((current) => ({
                  ...current,
                  caret: inField
                    ? { x: 40, y: 40, width: 1, height: 20 }
                    : undefined,
                })),
              50
            )
          }
          if (input.type === "select" || input.type === "select-cancel")
            setRemote((current) => ({ ...current, select: undefined }))
          if (input.type === "dialog")
            setRemote((current) => ({ ...current, dialog: undefined }))
        }}
        copyRemoteSelection={async () => {
          copied()
          return "Pro plan"
        }}
        onWebViewChange={(page, view) => viewChanged(page.id, view)}
        remoteShortcut={(event) =>
          (event.metaKey || event.ctrlKey) && event.key === "k"
        }
      />
    </div>
  )
}

const meta = {
  title: "Components/Browser/Remote page",
  component: Remote,
  parameters: { layout: "padded" },
  beforeEach: () => {
    received.mockClear()
    copied.mockClear()
    viewChanged.mockClear()
  },
} satisfies Meta<typeof Remote>

export default meta
type Story = StoryObj<typeof meta>

/** The inputs of a kind the page was sent, in order. */
const sent = <Type extends BrowserRemoteInput["type"]>(type: Type) =>
  received.mock.calls
    .map(([input]) => input)
    .filter(
      (input): input is Extract<BrowserRemoteInput, { type: Type }> =>
        input.type === type
    )

async function drawn(canvasElement: HTMLElement) {
  return waitFor(() => {
    const image = canvasElement.querySelector<HTMLImageElement>(
      "[data-slot=browser-remote] img"
    )
    expect(image).not.toBeNull()
    expect(image!.complete).toBe(true)
    return image!
  })
}

/**
 * Before its first frame, a spinner; its room said at once, the app
 * sizing the remote viewport to it; then the page, as wide as the panel.
 */
export const Frames: Story = {
  play: async ({ canvasElement }) => {
    const remote = canvasElement.querySelector<HTMLElement>(
      "[data-slot=browser-remote]"
    )!
    await waitFor(() => expect(sent("resize").length).toBeGreaterThan(0))
    const size = sent("resize")[0]!
    await expect(size.width).toBe(remote.offsetWidth)
    await expect(size.height).toBe(remote.offsetHeight)
    await expect(size.devicePixelRatio).toBe(window.devicePixelRatio)
    const image = await drawn(canvasElement)
    await expect(remote).not.toHaveAttribute("data-pending")
    await expect(Math.round(image.getBoundingClientRect().width)).toBe(
      remote.offsetWidth
    )
  },
}

/** No frame yet: a spinner, named for those who do not see it. */
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvas, canvasElement }) => {
    await expect(
      await canvas.findByRole("status", { name: "Connecting" })
    ).toBeVisible()
    await expect(
      canvasElement.querySelector("[data-slot=browser-remote]")
    ).toHaveAttribute("data-pending")
  },
}

/**
 * The pointer in the page's CSS pixels: a press and its release, a
 * second soon after a double click; the wheel the page's, not the
 * panel's; the page's cursor shown.
 */
export const Pointer: Story = {
  args: { initial: { cursor: "pointer" } },
  play: async ({ canvasElement }) => {
    const image = await drawn(canvasElement)
    const remote = canvasElement.querySelector<HTMLElement>(
      "[data-slot=browser-remote]"
    )!
    await expect(getComputedStyle(remote).cursor).toBe("pointer")
    const box = image.getBoundingClientRect()
    const target = { x: box.left + 100, y: box.top + 130 }
    const at = {
      target: remote,
      coords: { clientX: target.x, clientY: target.y },
    }
    await userEvent.pointer([at, { keys: "[MouseLeft]", ...at }])
    const frame = sent("resize").at(-1)!
    const downs = sent("pointer").filter((input) => input.action === "down")
    await expect(downs).toHaveLength(1)
    await expect(downs[0]!.x).toBeCloseTo((100 / box.width) * frame.width, 1)
    await expect(downs[0]!.y).toBeCloseTo((130 / box.height) * frame.height, 1)
    await expect(downs[0]!.button).toBe(0)
    await expect(downs[0]!.clickCount).toBe(1)
    await userEvent.pointer({ keys: "[MouseLeft]", ...at })
    const clicks = sent("pointer")
      .filter((input) => input.action === "down")
      .map((input) => input.clickCount)
    await expect(clicks).toEqual([1, 2])
    await expect(
      sent("pointer").filter((input) => input.action === "up")
    ).toHaveLength(2)
    // The wheel: the page scrolls, the panel does not.
    const wheel = new WheelEvent("wheel", {
      clientX: target.x,
      clientY: target.y,
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    })
    await expect(remote.dispatchEvent(wheel)).toBe(false)
    await expect(sent("wheel").at(-1)).toMatchObject({ deltaY: 120 })
  },
}

/** A tap at a point of the page, as a finger's or a pen's. */
function tap(target: HTMLElement, x: number, y: number, pointerType = "touch") {
  for (const type of ["pointerdown", "pointerup"])
    target.dispatchEvent(
      new PointerEvent(type, {
        pointerType,
        pointerId: 7,
        isPrimary: true,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
      })
    )
}

/**
 * By touch, a tap anywhere on the page focuses the field for keys but asks
 * for no keyboard on the screen (inputmode none); a tap in one of the
 * page's fields, once the page says it has the caret, asks for it; a
 * tap out of it puts it away. A mouse's press asks for it always, as before.
 */
export const TouchKeyboard: Story = {
  args: { field: true },
  play: async ({ canvasElement }) => {
    const image = await drawn(canvasElement)
    const remote = canvasElement.querySelector<HTMLElement>(
      "[data-slot=browser-remote]"
    )!
    const input = canvasElement.querySelector<HTMLTextAreaElement>(
      "[data-slot=browser-remote-input]"
    )!
    const box = image.getBoundingClientRect()
    const scale = box.width / sent("resize").at(-1)!.width
    // Off any field: focused, no keyboard.
    tap(remote, box.left + 100 * scale, box.top + 300 * scale)
    await expect(document.activeElement).toBe(input)
    await expect(input.inputMode).toBe("none")
    await expect(sent("pointer").at(-1)).toMatchObject({ pointerType: "touch" })
    // In the field: once the caret is there, the keyboard.
    tap(remote, box.left + 100 * scale, box.top + 50 * scale)
    await waitFor(() => expect(input.inputMode).toBe("text"))
    await expect(document.activeElement).toBe(input)
    // Out of it again: put away, the focus kept for a keyboard's keys.
    tap(remote, box.left + 100 * scale, box.top + 300 * scale)
    await waitFor(() => expect(input.inputMode).toBe("none"))
    await expect(document.activeElement).toBe(input)
    // A pen as a finger.
    tap(remote, box.left + 100 * scale, box.top + 320 * scale, "pen")
    await expect(input.inputMode).toBe("none")
    // A mouse: as before, the field asks for text at once.
    tap(remote, box.left + 100 * scale, box.top + 300 * scale, "mouse")
    await expect(input.inputMode).toBe("text")
    await expect(document.activeElement).toBe(input)
  },
}

/**
 * Keys go to the page once it is clicked: their text with them, Tab and
 * the arrows too (the focus stays), Enter as "\r"; the app's shortcut
 * not; a copy asks the app for the page's selection.
 */
export const Keys: Story = {
  play: async ({ canvasElement }) => {
    await drawn(canvasElement)
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>("[data-slot=browser-remote]")!
    )
    const field = canvasElement.querySelector<HTMLTextAreaElement>(
      "[data-slot=browser-remote-input]"
    )!
    await expect(field).toHaveFocus()
    await userEvent.keyboard("a{Tab}{ArrowDown}{Enter}")
    await expect(field).toHaveFocus()
    const downs = sent("key").filter((input) => input.action === "down")
    await expect(downs.map((input) => [input.key, input.text])).toEqual([
      ["a", "a"],
      ["Tab", undefined],
      ["ArrowDown", undefined],
      ["Enter", "\r"],
    ])
    await expect(
      sent("key").filter((input) => input.action === "up")
    ).toHaveLength(4)
    // Nothing typed into the field itself.
    await expect(field.value).toBe("")
    await expect(sent("text")).toHaveLength(0)
    // The app's own shortcut is the app's.
    const before = sent("key").length
    await userEvent.keyboard("{Control>}k{/Control}")
    await expect(sent("key").filter((input) => input.key === "k")).toHaveLength(
      0
    )
    await expect(sent("key").length).toBe(before + 2)
    // A copy: the page's selection, from the app.
    await userEvent.keyboard("{Control>}c{/Control}")
    await waitFor(() => expect(copied).toHaveBeenCalledTimes(1))
  },
}

/**
 * An input method's text composes at the page's caret: its composition
 * sent as it goes and as it ends, apart from the keys; a paste its text.
 */
export const Composition: Story = {
  args: { initial: { caret: { x: 40, y: 120, width: 1, height: 20 } } },
  play: async ({ canvasElement }) => {
    const image = await drawn(canvasElement)
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>("[data-slot=browser-remote]")!
    )
    const field = canvasElement.querySelector<HTMLTextAreaElement>(
      "[data-slot=browser-remote-input]"
    )!
    // At the caret.
    const box = image.getBoundingClientRect()
    const frame = sent("resize").at(-1)!
    await expect(field.getBoundingClientRect().left - box.left).toBeCloseTo(
      (40 / frame.width) * box.width,
      0
    )
    await expect(field.getBoundingClientRect().top - box.top).toBeCloseTo(
      (120 / frame.height) * box.height,
      0
    )
    field.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true, data: "" })
    )
    field.dispatchEvent(
      new CompositionEvent("compositionupdate", { bubbles: true, data: "に" })
    )
    field.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "日本" })
    )
    await expect(
      sent("composition").map((input) => [input.action, input.text])
    ).toEqual([
      ["start", ""],
      ["update", "に"],
      ["end", "日本"],
    ])
    const paste = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    })
    paste.clipboardData!.setData("text/plain", "hello@example.com")
    field.dispatchEvent(paste)
    await expect(sent("paste")).toEqual([
      { type: "paste", text: "hello@example.com" },
    ])
  },
}

/**
 * A native select the page opened: agentui's list under its box, the
 * chosen one ticked; a choice sent, or Escape a cancel.
 */
export const Select: Story = {
  args: {
    initial: {
      select: {
        box: { x: 24, y: 112, width: 160, height: 40 },
        options: [
          { label: "Monthly", value: "month", selected: true },
          { label: "Yearly", value: "year" },
          { label: "Lifetime", value: "life", disabled: true },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    await drawn(canvasElement)
    const body = within(document.body)
    const list = await body.findByRole("listbox")
    await expect(
      within(list).getByRole("option", { name: "Monthly" })
    ).toHaveAttribute("aria-selected", "true")
    await expect(
      within(list).getByRole("option", { name: "Lifetime" })
    ).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(within(list).getByRole("option", { name: "Yearly" }))
    await expect(sent("select")).toEqual([{ type: "select", values: ["year"] }])
    await expect(sent("pointer")).toHaveLength(0)
    await waitFor(() => expect(body.queryByRole("listbox")).toBeNull())
  },
}

/** A select's popup closed by Escape: a cancel. */
export const SelectCancel: Story = {
  args: Select.args,
  play: async ({ canvasElement }) => {
    await drawn(canvasElement)
    const body = within(document.body)
    await body.findByRole("listbox")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(sent("select-cancel")).toHaveLength(1))
    await expect(sent("select")).toHaveLength(0)
  },
}

/** A prompt the page's script opened: its text answered, or cancelled. */
export const Prompt: Story = {
  args: {
    initial: {
      dialog: {
        type: "prompt",
        message: "Your team's name?",
        defaultText: "acme",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await drawn(canvasElement)
    const body = within(document.body)
    const dialog = await body.findByRole("alertdialog")
    await waitFor(() =>
      expect(within(dialog).getByText("example.com says")).toBeVisible()
    )
    const field = within(dialog).getByRole("textbox")
    await expect(field).toHaveValue("acme")
    await userEvent.clear(field)
    await userEvent.type(field, "acme labs")
    await userEvent.click(within(dialog).getByRole("button", { name: "OK" }))
    await expect(sent("dialog")).toEqual([
      { type: "dialog", accept: true, text: "acme labs" },
    ])
    // Its clicks were its own, none the page's.
    await expect(sent("pointer")).toHaveLength(0)
  },
}

/** A page that asks before it is left: Stay is a dismissal. */
export const BeforeUnload: Story = {
  args: {
    initial: {
      dialog: {
        type: "beforeunload",
        message: "Changes you made may not be saved.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await drawn(canvasElement)
    const dialog = await within(document.body).findByRole("alertdialog", {
      name: "Leave this page?",
    })
    await userEvent.click(within(dialog).getByRole("button", { name: "Stay" }))
    await expect(sent("dialog")).toEqual([{ type: "dialog", accept: false }])
  },
}

/**
 * The dark scheme on a remote page is the app's to apply there: the
 * view's change is given by `onWebViewChange`, with the page.
 */
export const DarkScheme: Story = {
  play: async ({ canvas, canvasElement }) => {
    await drawn(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Viewport" }))
    const menu = within(document.body)
    const dark = await menu.findByRole("switch", { name: "Dark color scheme" })
    await userEvent.click(dark)
    await expect(viewChanged).toHaveBeenLastCalledWith(
      "browser",
      expect.objectContaining({ dark: true, device: "fill" })
    )
    await userEvent.click(dark)
    await expect(viewChanged).toHaveBeenLastCalledWith(
      "browser",
      expect.objectContaining({ dark: false })
    )
    await userEvent.keyboard("{Escape}")
  },
}
