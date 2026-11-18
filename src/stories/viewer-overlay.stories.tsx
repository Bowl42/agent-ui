import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import { Folder01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ViewerTool } from "@/components/viewer"
import { Composer, ComposerEditor } from "@/components/composer"
import { MediaViewer } from "@/components/media-viewer"
import { quiet } from "@/stories/wait"
import { ViewerOverlay } from "@/components/viewer-overlay"

/** A picture of a size, with its name on it. */
const picture = (label: string, width: number, height: number, hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(${hue} 30% 80%)"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.min(width, height) / 8}" text-anchor="middle" dominant-baseline="middle" fill="#1a1a1a">${label}</text></svg>`
  )}`

const images = [
  { id: "icon", label: "App icon", src: picture("App icon", 1200, 1200, 40) },
  { id: "home", label: "Home page", src: picture("Home page", 1600, 900, 210) },
  {
    id: "mark",
    label: "Small mark",
    src: picture("Small mark", 900, 1200, 90),
  },
  { id: "inbox", label: "Inbox", src: picture("Inbox", 1600, 900, 300) },
]

const toPanel = fn()
const submitted = fn()

function Demo({
  withDock = true,
  frame = true,
  count = images.length,
  pending = false,
  more = false,
  versions = false,
}: {
  withDock?: boolean
  frame?: boolean
  /** How many of the images the conversation has. */
  count?: number
  /** Its last two not ready: one loading, one not fetched. */
  pending?: boolean
  /** Marking, an action of the app's and more of them in a menu. */
  more?: boolean
  /** The image shown an edit of an earlier one. */
  versions?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [id, setId] = React.useState(images[Math.min(1, count - 1)]!.id)
  const image = images.find((each) => each.id === id)!
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        View image
      </Button>
      <ViewerOverlay
        open={open}
        onOpenChange={setOpen}
        label={image.label}
        items={images
          .slice(0, count)
          .map(({ id, label, src }) =>
            pending && id === "mark"
              ? { id, label, loading: true }
              : pending && id === "inbox"
                ? { id, label }
                : { id, label, thumbnail: src }
          )}
        value={id}
        onValueChange={setId}
        onOpenInPanel={() => {
          setOpen(false)
          toPanel(id)
        }}
        dock={
          withDock ? (
            <Composer onSubmit={submitted}>
              <ComposerEditor
                aria-label="Message"
                placeholder="Ask about this image"
              />
            </Composer>
          ) : undefined
        }
      >
        {frame ? (
          <MediaViewer
            kind="image"
            name={`${image.id}.png`}
            src={image.src}
            alt={image.label}
            download={fn()}
            details={["PNG"]}
            {...(versions
              ? {
                  versions: [{ src: images[0]!.src, alt: "The first draft" }],
                }
              : {})}
            {...(more
              ? {
                  onMark: async () => {},
                  actions: (
                    <ViewerTool label="Show in library" onClick={() => {}}>
                      <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
                    </ViewerTool>
                  ),
                  menu: (
                    <>
                      <DropdownMenuItem>Open in Preview</DropdownMenuItem>
                      <DropdownMenuItem>Open with default app</DropdownMenuItem>
                    </>
                  ),
                }
              : {})}
          />
        ) : (
          <img src={image.src} alt={image.label} className="object-contain" />
        )}
      </ViewerOverlay>
    </>
  )
}

const meta = {
  title: "Components/Viewer Overlay",
  component: Demo,
  parameters: { layout: "centered" },
  beforeEach: () => {
    toPanel.mockClear()
    submitted.mockClear()
  },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

async function openOverlay(canvas: ReturnType<typeof within>) {
  await userEvent.click(canvas.getByRole("button", { name: "View image" }))
  const dialog = await screen.findByRole("dialog", { name: "Home page" })
  await waitFor(() => expect(dialog).toBeVisible())
  // Once it has come in: measured as it stands.
  await quiet(dialog)
  return dialog
}

/**
 * An image over the whole window, to its edges, one surface: the
 * viewer's toolbar the window's top row, its name at its start, Open in
 * side panel and Close at its end; the strip of the conversation's
 * images at the start under it, the shown one current; the composer
 * under the image.
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    // The window, once it has come in: no edge round it, no card in it.
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect(box.left).toBeCloseTo(0, 0)
      expect(box.top).toBeCloseTo(0, 0)
      expect(box.right).toBeCloseTo(window.innerWidth, 0)
      expect(box.bottom).toBeCloseTo(window.innerHeight, 0)
    })
    await expect(getComputedStyle(dialog).borderTopLeftRadius).toBe("0px")
    const stage = dialog.querySelector<HTMLElement>(
      "[data-slot=viewer-overlay-stage]"
    )!
    await expect(getComputedStyle(stage).boxShadow).toBe("none")
    await expect(getComputedStyle(stage).borderTopLeftRadius).toBe("0px")
    // Its toolbar the top row, 44px, its name at its start; Open in side
    // panel and Close at its end; no status bar.
    const toolbar = await waitFor(() =>
      dialog.querySelector<HTMLElement>("[data-slot=viewer-toolbar]")!
    )
    await expect(toolbar.getBoundingClientRect().top).toBeCloseTo(0, 0)
    await expect(toolbar.getBoundingClientRect().height).toBe(44)
    await expect(toolbar).toHaveTextContent(/^home\.png/)
    await expect(
      within(toolbar).getByRole("button", { name: "Open in side panel" })
    ).toBeVisible()
    const close = within(toolbar).getByRole("button", { name: "Close" })
    await expect(
      dialog.querySelector("[data-slot=viewer-status-bar]")
    ).toBeNull()
    await expect(
      within(dialog).getAllByRole("button", { name: "Close" })
    ).toHaveLength(1)
    // The strip.
    const strip = within(dialog).getByRole("navigation", { name: "Images" })
    await expect(within(strip).getAllByRole("button")).toHaveLength(4)
    await expect(
      within(strip).getByRole("button", { name: "Home page" })
    ).toHaveAttribute("aria-current", "true")
    await userEvent.click(
      within(strip).getByRole("button", { name: "Small mark" })
    )
    await expect(
      await screen.findByRole("dialog", { name: "Small mark" })
    ).toBeInTheDocument()
    // The composer under the viewer, to ask about it.
    const editor = within(dialog).getByRole("textbox", { name: "Message" })
    await expect(
      dialog
        .querySelector("[data-slot=viewer-overlay-stage]")!
        .getBoundingClientRect().bottom
    ).toBeLessThanOrEqual(editor.getBoundingClientRect().top)
    await userEvent.click(close)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await expect(
      canvas.getByRole("button", { name: "View image" })
    ).toHaveFocus()
  },
}

/**
 * ← → go to the one before and after, not past the ends; not while
 * typing in the composer, whose arrows move the caret.
 */
export const Keys: Story = {
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    await userEvent.keyboard("{ArrowRight}")
    await screen.findByRole("dialog", { name: "Small mark" })
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}")
    await screen.findByRole("dialog", { name: "App icon" })
    const editor = within(dialog).getByRole("textbox", { name: "Message" })
    await userEvent.click(editor)
    await userEvent.keyboard("Is it sharp?{ArrowLeft}{ArrowRight}")
    await expect(screen.getByRole("dialog")).toHaveAccessibleName("App icon")
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(submitted).toHaveBeenCalledTimes(1))
    await userEvent.keyboard("{Escape}")
  },
}

