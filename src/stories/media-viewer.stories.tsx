import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { LassoSelectIcon } from "@hugeicons/core-free-icons"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import { MediaViewer, type MediaViewerProps } from "@/components/media-viewer"
import { Panel, PanelMenu } from "@/stories/panel"
import { tone } from "@/stories/samples"
import { windowOf } from "@/stories/phone"
import { resolved } from "@/stories/paint"
import { holdDecode, holdLoad } from "@/stories/decode"
import { factsOf, fit, isFitted, zoomIn, zoomOf } from "@/stories/viewer-menus"

const recording = tone(48, 220)

// A waveform's peaks, as the app would have measured them.
const peaks = Array.from({ length: 96 }, (_, index) => {
  const wave =
    Math.abs(Math.sin(index * 0.7) * Math.cos(index * 0.13)) * 0.8 +
    Math.abs(Math.sin(index * 2.3)) * 0.2
  return Math.max(0.1, Math.min(1, wave))
})

const transcript = [
  {
    start: 0,
    text: "This release moves the conversation and the right panel onto one surface.",
  },
  { start: 9, text: "The composer now queues a message while a turn runs." },
  { start: 17, text: "Command enter interrupts the current turn instead." },
  {
    start: 24,
    text: "Every popover shares one row style, and the browser sits flush under its toolbar.",
  },
  { start: 36, text: "The Preview tab is now called Browser." },
]

// A page's picture, its corners transparent, so the checkerboard shows.
const picture = (light: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067"><defs><radialGradient id="g" cx="70%" cy="30%" r="60%"><stop offset="0" stop-color="hsl(240 4% ${light - 25}%)"/><stop offset="1" stop-color="hsl(240 4% ${light}%)"/></radialGradient></defs><rect x="40" y="40" width="1520" height="987" rx="48" fill="url(#g)"/><rect x="140" y="150" width="520" height="48" rx="10" fill="white" opacity=".8"/><rect x="140" y="230" width="380" height="32" rx="8" fill="white" opacity=".6"/></svg>`
  )}`

const copied = fn()
const marked = fn()

const meta = {
  title: "Components/Media Viewer",
  parameters: { layout: "padded" },
  beforeEach: () => {
    copied.mockClear()
    marked.mockClear()
  },
  decorators: [
    (Story) => (
      <Panel>
        <Story />
      </Panel>
    ),
  ],
  // One kind or another, by its `kind`: the stories' args are its props.
  args: { media: { kind: "image", name: "", src: "", alt: "" } },
  render: ({ media }) => <MediaViewer menu={<PanelMenu />} {...media} />,
} satisfies Meta<{ media: MediaViewerProps }>

export default meta
type Story = StoryObj<typeof meta>

const image = {
  kind: "image",
  name: "hero.png",
  path: [{ label: "public" }, { label: "assets" }],
  src: picture(88),
  alt: "The pricing page's hero",
  onBack: fn(),
  onAddToChat: fn(),
  download: fn(),
  details: ["PNG", "412 KB"],
} as const

const shown = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLImageElement>(
    "[data-slot=media-viewer-image]"
  )!

/**
 * An image fitted to its place on a checkerboard, its size and the app's
 * facts below; zoomed in and out by the status bar, back to fit; the keys
 * too.
 */
export const Image: Story = {
  args: { media: image },
  play: async ({ canvas, canvasElement }) => {
    // What it is at the top of More: no status bar under it.
    await waitFor(async () =>
      expect(await factsOf(canvasElement)).toBe("1600 × 1067 · PNG · 412 KB")
    )
    await expect(
      canvasElement.querySelector("[data-slot=viewer-status-bar]")
    ).toBeNull()
    // Flat, as a desktop chat app's: no corners, no shadow.
    await waitFor(() => {
      const style = getComputedStyle(shown(canvasElement))
      expect(style.boxShadow).toBe("none")
      expect(style.borderTopLeftRadius).toBe("0px")
    })
    await expect(await isFitted(canvasElement)).toBe(true)
    // Fitted: as wide as its place, edge to edge, at its shape.
    const stage = canvasElement.querySelector<HTMLElement>(
      "[data-slot=media-viewer-stage]"
    )!
    await waitFor(() =>
      expect(
        Math.round(shown(canvasElement).getBoundingClientRect().width)
      ).toBe(stage.clientWidth)
    )
    await expect(getComputedStyle(stage).backgroundImage).toContain(
      "conic-gradient"
    )
    await zoomIn(canvasElement)
    await expect(await isFitted(canvasElement)).toBe(false)
    await waitFor(() =>
      expect(
        shown(canvasElement).getBoundingClientRect().width
      ).toBeGreaterThan(stage.clientWidth)
    )
    await expect(canvas.getByRole("status", { name: /^Zoom/ })).toBeVisible()
    await fit(canvasElement)
    await expect(await isFitted(canvasElement)).toBe(true)
    // Keys on the image: + zooms in, 0 fits.
    stage.focus()
    await userEvent.keyboard("+")
    await expect(await isFitted(canvasElement)).toBe(false)
    stage.focus()
    await userEvent.keyboard("0")
    await expect(await isFitted(canvasElement)).toBe(true)
  },
}

// A ThumbHash's image, as an app draws one: a few pixels.
const blurred = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="10"><rect width="15" height="10" fill="hsl(240 4% 80%)"/></svg>'
)}`
let decoding: ReturnType<typeof holdDecode> | undefined

