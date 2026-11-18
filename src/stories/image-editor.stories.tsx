import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import {
  ImageEditor,
  markBounds,
  markImages,
  type ImageMark,
} from "@/components/image-editor"
import { Button } from "@/components/ui/button"
import { coarseHitSize } from "@/stories/touch"
import { rendered } from "@/stories/wait"

const svg = (width: number, height: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(210 55% 72%)"/><circle cx="50%" cy="50%" r="20%" fill="hsl(30 70% 60%)"/></svg>`
  )}`

const photo = svg(1600, 900)

function Demo(props: React.ComponentProps<typeof ImageEditor>) {
  return (
    <div className="h-[30rem] w-2xl max-w-full overflow-hidden rounded-lg border">
      <ImageEditor {...props} />
    </div>
  )
}

const meta = {
  title: "Components/Media Viewer/Image Editor",
  component: Demo,
  parameters: { layout: "padded" },
  args: { src: photo, alt: "A circle on blue" },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

const frame = (canvas: ReturnType<typeof within>) =>
  canvas.getByRole("group", { name: "A circle on blue" })

const zoomButton = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByRole("group", { name: "Image" })).getAllByRole(
    "button"
  )[1]!

/** Once it has loaded and measured its frame. */
const loaded = (canvas: ReturnType<typeof within>) =>
  waitFor(() => expect(zoomButton(canvas)).toHaveTextContent(/^Fit · \d+%$/))

/** A pointer's press, moves and release, at points on the screen. */
function press(
  target: Element,
  points: { x: number; y: number }[],
  init: PointerEventInit = {}
) {
  const at = (type: string, point: { x: number; y: number }) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        pointerId: 1,
        pointerType: "mouse",
        clientX: point.x,
        clientY: point.y,
        ...init,
      })
    )
  at("pointerdown", points[0]!)
  for (const point of points.slice(1)) at("pointermove", point)
  at("pointerup", points.at(-1)!)
}

/** Where a point of the image is on the screen. */
function screen(canvasElement: HTMLElement, x: number, y: number) {
  const image = canvasElement
    .querySelector("[data-slot=image-editor] img")!
    .getBoundingClientRect()
  return {
    x: image.left + (x / 1600) * image.width,
    y: image.top + (y / 900) * image.height,
  }
}

/**
 * It fits its frame at first; the buttons, + − 0 1 and a click zoom it,
 * Alt+click out; the toolbar holds the app's buttons too.
 */
export const Zoom: Story = {
  args: {
    actions: (
      <Button variant="ghost" size="icon-sm" aria-label="Download">
        <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
      </Button>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvas)
    const button = zoomButton(canvas)
    const fitted = Number(/(\d+)%/.exec(button.textContent!)![1])
    await expect(fitted).toBeLessThan(100)
    const image = canvasElement.querySelector("img")!
    // As wide as the percent says, rounded.
    await expect(
      Math.abs(image.getBoundingClientRect().width - 16 * fitted)
    ).toBeLessThanOrEqual(8)
    await expect(canvas.getByRole("button", { name: "Download" })).toBeVisible()

    // Its keys.
    frame(canvas).focus()
    await userEvent.keyboard("1")
    await waitFor(() => expect(button).toHaveTextContent("100%"))
    await userEvent.keyboard("+")
    await waitFor(() => expect(button).toHaveTextContent("125%"))
    await userEvent.keyboard("-")
    await waitFor(() => expect(button).toHaveTextContent("100%"))
    // From 300%, its pixels, not smoothed.
    const shown = canvasElement.querySelector("img")!
    await expect(shown.style.imageRendering).toBe("")
    await userEvent.keyboard("++++")
    await waitFor(() => expect(button).toHaveTextContent("300%"))
    await expect(shown.style.imageRendering).toBe("pixelated")
    await userEvent.keyboard("0")
    await waitFor(() => expect(button).toHaveTextContent(`Fit · ${fitted}%`))

    // Its buttons: to the actual size and back.
    await userEvent.click(button)
    await waitFor(() => expect(button).toHaveTextContent("100%"))
    await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }))
    await waitFor(() => expect(button).toHaveTextContent("125%"))
    await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }))
    await waitFor(() => expect(button).toHaveTextContent("100%"))
    await userEvent.click(button)
    await waitFor(() => expect(button).toHaveTextContent(/^Fit/))

    // A click zooms in where it is; Alt+click out.
    const point = screen(canvasElement, 400, 225)
    press(frame(canvas), [point])
    await waitFor(() => expect(button).not.toHaveTextContent(/^Fit/))
    const zoomed = Number(/(\d+)%/.exec(button.textContent!)![1])
    await expect(zoomed).toBeGreaterThan(fitted)
    // The point clicked stays under the pointer.
    await waitFor(() => {
      const now = screen(canvasElement, 400, 225)
      expect(Math.abs(now.x - point.x)).toBeLessThan(2)
      expect(Math.abs(now.y - point.y)).toBeLessThan(2)
    })
    press(frame(canvas), [point], { altKey: true })
    await waitFor(() =>
      expect(Number(/(\d+)%/.exec(button.textContent!)![1])).toBeLessThan(
        zoomed
      )
    )
    // Escape fits it again.
    frame(canvas).focus()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(button).toHaveTextContent(/^Fit/))
  },
}

/**
 * Zoomed in, it is moved by dragging, or scrolling; a pinch (Ctrl and the
 * wheel) zooms it, not the page.
 */
export const Move: Story = {
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvas)
    const box = frame(canvas)
    box.focus()
    await userEvent.keyboard("1")
    await waitFor(() => expect(zoomButton(canvas)).toHaveTextContent("100%"))
    const { left, top } = { left: box.scrollLeft, top: box.scrollTop }
    const rect = box.getBoundingClientRect()
    const middle = { x: rect.left + 200, y: rect.top + 150 }
    press(box, [
      middle,
      { x: middle.x - 40, y: middle.y - 30 },
      { x: middle.x - 80, y: middle.y - 60 },
    ])
    await expect(box.scrollLeft).toBe(left + 80)
    await expect(box.scrollTop).toBe(top + 60)
    // A drag is not a click: no zoom.
    await rendered()
    await expect(zoomButton(canvas)).toHaveTextContent("100%")
    // A press that hardly moves is: it zooms.
    press(box, [middle, { x: middle.x + 2, y: middle.y + 1 }])
    await waitFor(() => expect(zoomButton(canvas)).toHaveTextContent("125%"))
    box.focus()
    await userEvent.keyboard("1")
    await waitFor(() => expect(zoomButton(canvas)).toHaveTextContent("100%"))

    const pinch = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -10,
      clientX: middle.x,
      clientY: middle.y,
    })
    box.dispatchEvent(pinch)
    await expect(pinch.defaultPrevented).toBe(true)
    await waitFor(() =>
      expect(
        Number(/(\d+)%/.exec(zoomButton(canvas).textContent!)![1])
      ).toBeGreaterThan(100)
    )
    // Without Ctrl or Alt, the wheel scrolls.
    const scroll = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 10,
    })
    box.dispatchEvent(scroll)
    await expect(scroll.defaultPrevented).toBe(false)
    await expect(canvasElement.querySelector("img")).toBeVisible()
  },
}

/**
 * Where the app takes marks: the reader brushes, circles or frames areas
 * (in the image's pixels, whatever the zoom), undoes them, and sends
 * them by the button beside them. Escape clears them, then stops.
 */
export const Mark: Story = {
  args: { onMark: fn() },
  play: async ({ args, canvas, canvasElement }) => {
    await loaded(canvas)
    const box = frame(canvas)
    const tools = within(canvas.getByRole("group", { name: "Marking" }))
    const mark = tools.getByRole("button", { name: "Mark" })
    await expect(mark).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(mark)
    await expect(mark).toHaveAttribute("aria-pressed", "true")
    await expect(tools.getByRole("button", { name: /^Brush/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    // Its tools as square as its other buttons; under a finger, each
    // one's place as large as one.
    const toolbar = within(canvas.getByRole("group", { name: "Image" }))
    for (const button of toolbar.getAllByRole("button")) {
      if (/%/.test(button.textContent!)) continue
      await expect(button.offsetWidth).toBe(28)
      await expect(button.offsetHeight).toBe(28)
      const size = coarseHitSize(button)
      await expect(size.width).toBeGreaterThanOrEqual(44)
      await expect(size.height).toBeGreaterThanOrEqual(44)
    }
    // As far apart as each other.
    const marking = tools.getAllByRole("button")
    for (const [at, button] of marking.slice(1).entries())
      await expect(
        button.getBoundingClientRect().left -
          marking[at]!.getBoundingClientRect().right
      ).toBe(2)

    // A rectangle, dragged from its corner.
    await userEvent.click(tools.getByRole("button", { name: "Rectangle" }))
    press(box, [
      screen(canvasElement, 400, 200),
      screen(canvasElement, 600, 300),
      screen(canvasElement, 800, 400),
    ])
    const send = await canvas.findByRole("button", { name: "Edit this" })
    // A slip, too small, is no mark.
    press(box, [
      screen(canvasElement, 100, 100),
      screen(canvasElement, 102, 101),
    ])
    // A lasso.
    await userEvent.click(tools.getByRole("button", { name: "Lasso" }))
    press(box, [
      screen(canvasElement, 1000, 500),
      screen(canvasElement, 1200, 500),
      screen(canvasElement, 1200, 700),
      screen(canvasElement, 1000, 700),
    ])
    // A brush's stroke, then undone by Ctrl+Z.
    await userEvent.click(tools.getByRole("button", { name: /^Brush/ }))
    press(box, [
      screen(canvasElement, 100, 800),
      screen(canvasElement, 300, 800),
    ])
    await rendered()
    await expect(
      canvasElement.querySelector("[data-slot=image-editor-mark-fills]")!
        .children
    ).toHaveLength(3)
    box.focus()
    await userEvent.keyboard("{Control>}z{/Control}")
    await rendered()
    await expect(
      canvasElement.querySelector("[data-slot=image-editor-mark-fills]")!
        .children
    ).toHaveLength(2)

    await userEvent.click(send)
    await expect(args.onMark).toHaveBeenCalledTimes(1)
    const [marks, size] = (args.onMark as ReturnType<typeof fn>).mock
      .calls[0]! as [ImageMark[], { width: number; height: number }]
    await expect(size).toEqual({ width: 1600, height: 900 })
    await expect(marks).toHaveLength(2)
    const [rect, lasso] = marks as [
      Extract<ImageMark, { kind: "rect" }>,
      Extract<ImageMark, { kind: "lasso" }>,
    ]
    await expect(rect.kind).toBe("rect")
    for (const [value, expected] of [
      [rect.x, 400],
      [rect.y, 200],
      [rect.width, 400],
      [rect.height, 200],
    ] as const)
      await expect(Math.abs(value - expected)).toBeLessThanOrEqual(2)
    await expect(lasso.kind).toBe("lasso")
    await expect(lasso.points.length).toBeGreaterThanOrEqual(4)
    // Sent, it stops marking.
    await waitFor(() => expect(mark).toHaveAttribute("aria-pressed", "false"))
    await expect(
      canvasElement.querySelector("[data-slot=image-editor-marks]")
    ).toBeNull()

    // Escape: the marks go, then marking stops.
    await userEvent.click(mark)
    press(box, [
      screen(canvasElement, 100, 100),
      screen(canvasElement, 300, 300),
    ])
    await canvas.findByRole("button", { name: "Edit this" })
    box.focus()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Edit this" })).toBeNull()
    )
    await expect(mark).toHaveAttribute("aria-pressed", "true")
    // Clearing them is a step undone as any other: by Ctrl+Z, after
    // Escape; by Undo, after their Clear.
    await userEvent.keyboard("{Control>}z{/Control}")
    await canvas.findByRole("button", { name: "Edit this" })
    await userEvent.click(canvas.getByRole("button", { name: "Clear marks" }))
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Edit this" })).toBeNull()
    )
    await userEvent.click(tools.getByRole("button", { name: "Undo" }))
    await canvas.findByRole("button", { name: "Edit this" })
    await expect(tools.getByRole("button", { name: "Undo" })).toBeEnabled()
    // Back to where marking started: nothing to undo.
    await userEvent.click(tools.getByRole("button", { name: "Undo" }))
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Edit this" })).toBeNull()
    )
    await expect(tools.getByRole("button", { name: "Undo" })).toBeDisabled()
    box.focus()
    await userEvent.keyboard("{Escape}")
    await expect(mark).toHaveAttribute("aria-pressed", "false")
  },
}

/**
 * Marking in a phone's narrow frame: the toolbar keeps to one row, in
 * the middle, its zoom just the percent.
 */
export const MarkNarrow: Story = {
  args: {
    onMark: fn(),
    actions: (
      <Button variant="ghost" size="icon-sm" aria-label="Download">
        <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
      </Button>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-[22.5rem]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvas)
    const toolbar = canvas.getByRole("group", { name: "Image" })
    await expect(
      within(toolbar).getByRole("button", { name: "Zoom in" })
    ).toBeVisible()
    await userEvent.click(within(toolbar).getByRole("button", { name: "Mark" }))
    await waitFor(() =>
      expect(
        within(toolbar).queryByRole("button", { name: "Zoom in" })
      ).toBeNull()
    )
    // One row: as tall as a button and the toolbar's padding and border.
    await expect(toolbar.offsetHeight).toBeLessThanOrEqual(28 + 10)
    const bar = toolbar.getBoundingClientRect()
    const editor = canvasElement
      .querySelector("[data-slot=image-editor]")!
      .getBoundingClientRect()
    await expect(
      Math.abs(bar.left + bar.width / 2 - (editor.left + editor.width / 2))
    ).toBeLessThan(1)
  },
}

/** While the app's action runs, it waits; if it fails, it says why. */
export const MarkFails: Story = {
  args: {
    onMark: () =>
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "The upload failed: the server took too long to answer. Try again in a minute."
              )
            ),
          200
        )
      ),
  },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvas)
    await userEvent.click(canvas.getByRole("button", { name: "Mark" }))
    press(frame(canvas), [
      screen(canvasElement, 400, 200),
      screen(canvasElement, 800, 400),
    ])
    await userEvent.click(
      await canvas.findByRole("button", { name: "Edit this" })
    )
    await expect(
      canvas.getByRole("button", { name: /Preparing…/ })
    ).toBeDisabled()
    const alert = await canvas.findByRole("alert")
    await expect(alert).toHaveTextContent(
      "The upload failed: the server took too long to answer. Try again in a minute."
    )
    // All of it shows, on lines of its own, not cut to half a sentence.
    await expect(alert.scrollWidth).toBeLessThanOrEqual(alert.clientWidth)
    await expect(alert.scrollHeight).toBeLessThanOrEqual(alert.clientHeight)
    await expect(alert.offsetHeight).toBeGreaterThan(
      parseFloat(getComputedStyle(alert).lineHeight) * 1.5
    )
    // Longer, it is cut at its last line: no padding a fourth peeks into.
    await expect(getComputedStyle(alert).paddingBottom).toBe("0px")
    await expect(
      canvas.getByRole("button", { name: "Edit this" })
    ).toBeEnabled()
  },
}

/** An action that fails without saying why: what to do next. */
export const MarkFailsSilently: Story = {
  args: { onMark: () => Promise.reject(new Error("")) },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvas)
    await userEvent.click(canvas.getByRole("button", { name: "Mark" }))
    press(frame(canvas), [
      screen(canvasElement, 400, 200),
      screen(canvasElement, 800, 400),
    ])
    await userEvent.click(
      await canvas.findByRole("button", { name: "Edit this" })
    )
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Could not prepare the edit. Try again."
    )
  },
}

/** Without `onMark` there is nothing to mark with. */
export const ViewOnly: Story = {
  play: async ({ canvas }) => {
    await loaded(canvas)
    await expect(canvas.queryByRole("button", { name: "Mark" })).toBeNull()
  },
}

/**
 * Marks sent are shown while not marking; what changed is lit, the rest
 * dimmed, as the image opens.
 */
export const Shown: Story = {
  args: {
    marks: [{ kind: "rect", x: 400, y: 200, width: 400, height: 200 }],
    highlight: `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%"/></svg>`
    )}`,
  },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvas)
    const marks = canvasElement.querySelector("[data-slot=image-editor-marks]")!
    await expect(marks.querySelector("rect")).toHaveAttribute("x", "400")
    const highlight = canvasElement.querySelector<HTMLElement>(
      "[data-slot=image-editor-highlight]"
    )!
    await expect(highlight.style.maskImage).toContain("data:image/svg+xml")
    await expect(highlight.getBoundingClientRect().width).toBeCloseTo(
      canvasElement.querySelector("img")!.getBoundingClientRect().width,
      0
    )
    // It clears.
    await waitFor(
      () => expect(Number(getComputedStyle(highlight).opacity)).toBe(0),
      { timeout: 3000 }
    )
  },
}

/**
 * An image that cannot be shown says so; the app's buttons stay, e.g. to
 * download the file.
 */
export const Failed: Story = {
  args: {
    src: "data:image/png;base64,AAAA",
    actions: (
      <Button variant="outline" size="sm">
        <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
        Download
      </Button>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(
      await canvas.findByText("This image cannot be shown")
    ).toBeVisible()
    await expect(canvas.getByText("A circle on blue")).toBeVisible()
    await expect(
      within(canvas.getByRole("group", { name: "Image" })).getByRole("button", {
        name: "Download",
      })
    ).toBeVisible()
    // As tall as its frame, what it says in the middle, as a viewer
    // says a file cannot be shown: no ground of its own.
    const editor = canvasElement.querySelector<HTMLElement>(
      "[data-slot=image-editor]"
    )!
    const frame = editor.parentElement!
    await expect(editor.offsetHeight).toBe(frame.clientHeight)
    const icon = editor.querySelector("svg")!.getBoundingClientRect()
    const box = editor.getBoundingClientRect()
    await expect(icon.top - box.top).toBeGreaterThan(box.height / 4)
    await expect(getComputedStyle(editor).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)"
    )
  },
}

/** Its words are the app's. */
export const Labels: Story = {
  args: {
    onMark: fn(),
    labels: {
      toolbar: "Bild",
      zoomIn: "Vergrößern",
      mark: "Bereich markieren",
      zoom: (percent) => `Zoom ${percent}`,
    },
  },
  play: async ({ canvas }) => {
    const toolbar = await canvas.findByRole("group", { name: "Bild" })
    await expect(
      within(toolbar).getByRole("button", { name: "Vergrößern" })
    ).toBeVisible()
    await expect(
      within(toolbar).getByRole("button", { name: "Bereich markieren" })
    ).toBeVisible()
    await expect(within(toolbar).getByText(/^Zoom \d+%$/)).toBeVisible()
  },
}

async function pixels(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext("2d")!
  context.drawImage(bitmap, 0, 0)
  return {
    width: bitmap.width,
    height: bitmap.height,
    at: (x: number, y: number) =>
      Array.from(context.getImageData(x, y, 1, 1).data),
  }
}

/**
 * `markImages` makes, from the image's bytes, the mask (as large as the
 * image, transparent where marked, black elsewhere) and the annotated
 * image (tinted where marked, at most `edge` long); `markBounds` says
 * where the marks are.
 */
export const Images: Story = {
  play: async () => {
    const source = document.createElement("canvas")
    source.width = 400
    source.height = 200
    const context = source.getContext("2d")!
    context.fillStyle = "white"
    context.fillRect(0, 0, 400, 200)
    const image = await new Promise<Blob>((resolve) =>
      source.toBlob((blob) => resolve(blob!), "image/png")
    )
    const marks: ImageMark[] = [
      { kind: "rect", x: 20, y: 20, width: 60, height: 40 },
      { kind: "brush", points: [{ x: 300, y: 150 }], size: 20 },
    ]
    const { mask, annotated } = await markImages(image, marks, {
      edge: 200,
      color: "rgb(255, 0, 0)",
    })

    const masked = await pixels(mask)
    await expect([masked.width, masked.height]).toEqual([400, 200])
    await expect(masked.at(40, 40)[3]).toBe(0)
    await expect(masked.at(300, 150)[3]).toBe(0)
    await expect(masked.at(200, 100)).toEqual([0, 0, 0, 255])

    const shown = await pixels(annotated)
    await expect([shown.width, shown.height]).toEqual([200, 100])
    const [red, green] = shown.at(20, 20)
    await expect(red).toBe(255)
    await expect(green).toBeLessThan(200)
    await expect(shown.at(100, 50)).toEqual([255, 255, 255, 255])

    await expect(markBounds(marks, { width: 400, height: 200 })).toEqual({
      x: 20,
      y: 20,
      width: 290,
      height: 140,
    })
  },
}