/**
 * Round buttons by the viewer's sides go to the one before and after,
 * for a pointer or a finger; at the ends, the one that would go past is
 * disabled.
 */
export const PreviousNext: Story = {
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    const previous = within(dialog).getByRole("button", {
      name: "Previous image",
    })
    const next = within(dialog).getByRole("button", { name: "Next image" })
    await userEvent.click(previous)
    await screen.findByRole("dialog", { name: "App icon" })
    await expect(previous).toBeDisabled()
    await userEvent.click(next)
    await userEvent.click(next)
    await userEvent.click(next)
    await screen.findByRole("dialog", { name: "Inbox" })
    await expect(next).toBeDisabled()
  },
}

/**
 * Items not ready are in the strip, in their order: a placeholder for
 * one with no thumbnail yet (picked, the app loads it), a spinner for
 * one loading.
 */
export const NotReady: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    const strip = within(dialog).getByRole("navigation", { name: "Images" })
    await expect(within(strip).getAllByRole("button")).toHaveLength(4)
    const inbox = within(strip).getByRole("button", { name: "Inbox" })
    await expect(inbox.querySelector("img")).toBeNull()
    await expect(inbox.querySelector("svg")).not.toBeNull()
    const mark = within(strip).getByRole("button", { name: "Small mark" })
    await expect(mark).toHaveAttribute("aria-busy", "true")
    await expect(mark.querySelector("img")).toBeNull()
    await userEvent.click(inbox)
    await screen.findByRole("dialog", { name: "Inbox" })
  },
}