/**
 * Of a known size, fitted and its size said before it has loaded, its
 * thumbnail over its placeholder in its place; whole once drawn.
 */
export const ImageStandIn: Story = {
  args: {
    media: {
      ...image,
      width: 1600,
      height: 1067,
      thumbnail: picture(60),
      placeholder: blurred,
    },
  },
  beforeEach: () => {
    decoding = holdDecode()
    return () => decoding?.restore()
  },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(async () =>
      expect(await factsOf(canvasElement)).toBe("1600 × 1067 · PNG · 412 KB")
    )
    const stage = canvasElement.querySelector<HTMLElement>(
      "[data-slot=media-viewer-stage]"
    )!
    await waitFor(() =>
      expect(
        Math.round(shown(canvasElement).getBoundingClientRect().width)
      ).toBe(stage.clientWidth)
    )
    const layers = getComputedStyle(shown(canvasElement)).backgroundImage
    await expect(layers.indexOf(picture(60))).toBeGreaterThan(-1)
    await expect(layers.indexOf(picture(60))).toBeLessThan(
      layers.indexOf(blurred)
    )
    // Gone through, and closed, as it loads.
    await expect(canvas.getByRole("button", { name: "Back" })).toBeEnabled()
    decoding!.release()
    await waitFor(() =>
      expect(getComputedStyle(shown(canvasElement)).backgroundImage).toBe(
        "none"
      )
    )
  },
}

/**
 * Markable, as it loads: its thumbnail over its placeholder at its size,
 * as unmarked; the marking tools once it has loaded.
 */
export const ImageMarkStandIn: Story = {
  args: {
    media: {
      ...image,
      width: 1600,
      height: 1067,
      thumbnail: picture(60),
      placeholder: blurred,
      onMark: marked,
    },
  },
  beforeEach: () => {
    const decoding = holdDecode()
    const loading = holdLoad()
    held = { decoding, loading }
    return () => {
      decoding.restore()
      loading.restore()
    }
  },
  play: async ({ canvas, canvasElement }) => {
    const frame = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        "[data-slot=image-editor-frame]"
      )
      expect(found).not.toBeNull()
      return found!
    })
    const drawn = canvasElement.querySelector<HTMLImageElement>(
      "[data-slot=image-editor-image]"
    )!
    await waitFor(() =>
      expect(Math.round(drawn.getBoundingClientRect().width)).toBe(
        frame.clientWidth
      )
    )
    await expect(drawn).toBeVisible()
    const layers = getComputedStyle(drawn).backgroundImage
    await expect(layers.indexOf(picture(60))).toBeGreaterThan(-1)
    await expect(layers.indexOf(picture(60))).toBeLessThan(
      layers.indexOf(blurred)
    )
    await expect(canvas.queryByRole("button", { name: "Mark" })).toBeNull()
    await expect(canvasElement.querySelector("[role=status]")).toBeNull()
    held!.decoding.release()
    held!.loading.release()
    await expect(
      await canvas.findByRole("button", { name: "Mark" })
    ).toBeVisible()
    await expect(getComputedStyle(drawn).backgroundImage).toBe("none")
  },
}
let held:
  | {
      decoding: ReturnType<typeof holdDecode>
      loading: ReturnType<typeof holdLoad>
    }
  | undefined

/**
 * With the version before: a button compares them, a line dragged
 * between; the facts say when each was.
 */
const compared = {
  ...image,
  versions: [
    { src: picture(70), alt: "The hero before the edit", when: "12:01" },
  ],
  when: "12:04",
}

/**
 * Named by its tab: no path in the toolbar, its one row its zoom (its
 * percent, a menu of Fit, in and out), its tools and more (what it is at
 * the top); no status bar under it, the image as large as its place.
 */
export const ImageNoPath: Story = {
  args: { media: { ...image, start: null } },
  play: async ({ canvas, canvasElement }) => {
    const toolbar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=viewer-toolbar]"
    )!
    await expect(
      await within(toolbar).findByRole("button", { name: /^Zoom \d+%$/ })
    ).toBeVisible()
    await expect(
      canvasElement.querySelector("[data-slot=viewer-path]")
    ).toBeNull()
    await expect(
      canvasElement.querySelector("[data-slot=viewer-status-bar]")
    ).toBeNull()
    await waitFor(async () =>
      expect(await factsOf(canvasElement)).toBe("1600 × 1067 · PNG · 412 KB")
    )
    // What it shows, from the toolbar to the viewer's foot.
    const viewer = canvas.getByRole("region", { name: "hero.png" })
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=viewer-content]"
    )!
    await expect(
      Math.round(
        viewer.getBoundingClientRect().bottom -
          content.getBoundingClientRect().bottom
      )
    ).toBe(0)
  },
}

export const ImageCompare: Story = {
  args: { media: compared },
  play: async ({ canvas, canvasElement }) => {
    const compare = canvas.getByRole("button", {
      name: "Compare with the original",
    })
    await expect(compare).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(compare)
    await expect(compare).toHaveAttribute("aria-pressed", "true")
    await expect(
      await canvas.findByRole("slider", { name: "Before and after" })
    ).toBeVisible()
    await expect(await factsOf(canvasElement)).toBe(
      "Before 12:01 · After 12:04"
    )
  },
}

/**
 * Its versions in a strip under it, the original first: picking one
 * shows it, the arrow keys move between them, and the button compares
 * the one shown with the original (not the original with itself).
 */