/** Open in side panel: the app's, the overlay closed. */
export const OpenInPanel: Story = {
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Open in side panel" })
    )
    await expect(toPanel).toHaveBeenCalledWith("home")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

/** A viewer with no toolbar: the overlay's own top row, its name and buttons. */
export const NoToolbar: Story = {
  args: { frame: false, withDock: false },
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    const close = await within(dialog).findByRole("button", { name: "Close" })
    await expect(close).toBeVisible()
    const row = dialog.querySelector<HTMLElement>(
      "[data-slot=viewer-overlay-bar]"
    )!
    await expect(row).toHaveTextContent("Home page")
    await expect(row).toContainElement(close)
    await expect(
      within(dialog).queryByRole("textbox", { name: "Message" })
    ).toBeNull()
    await userEvent.click(close)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

/**
 * Over an AgentApp's titlebar (`--agent-app-titlebar`), its top row in
 * the titlebar's place: as tall, its name past the window's own buttons
 * (`--agent-app-titlebar-inset`), the window dragged by it but by its
 * buttons; the strip under it, its top dragging too. The strip shows
 * even one image.
 */
export const OverTitlebar: Story = {
  args: { count: 1 },
  beforeEach: () => {
    const root = document.documentElement.style
    root.setProperty("--agent-app-titlebar", "40px")
    root.setProperty("--agent-app-titlebar-inset", "80px")
    return () => {
      root.removeProperty("--agent-app-titlebar")
      root.removeProperty("--agent-app-titlebar-inset")
    }
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "View image" }))
    const dialog = await screen.findByRole("dialog", { name: "App icon" })
    await quiet(dialog)
    await expect(dialog.getBoundingClientRect().top).toBeCloseTo(0, 0)
    const toolbar = await waitFor(() =>
      dialog.querySelector<HTMLElement>("[data-slot=viewer-toolbar]")!
    )
    await expect(toolbar.getBoundingClientRect().height).toBe(40)
    const name = toolbar.querySelector("[data-slot=viewer-name]")!
    await expect(name.getBoundingClientRect().left).toBeGreaterThanOrEqual(80)
    const strip = within(dialog).getByRole("navigation", { name: "Images" })
    await expect(within(strip).getAllByRole("button")).toHaveLength(1)
    await expect(
      strip
        .querySelector("[data-slot=viewer-overlay-item]")!
        .getBoundingClientRect().top
    ).toBeGreaterThanOrEqual(40)
    if (CSS.supports("-webkit-app-region", "drag")) {
      const region = (element: Element) =>
        getComputedStyle(element).getPropertyValue("-webkit-app-region")
      await expect(region(toolbar)).toBe("drag")
      await expect(
        region(strip.querySelector("[data-slot=viewer-overlay-items-top]")!)
      ).toBe("drag")
      await expect(
        region(within(toolbar).getByRole("button", { name: "Close" }))
      ).toBe("no-drag")
      await expect(region(dialog)).toBe("no-drag")
    }
  },
}

/**
 * On a phone: to the window's edges, no strip; the buttons by the
 * viewer's sides go through them.
 */
export const Phone: Story = {
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
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect(Math.abs(box.left)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(box.top)).toBeLessThanOrEqual(0.5)
    })
    await expect(
      within(dialog).queryByRole("navigation", { name: "Images" })
    ).toBeNull()
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Next image" })
    )
    await screen.findByRole("dialog", { name: "Small mark" })
  },
}

/**
 * Marking on a phone: its island on a row of its own over the rest, each
 * whole in the window, not scrolled out of it.
 */