export const ImageVersions: Story = {
  args: {
    media: {
      ...image,
      versions: [
        { src: picture(60), alt: "The hero as first made", when: "11:40" },
        { src: picture(70), alt: "The hero, lighter", when: "12:01" },
        { src: picture(78), alt: "The hero, lighter still", when: "12:02" },
      ],
      when: "12:04",
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const strip = canvas.getByRole("radiogroup", { name: "Versions" })
    const versions = within(strip).getAllByRole("radio")
    await expect(versions.map((version) => version.textContent)).toEqual([
      "Original",
      "Version 1",
      "Version 2",
      "Version 3",
    ])
    // The latest shown.
    await expect(versions[3]).toHaveAttribute("aria-checked", "true")
    await expect(shown(canvasElement)).toHaveAccessibleName(
      "The pricing page's hero"
    )
    await userEvent.click(versions[1]!)
    await expect(versions[1]).toHaveAttribute("aria-checked", "true")
    await expect(shown(canvasElement)).toHaveAccessibleName("The hero, lighter")
    await userEvent.keyboard("{ArrowRight}")
    await expect(versions[2]).toHaveFocus()
    await expect(shown(canvasElement)).toHaveAccessibleName(
      "The hero, lighter still"
    )
    // Compared with the original.
    const compare = canvas.getByRole("button", {
      name: "Compare with the original",
    })
    await userEvent.click(compare)
    await expect(
      await canvas.findByRole("slider", { name: "Before and after" })
    ).toBeVisible()
    await expect(await factsOf(canvasElement)).toBe(
      "Before 11:40 · After 12:02"
    )
    // The original has none to compare with.
    await userEvent.click(versions[0]!)
    await expect(compare).toBeDisabled()
    await expect(
      canvas.queryByRole("slider", { name: "Before and after" })
    ).toBeNull()
  },
}

/** One of the app's images: back and forth by its sides and the arrows. */
export const ImageAmongOthers: Story = {
  args: {
    media: {
      ...image,
      position: { index: 30, count: 60 },
      onPrevious: fn(),
      onNext: fn(),
    },
  },
  play: async ({ args, canvas, canvasElement }) => {
    const media = args.media as typeof image & {
      onPrevious: ReturnType<typeof fn>
      onNext: ReturnType<typeof fn>
    }
    // Where it is at the foot of the image, as a viewer's anywhere.
    const where = await canvas.findByText("30 / 60")
    await expect(where).toBeVisible()
    await expect(where).toHaveAttribute("data-slot", "viewer-position")
    await userEvent.click(canvas.getByRole("button", { name: "Next image" }))
    await expect(media.onNext).toHaveBeenCalledTimes(1)
    await userEvent.click(
      canvas.getByRole("button", { name: "Previous image" })
    )
    await expect(media.onPrevious).toHaveBeenCalledTimes(1)
    canvasElement
      .querySelector<HTMLElement>("[data-slot=media-viewer-stage]")!
      .focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(media.onNext).toHaveBeenCalledTimes(2)
    // Zoomed in past its place, the arrows scroll it instead.
    await userEvent.keyboard("++++")
    await userEvent.keyboard("{ArrowLeft}")
    await expect(media.onPrevious).toHaveBeenCalledTimes(1)
  },
}

/** Fingers on an element, as a touch screen's: where each is. */
function touches(
  target: Element,
  type: "touchstart" | "touchmove" | "touchend",
  down: { x: number; y: number }[],
  changed: { x: number; y: number }[] = down
) {
  const touch = (point: { x: number; y: number }, identifier: number) =>
    new Touch({ identifier, target, clientX: point.x, clientY: point.y })
  target.dispatchEvent(
    new TouchEvent(type, {
      touches: down.map(touch),
      changedTouches: changed.map(touch),
      bubbles: true,
      cancelable: true,
    })
  )
}

/**
 * On a touch screen: the page's own pinch is not taken; a pinch zooms the
 * image about its middle, as far as the fingers go, the point between
 * them kept there; a double tap fits it, another zooms in to 200%; a
 * swipe across it fitted goes to the next.
 */
export const ImageTouch: Story = {
  args: {
    media: {
      ...image,
      position: { index: 30, count: 60 },
      onPrevious: fn(),
      onNext: fn(),
    },
  },
  play: async ({ args, canvas, canvasElement }) => {
    const media = args.media as typeof image & {
      onNext: ReturnType<typeof fn>
    }
    const stage = canvasElement.querySelector<HTMLElement>(
      "[data-slot=media-viewer-stage]"
    )!
    await expect(getComputedStyle(stage).touchAction).toBe("pan-x pan-y")
    // Touch events are made only where the browser makes them.
    try {
      new Touch({ identifier: 0, target: stage })
    } catch {
      return
    }
    const width = () => shown(canvasElement).getBoundingClientRect().width
    await waitFor(() => expect(width()).toBe(stage.clientWidth))
    const fitted = width()
    // Fitted while the zoom's percent is the one it fitted at.
    const percent = zoomOf(canvasElement)
    const fit = {
      pressed: () => zoomOf(canvasElement) === percent,
    }
    const box = stage.getBoundingClientRect()
    const middle = { x: box.left + box.width / 3, y: box.top + box.height / 2 }
    // Where the middle is on the image, from 0 to 1 across it.
    const at = () => {
      const rect = shown(canvasElement).getBoundingClientRect()
      return (middle.x - rect.left) / rect.width
    }
    const before = at()
    const pair = (apart: number) => [
      { x: middle.x - apart / 2, y: middle.y },
      { x: middle.x + apart / 2, y: middle.y },
    ]
    touches(stage, "touchstart", pair(100))
    for (const apart of [125, 150, 175, 200, 250])
      touches(stage, "touchmove", pair(apart))
    await waitFor(() => expect(width()).toBeCloseTo(fitted * 2.5, 0))
    await expect(fit.pressed()).toBe(false)
    await expect(at()).toBeCloseTo(before, 2)
    touches(stage, "touchend", [], pair(250))
    // A double tap: fitted again; another: 200% where it was tapped.
    const tapAt = (point: { x: number; y: number }) => {
      touches(stage, "touchstart", [point])
      touches(stage, "touchend", [], [point])
    }
    tapAt(middle)
    tapAt(middle)
    await waitFor(() => expect(fit.pressed()).toBe(true))
    tapAt(middle)
    tapAt(middle)
    await expect(
      await canvas.findByRole("status", { name: /^Zoom/ })
    ).toHaveTextContent("200%")
    await expect(at()).toBeCloseTo(before, 2)
    tapAt(middle)
    tapAt(middle)
    await waitFor(() => expect(fit.pressed()).toBe(true))
    // Fitted, a swipe to the left: the next image.
    touches(stage, "touchstart", [{ x: middle.x + 80, y: middle.y }])
    touches(stage, "touchend", [], [{ x: middle.x - 40, y: middle.y + 10 }])
    await expect(media.onNext).toHaveBeenCalledTimes(1)
  },
}

/**
 * Where its areas can be marked, the same under fingers while not
 * marking: a pinch zooms, a double tap fits it, a swipe goes on.
 */
export const ImageMarkTouch: Story = {
  args: {
    media: {
      ...image,
      position: { index: 30, count: 60 },
      onPrevious: fn(),
      onNext: fn(),
      onMark: marked,
    },
  },
  play: async ({ args, canvas, canvasElement }) => {
    const media = args.media as typeof image & {
      onNext: ReturnType<typeof fn>
    }
    const frame = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        "[data-slot=image-editor-frame]"
      )
      expect(found).not.toBeNull()
      return found!
    })
    await expect(getComputedStyle(frame).touchAction).toBe("pan-x pan-y")
    try {
      new Touch({ identifier: 0, target: frame })
    } catch {
      return
    }
    await canvas.findByRole("button", { name: /^Zoom \d+%$/ })
    const percent = zoomOf(canvasElement)
    const fit = { pressed: () => zoomOf(canvasElement) === percent }
    const box = frame.getBoundingClientRect()
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    const pair = (apart: number) => [
      { x: middle.x - apart / 2, y: middle.y },
      { x: middle.x + apart / 2, y: middle.y },
    ]
    touches(frame, "touchstart", pair(100))
    for (const apart of [150, 200]) touches(frame, "touchmove", pair(apart))
    touches(frame, "touchend", [], pair(200))
    await waitFor(() => expect(fit.pressed()).toBe(false))
    for (let tap = 0; tap < 2; tap++) {
      touches(frame, "touchstart", [middle])
      touches(frame, "touchend", [], [middle])
    }
    await waitFor(() => expect(fit.pressed()).toBe(true))
    touches(frame, "touchstart", [{ x: middle.x + 80, y: middle.y }])
    touches(frame, "touchend", [], [{ x: middle.x - 40, y: middle.y }])
    await expect(media.onNext).toHaveBeenCalledTimes(1)
  },
}

/** An image with no transparent parts: on the stage, no checkerboard. */
export const ImageOpaque: Story = {
  args: {
    media: {
      ...image,
      src: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="hsl(240 4% 70%)"/></svg>`
      )}`,
    },
  },
  play: async ({ canvasElement }) => {
    const stage = canvasElement.querySelector<HTMLElement>(
      "[data-slot=media-viewer-stage]"
    )!
    await waitFor(() => expect(stage).not.toHaveAttribute("data-checkered"))
    await expect(getComputedStyle(stage).backgroundImage).toBe("none")
    await expect(
      within(canvasElement).getByRole("button", { name: "Copy image" })
    ).toBeVisible()
  },
}

/** Comparing as it opens: the app's. */
export const ImageComparing: Story = {
  args: { media: { ...compared, comparing: true } },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => {
      const comparison = canvasElement.querySelector(
        "[data-slot=image-comparison]"
      )!
      // Flat, as the image is.
      expect(getComputedStyle(comparison.parentElement!).boxShadow).toBe("none")
      const background = resolved(comparison, "var(--background)")
      for (const slot of ["line", "handle"])
        expect(
          getComputedStyle(
            comparison.querySelector(`[data-slot=image-comparison-${slot}]`)!
          ).backgroundColor
        ).toBe(background)
    })
    await expect(
      await canvas.findByRole("slider", { name: "Before and after" })
    ).toBeVisible()
  },
}

/** The mark button's icon, the app's own. */
export const ImageMarkIcon: Story = {
  args: {
    media: {
      ...image,
      onMark: marked,
      markIcon: (
        <HugeiconsIcon
          icon={LassoSelectIcon}
          strokeWidth={2}
          data-testid="app-mark-icon"
        />
      ),
    },
  },
  play: async ({ canvas }) => {
    const button = await canvas.findByRole("button", { name: "Mark" })
    await expect(within(button).getByTestId("app-mark-icon")).toBeVisible()
    await expect(button.querySelectorAll("svg")).toHaveLength(1)
  },
}

/**
 * With `onMark`, its areas are marked and sent to the app with the
 * image's size: the marking tools in a floating bar under the image, as
 * an image editor's (not the toolbar's, under a window's titlebar), one
 * zoom, the status bar's.
 */
export const ImageMark: Story = {
  args: { media: { ...image, onMark: marked } },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Mark" }))
    // One zoom, the toolbar's, and the marking tools in the viewer's
    // floating bar of edits, at the foot of the image's place, its handle
    // first: no zoom or bar of the editor's own.
    await expect(await isFitted(canvasElement)).toBe(true)
    await expect(
      canvasElement.querySelector("[data-slot=image-editor-toolbar]")
    ).toBeNull()
    await expect(
      canvasElement.querySelector("[data-slot=image-editor-float]")
    ).toBeNull()
    const float = canvas.getByRole("toolbar", { name: "Edit" })
    await expect(float.firstElementChild).toHaveAccessibleName("Move the bar")
    await expect(
      within(float).getByRole("button", { name: "Lasso" })
    ).toBeVisible()
    const markButton = within(float).getByRole("button", { name: "Mark" })
    await expect(markButton).toHaveTextContent(/^Mark$/)
    // Its word short; its tooltip says what it does, whole.
    // Reached by the keyboard, its tooltip opens.
    markButton.focus()
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}{Tab}")
    await expect(
      await screen.findByText(
        "Mark an area to edit",
        { selector: "[data-slot=tooltip-content]" },
        { timeout: 3000 }
      )
    ).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await expect(
      within(
        canvasElement.querySelector<HTMLElement>("[data-slot=viewer-toolbar]")!
      ).queryByRole("button", { name: "Lasso" })
    ).toBeNull()
    const content = canvasElement
      .querySelector("[data-slot=viewer-content]")!
      .getBoundingClientRect()
    const bar = float.getBoundingClientRect()
    await expect(Math.round(content.bottom - bar.bottom)).toBe(12)
    await expect(
      Math.abs(bar.left + bar.width / 2 - (content.left + content.width / 2))
    ).toBeLessThan(1)
    await zoomIn(canvasElement)
    await expect(await isFitted(canvasElement)).toBe(false)
    await fit(canvasElement)
    const frame = canvas.getByRole("group", { name: "The pricing page's hero" })
    const img = canvasElement.querySelector("[data-slot=image-editor] img")!
    const { left, top, width, height } = img.getBoundingClientRect()
    const at = (type: string, x: number, y: number) =>
      frame.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
          clientX: left + x * width,
          clientY: top + y * height,
        })
      )
    at("pointerdown", 0.25, 0.25)
    at("pointermove", 0.5, 0.5)
    at("pointerup", 0.5, 0.5)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Edit this" })
    )
    await expect(marked).toHaveBeenCalledTimes(1)
    const [marks, size] = marked.mock.calls[0]!
    await expect(marks).toHaveLength(1)
    await expect(size).toEqual({ width: 1600, height: 1067 })
  },
}