export const PhoneMark: Story = {
  ...Phone,
  args: { more: true },
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    const dock = await waitFor(() =>
      dialog.querySelector<HTMLElement>("[data-slot=viewer-dock]")!
    )
    await userEvent.click(
      await within(dock).findByRole("button", { name: "Mark" })
    )
    await within(dock).findByRole("button", { name: "Lasso" })
    await quiet(dialog)
    const [edits, rest] = [
      ...dock.querySelectorAll<HTMLElement>("[data-slot=viewer-tool-group]"),
    ]
    for (const island of [edits!, rest!]) {
      await expect(island.scrollWidth).toBeLessThanOrEqual(island.clientWidth)
      const box = island.getBoundingClientRect()
      await expect(box.left).toBeGreaterThanOrEqual(0)
      await expect(box.right).toBeLessThanOrEqual(window.innerWidth)
    }
    await expect(rest!.getBoundingClientRect().top).toBeGreaterThan(
      edits!.getBoundingClientRect().bottom
    )
  },
}

/**
 * Its facts after its name in the top row, quieter; no More where the
 * app has no menu for it, for facts alone.
 */
export const FactsInRow: Story = {
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    const toolbar = await waitFor(() =>
      dialog.querySelector<HTMLElement>("[data-slot=viewer-toolbar]")!
    )
    const facts = await waitFor(() => {
      const facts = toolbar.querySelector<HTMLElement>(
        "[data-slot=viewer-name] [data-slot=viewer-facts]"
      )!
      expect(facts).toHaveTextContent("1600 × 900 · PNG")
      return facts
    })
    await expect(facts).toBeVisible()
    await expect(getComputedStyle(facts).color).not.toBe(
      getComputedStyle(toolbar.querySelector("[data-slot=viewer-name]")!).color
    )
    const dock = dialog.querySelector<HTMLElement>("[data-slot=viewer-dock]")!
    await expect(
      within(dock).getByRole("button", { name: "Download" })
    ).toBeVisible()
    await expect(
      within(dialog).queryByRole("button", { name: "More" })
    ).toBeNull()
  },
}

/** The zoom's value opens a menu of its steps, and Fit. */
export const ZoomMenu: Story = {
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    await userEvent.click(
      await within(dialog).findByRole("button", { name: /^Zoom \d+%$/ })
    )
    const menu = await screen.findByRole("menu")
    await expect(
      within(menu).getByRole("menuitemradio", { name: "Fit" })
    ).toHaveAttribute("aria-checked", "true")
    await userEvent.click(
      within(menu).getByRole("menuitemradio", { name: "200%" })
    )
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "Zoom 200%" })
      ).toBeVisible()
    )
    // Fit is in its menu alone, in the toolbar.
    await expect(
      within(dialog).queryByRole("button", { name: "Fit" })
    ).toBeNull()
  },
}

/**
 * Marking a mode of the island under the image, not a bar over it:
 * pressed, its tools come after it, then clear and send (to the
 * composer); pressed again, they go.
 */
export const MarkInDock: Story = {
  args: { more: true },
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    await expect(dialog.querySelector("[data-slot=viewer-edit-bar]")).toBeNull()
    const dock = await waitFor(() =>
      dialog.querySelector<HTMLElement>("[data-slot=viewer-dock]")!
    )
    const mark = await within(dock).findByRole("button", { name: "Mark" })
    await expect(
      within(dock).queryByRole("button", { name: "Lasso" })
    ).toBeNull()
    await userEvent.click(mark)
    await expect(mark).toHaveAttribute("aria-pressed", "true")
    const lasso = await within(dock).findByRole("button", { name: "Lasso" })
    await expect(lasso).toBeVisible()
    await expect(
      mark.compareDocumentPosition(lasso) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    // Clear and send in the island too, till there are marks not to be had.
    const clear = within(dock).getByRole("button", { name: "Clear marks" })
    const send = within(dock).getByRole("button", { name: "Edit this" })
    await expect(clear).toBeDisabled()
    await expect(send).toBeDisabled()
    await expect(
      clear.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    await userEvent.click(mark)
    await waitFor(() =>
      expect(within(dock).queryByRole("button", { name: "Lasso" })).toBeNull()
    )
  },
}

/**
 * With a mouse, the buttons to the one before and after are there while
 * it points at the image (or one has focus): the strip is the way
 * through.
 */
export const ArrowsOnHover: Story = {
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    const next = within(dialog).getByRole("button", { name: "Next image" })
    // (A test's pointer is no mouse's to the page's :hover; focus shows
    // them as pointing does.)
    if (matchMedia("(pointer: fine)").matches)
      await expect(getComputedStyle(next).opacity).toBe("0")
    await userEvent.keyboard("{Shift}")
    next.focus()
    await waitFor(() => expect(getComputedStyle(next).opacity).toBe("1"))
  },
}