const photo = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="hsl(240 4% 70%)"/><circle cx="512" cy="512" r="360" fill="hsl(240 4% 40%)"/></svg>`
)}`

/**
 * Markable, an image is drawn as it is when only looked at: an opaque
 * one with no checkerboard, fitted to the edges, flat (no corners, no
 * shadow). A click on it zooms in a step the status bar has, at least a
 * fifth larger: not from a fitted 55% to 60%, its edges barely cut off.
 */
export const ImageMarkAsShown: Story = {
  args: { media: { ...image, src: photo, onMark: marked } },
  play: async ({ canvas, canvasElement }) => {
    const frame = await canvas.findByRole("group", {
      name: "The pricing page's hero",
    })
    const img = canvasElement.querySelector<HTMLElement>(
      "[data-slot=image-editor] img"
    )!
    await waitFor(() =>
      expect(getComputedStyle(frame).backgroundImage).toBe("none")
    )
    await waitFor(() =>
      expect(img.getBoundingClientRect().width).toBeGreaterThan(0)
    )
    const box = frame.getBoundingClientRect()
    const drawn = img.getBoundingClientRect()
    await expect(
      Math.min(
        Math.abs(drawn.left - box.left) + Math.abs(box.right - drawn.right),
        Math.abs(drawn.top - box.top) + Math.abs(box.bottom - drawn.bottom)
      )
    ).toBeLessThan(2)
    await expect(getComputedStyle(img).boxShadow).toBe("none")
    await expect(getComputedStyle(img).borderTopLeftRadius).toBe("0px")

    const zoom = canvas.getByRole("button", { name: /^Zoom \d+%$/ })
    const fitted = Number(/(\d+)%/.exec(zoom.textContent!)![1])
    await userEvent.click(img)
    await waitFor(() =>
      expect(
        Number(/(\d+)%/.exec(zoom.textContent!)![1])
      ).toBeGreaterThanOrEqual(fitted * 1.2)
    )
    const zoomed = `${/(\d+)%/.exec(zoom.textContent!)![1]}%`
    await userEvent.click(zoom)
    await expect(
      await within(document.body).findByRole("menuitemradio", { name: zoomed })
    ).toHaveAttribute("aria-checked", "true")
  },
}