/**
 * An image's versions at the row's start, after its name: the one shown
 * in words, a menu of them all, no strip under the image.
 */
export const Versions: Story = {
  args: { versions: true },
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    await expect(
      dialog.querySelector("[role=radiogroup][aria-label=Versions]")
    ).toBeNull()
    const toolbar = await waitFor(() =>
      dialog.querySelector<HTMLElement>("[data-slot=viewer-toolbar]")!
    )
    const versions = await within(toolbar).findByRole("button", {
      name: "Versions, Version 1",
    })
    await expect(
      versions.compareDocumentPosition(
        toolbar.querySelector("[data-slot=viewer-name]")!
      ) & Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy()
    await userEvent.click(versions)
    const menu = await screen.findByRole("menu")
    await userEvent.click(
      within(menu).getByRole("menuitemradio", { name: "Original" })
    )
    await waitFor(() =>
      expect(
        within(toolbar).getByRole("button", { name: "Versions, Original" })
      ).toBeVisible()
    )
  },
}

/**
 * The top row its name, then Open in side panel and Close; the image's
 * tools on an island at the middle of its foot, under the image and over
 * the composer: marking's, then the zoom (its percent), the viewer's
 * copy, the app's action, download, more (the app's rarer actions).
 */
export const TitleRowAndDock: Story = {
  args: { more: true },
  play: async ({ canvas }) => {
    const dialog = await openOverlay(canvas)
    const toolbar = await waitFor(() =>
      dialog.querySelector<HTMLElement>("[data-slot=viewer-toolbar]")!
    )
    const names = (element: Element) =>
      [...element.querySelectorAll("button, a")].map((each) =>
        (
          each.getAttribute("aria-label") ??
          each.textContent?.trim() ??
          ""
        ).replace(/\d+%/, "%")
      )
    await expect(names(toolbar)).toEqual(["Open in side panel", "Close"])
    const dock = dialog.querySelector<HTMLElement>("[data-slot=viewer-dock]")!
    await waitFor(() =>
      expect(
        within(dock).getByRole("button", { name: /^Zoom \d+%$/ })
      ).toBeVisible()
    )
    await expect(names(dock)).toEqual([
      "Mark",
      "Zoom %",
      "Copy image",
      "Show in library",
      "Download",
      "More",
    ])
    // Two islands side by side, marking's and the rest, at the middle of
    // the stage, apart from the image above them and the composer under.
    await quiet(dialog)
    const islands = [
      ...dock.querySelectorAll("[data-slot=viewer-tool-group]"),
    ].map((each) => each.getBoundingClientRect())
    await expect(islands).toHaveLength(2)
    await expect(islands[0]!.top).toBe(islands[1]!.top)
    const island = {
      left: islands[0]!.left,
      right: islands[1]!.right,
      top: islands[0]!.top,
      bottom: islands[0]!.bottom,
    }
    const content = dialog
      .querySelector("[data-slot=viewer-content]")!
      .getBoundingClientRect()
    await expect(island.top).toBeGreaterThanOrEqual(content.bottom)
    await expect(
      Math.abs(
        (island.left + island.right) / 2 - (content.left + content.width / 2)
      )
    ).toBeLessThanOrEqual(1)
    await expect(island.bottom - island.top).toBe(36)
    const editor = within(dialog).getByRole("textbox", { name: "Message" })
    await expect(island.bottom).toBeLessThan(editor.getBoundingClientRect().top)
    await userEvent.click(within(dock).getByRole("button", { name: "More" }))
    const menu = await screen.findByRole("menu")
    // Its facts after its name, not in More.
    await expect(menu).not.toHaveTextContent(/1600 × 900/)
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "Open in Preview" })
      ).toBeVisible()
    )
    await userEvent.keyboard("{Escape}")
  },
}