const mask = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067"><rect width="100%" height="100%"/></svg>`
)}`

/**
 * Any version marked, not only the latest: each its own highlight as it
 * is shown, and `onMark` told which was marked. Comparing, none.
 */
export const ImageVersionMark: Story = {
  args: {
    media: {
      ...image,
      versions: [
        { src: picture(60), alt: "The hero as first made" },
        { src: picture(70), alt: "The hero, lighter", highlight: mask },
      ],
      onMark: marked,
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const strip = canvas.getByRole("radiogroup", { name: "Versions" })
    const versions = within(strip).getAllByRole("radio")
    const highlight = () =>
      canvasElement.querySelector("[data-slot=image-editor-highlight]")
    // The latest: tools, no highlight of its own.
    await expect(
      await canvas.findByRole("button", { name: "Mark" })
    ).toBeVisible()
    await expect(highlight()).toBeNull()
    // Version 1: its highlight, and the tools still.
    await userEvent.click(versions[1]!)
    await waitFor(() => expect(highlight()).not.toBeNull())
    await expect(
      canvasElement.querySelector("[data-slot=image-editor] img")
    ).toHaveAccessibleName("The hero, lighter")
    await userEvent.click(canvas.getByRole("button", { name: "Mark" }))
    await waitFor(() =>
      expect(
        canvasElement
          .querySelector("[data-slot=image-editor] img")!
          .getBoundingClientRect().width
      ).toBeGreaterThan(0)
    )
    const frame = canvas.getByRole("group", { name: "The hero, lighter" })
    const img = canvasElement.querySelector("[data-slot=image-editor] img")!
    const { left, top, width, height } = img.getBoundingClientRect()
    const at = (type: string, x: number, y: number) =>
      frame.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
          clientX: left + x * width,
          clientY: top + y * height,
        })
      )
    at("pointerdown", 0.25, 0.25)
    at("pointermove", 0.5, 0.5)
    at("pointerup", 0.5, 0.5)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Edit this" })
    )
    await expect(marked).toHaveBeenCalledTimes(1)
    await expect(marked.mock.calls[0]![2]).toBe(1)
    // Compared with the original: no tools.
    await userEvent.click(
      canvas.getByRole("button", { name: "Compare with the original" })
    )
    await expect(
      await canvas.findByRole("slider", { name: "Before and after" })
    ).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Mark" })).toBeNull()
  },
}

/** Marks given, e.g. those sent: shown on it, nothing to mark. */
export const ImageMarks: Story = {
  args: {
    media: {
      ...image,
      marks: [{ kind: "rect", x: 140, y: 150, width: 520, height: 48 }],
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=image-editor] img")
      ).toBeTruthy()
    )
    await expect(canvas.queryByRole("button", { name: "Mark" })).toBeNull()
  },
}

/** An image that cannot load says so. */
export const ImageFailed: Story = {
  args: { media: { ...image, src: "data:image/png;base64,AAAA" } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("This image cannot be shown")
    ).toBeVisible()
  },
}

const audio = {
  kind: "audio",
  name: "narration.mp3",
  path: [{ label: "public" }, { label: "audio" }],
  src: recording,
  title: "Release notes, read aloud",
  description: "eleven-v3 · generated 12:04",
  peaks,
  transcript,
  onBack: fn(),
  onAddToChat: fn(),
  download: fn(),
  onCopyTranscript: copied,
  details: ["MP3", "768 KB"],
} as const

/**
 * The transcript copied by the viewer itself on a page without a
 * clipboard (plain http): it says it could not, not "Copied".
 */
export const AudioNoClipboard: Story = {
  args: { media: { ...audio, onCopyTranscript: undefined } },
  beforeEach: () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    })
    return () => {
      delete (navigator as { clipboard?: unknown }).clipboard
    }
  },
  play: async ({ canvas }) => {
    await expect(navigator.clipboard).toBeUndefined()
    await userEvent.click(
      await canvas.findByRole("button", { name: "Copy transcript" })
    )
    await expect(
      await canvas.findByRole("button", { name: "Could not copy" })
    ).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Copied" })).toBeNull()
  },
}

/**
 * A recording: its title, a waveform to seek on, and its transcript line
 * by line, the one being said lit; a line goes there, and so do the
 * arrow keys on the waveform. Its length below; the transcript copied.
 */
export const Audio: Story = {
  args: { media: audio },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("0:48 · MP3 · 768 KB")).toBeVisible()
    const waveform = canvas.getByRole("slider", { name: "Seek" })
    await expect(waveform).toHaveAttribute("aria-valuetext", "0:00 of 0:48")
    // The first line is being said.
    const first = canvas.getByRole("button", { name: /^0:00/ })
    await expect(first).toHaveAttribute("aria-current", "time")
    // A line's time fainter than its words; the line said, a step darker.
    const time = (line: Element) =>
      getComputedStyle(line.querySelector("[data-slot=media-viewer-cue-time]")!)
        .color
    const later = canvas.getByRole("button", { name: /^0:09/ })
    await expect(time(later)).toBe(resolved(later, "var(--subtle-foreground)"))
    await expect(time(first)).toBe(resolved(first, "var(--muted-foreground)"))
    await userEvent.click(canvas.getByRole("button", { name: /^0:09/ }))
    await waitFor(() =>
      expect(waveform).toHaveAttribute("aria-valuetext", "0:09 of 0:48")
    )
    await expect(canvas.getByRole("button", { name: /^0:09/ })).toHaveAttribute(
      "aria-current",
      "time"
    )
    await expect(first).not.toHaveAttribute("aria-current")
    waveform.focus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() =>
      expect(waveform).toHaveAttribute("aria-valuetext", "0:14 of 0:48")
    )
    // Half the bars played, or so: those before are lit.
    const played = waveform.querySelectorAll("[data-played]").length
    await expect(played).toBeGreaterThan(20)
    await expect(played).toBeLessThan(35)
    await userEvent.keyboard("{Home}")
    await userEvent.click(
      canvas.getByRole("button", { name: "Copy transcript" })
    )
    await expect(copied).toHaveBeenCalledWith(
      expect.stringContaining("0:09 The composer now queues")
    )
    await expect(canvas.getByRole("button", { name: "Copied" })).toBeVisible()
    // Speed: the next one each press; loop on and off.
    const speed = canvas.getByRole("button", { name: "Speed 1×" })
    await userEvent.click(speed)
    await expect(speed).toHaveAccessibleName("Speed 1.25×")
    const loop = canvas.getByRole("button", { name: "Loop" })
    await userEvent.click(loop)
    await expect(loop).toHaveAttribute("aria-pressed", "true")
  },
}

/** A video on black, its controls over it; its size and length below. */
const poster = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="a" cx="30%" cy="40%" r="40%"><stop offset="0" stop-color="#3a3a40"/><stop offset="1" stop-color="#1a1a1d"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#a)"/></svg>`
)}`

export const Video: Story = {
  args: {
    media: {
      kind: "video",
      name: "demo.mp4",
      path: [{ label: "public" }, { label: "assets" }],
      src: recording,
      poster,
      onBack: fn(),
      onAddToChat: fn(),
      download: fn(),
      details: ["MP4", "8.1 MB"],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/0:48 · MP4 · 8\.1 MB/)).toBeVisible()
    const stage = canvas.getByRole("group", { name: "demo.mp4" })
    await expect(getComputedStyle(stage).backgroundColor).toBe("rgb(0, 0, 0)")
    const seek = canvas.getByRole("slider", { name: "Seek" })
    await expect(seek).toHaveAttribute("max", "48")
    stage.focus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect((seek as HTMLInputElement).value).toBe("5"))
    await userEvent.click(canvas.getByRole("button", { name: "Mute" }))
    await expect(
      await canvas.findByRole("button", { name: "Unmute" })
    ).toBeVisible()
  },
}

const loaded = fn()

/**
 * The app's `crossOrigin` (e.g. "use-credentials", for its session) and
 * `mediaProps` reach the element: its `ref`, to go to a time, and its
 * events, called with the viewer's own.
 */
export const MediaProps: Story = {
  args: { media: audio },
  render: () => {
    const media = { current: null as HTMLMediaElement | null }
    return (
      <>
        <MediaViewer
          kind="audio"
          name="narration.mp3"
          src={recording}
          crossOrigin="anonymous"
          mediaProps={{
            ref: media,
            onLoadedMetadata: (event) => loaded(event.currentTarget.duration),
          }}
        />
        <button
          type="button"
          className="sr-only"
          onClick={() => {
            if (media.current) media.current.currentTime = 24
          }}
        >
          Go to 0:24
        </button>
      </>
    )
  },
  play: async ({ canvas, canvasElement }) => {
    const element = canvasElement.querySelector("audio")!
    await expect(element).toHaveAttribute("crossorigin", "anonymous")
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(48))
    // The viewer's own events too: its length.
    await expect(
      canvasElement.querySelector("[data-slot=viewer-facts]")
    ).toHaveTextContent("0:48")
    await userEvent.click(canvas.getByRole("button", { name: "Go to 0:24" }))
    await waitFor(() => expect(element.currentTime).toBe(24))
  },
}

/** What cannot be played says so. */
export const Failed: Story = {
  args: { media: { ...audio, src: "data:audio/wav;base64,AAAA" } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("This recording cannot be played")
    ).toBeVisible()
    // Nothing to play: no speed, loop or transcript to copy.
    await expect(canvas.queryByRole("button", { name: "Loop" })).toBeNull()
    await expect(
      canvas.queryByRole("button", { name: /Copy transcript/ })
    ).toBeNull()
  },
}

/** Its words, for other languages: one `failed` for each kind. */
export const Labels: Story = {
  args: {
    media: {
      ...image,
      src: "data:image/png;base64,AAAA",
      labels: {
        failed: (kind) =>
          kind === "image"
            ? "Impossible d’afficher cette image"
            : "Lecture impossible",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Impossible d’afficher cette image")
    ).toBeVisible()
  },
}

/**
 * On a phone, its name with no room beside six tools: the path on a row
 * of its own over them, its name whole, not cut to nothing; the bar one
 * row again where it is wide.
 */
export const ToolbarNarrow: Story = {
  ...windowOf("phone", 390, 700),
  args: { media: image },
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=viewer-toolbar]"
    )!
    const path = await waitFor(() => {
      const found = bar.querySelector<HTMLElement>(
        "[data-slot=viewer-path][data-wrapped]"
      )
      expect(found).not.toBeNull()
      return found!
    })
    const own = path.querySelector<HTMLElement>("[data-viewer-path-own]")!
    await expect(own).toHaveTextContent("hero.png")
    await expect(own.scrollWidth).toBeLessThanOrEqual(own.clientWidth + 1)
    await expect(own.getBoundingClientRect().width).toBeGreaterThanOrEqual(48)
    // Over the tools, which keep their row and their size.
    const tools = bar.querySelector<HTMLElement>("[data-slot=viewer-tools]")!
    await expect(path.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      tools.getBoundingClientRect().top
    )
    for (const group of tools.querySelectorAll<HTMLElement>(
      "[data-slot=viewer-tool-group]"
    ))
      if (group.childElementCount > 0)
        await expect(Math.round(group.getBoundingClientRect().height)).toBe(36)
    await expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth)
  },
}
