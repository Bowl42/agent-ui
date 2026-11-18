import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import { ImageComparison } from "@/components/image-comparison"
import { contrast, over, resolved } from "@/stories/paint"
import { rendered } from "@/stories/wait"

const picture = (fill: string, width: number, height: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${fill}"/></svg>`
  )}`

const meta = {
  title: "Components/Media Viewer/Image Comparison",
  component: ImageComparison,
  parameters: { layout: "padded" },
  args: {
    before: {
      src: picture("hsl(210 55% 72%)", 1600, 900),
      alt: "The page before",
    },
    after: {
      src: picture("hsl(30 70% 70%)", 1600, 900),
      alt: "The page after",
    },
    onPositionChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-80 w-xl max-w-full rounded-lg border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImageComparison>

export default meta
type Story = StoryObj<typeof meta>

const clipped = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLImageElement>("img[alt='The page before']")!
    .style.clipPath

/**
 * Where the images are drawn, fitted at their shapes in the frame: the
 * line, its grip and the labels are within it, and the images rounded.
 */
async function onTheImages(canvasElement: HTMLElement) {
  const root = canvasElement.querySelector<HTMLElement>(
    "[data-slot=image-comparison]"
  )!
  const images = [...root.querySelectorAll("img")]
  await waitFor(() =>
    expect(images.every((image) => image.naturalWidth > 0)).toBe(true)
  )
  await waitFor(() => {
    const background = resolved(root, "var(--background)")
    for (const slot of ["line", "handle"]) {
      const element = root.querySelector(
        `[data-slot=image-comparison-${slot}]`
      )!
      expect(getComputedStyle(element).backgroundColor).toBe(background)
    }
    const handle = root.querySelector("[data-slot=image-comparison-handle]")!
    expect(
      contrast(
        over(getComputedStyle(handle).color, [255, 255, 255]),
        over(background, [255, 255, 255])
      )
    ).toBeGreaterThanOrEqual(3)
  })
  const style = getComputedStyle(root)
  const frame = root.getBoundingClientRect()
  const inner = {
    left:
      frame.left +
      parseFloat(style.borderLeftWidth) +
      parseFloat(style.paddingLeft),
    top:
      frame.top +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.paddingTop),
    width:
      root.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    height:
      root.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom),
  }
  // Each image as `object-fit: contain` draws it, centred in the frame.
  const drawn = images.map((image) => {
    const scale = Math.min(
      inner.width / image.naturalWidth,
      inner.height / image.naturalHeight
    )
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    const left = inner.left + (inner.width - width) / 2
    const top = inner.top + (inner.height - height) / 2
    return { left, top, right: left + width, bottom: top + height }
  })
  const box = {
    left: Math.min(...drawn.map((rect) => rect.left)),
    top: Math.min(...drawn.map((rect) => rect.top)),
    right: Math.max(...drawn.map((rect) => rect.right)),
    bottom: Math.max(...drawn.map((rect) => rect.bottom)),
  }
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1)
  await waitFor(() => {
    const line = root
      .querySelector("[data-slot=image-comparison-line]")!
      .getBoundingClientRect()
    near(line.top, box.top)
    near(line.bottom, box.bottom)
  })
  const slider = root
    .querySelector("[data-slot=image-comparison-divider]")!
    .getBoundingClientRect()
  near(slider.left, box.left)
  near(slider.right, box.right)
  for (const label of root.querySelectorAll(
    "[data-slot=image-comparison-label]"
  )) {
    const rect = label.getBoundingClientRect()
    await expect(rect.top).toBeGreaterThanOrEqual(box.top)
    await expect(rect.left).toBeGreaterThanOrEqual(box.left)
    await expect(rect.right).toBeLessThanOrEqual(box.right)
  }
  for (const image of images)
    await expect(
      parseFloat(getComputedStyle(image).borderTopLeftRadius)
    ).toBeGreaterThan(0)
}

/**
 * The one before on the left of the line, the one after on its right;
 * dragged, the line follows; the arrow keys move it 5%, Home and End to
 * either side. Each image keeps its shape, and its words.
 */
export const Default: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    await onTheImages(canvasElement)
    const divider = canvas.getByRole("slider", { name: "Before and after" })
    await expect(divider).toHaveAttribute("aria-valuenow", "50")
    // Said as the reader's language says a percent.
    await expect(divider).toHaveAttribute(
      "aria-valuetext",
      new Intl.NumberFormat(undefined, { style: "percent" }).format(0.5)
    )
    await expect(clipped(canvasElement)).toBe("inset(0px 50% 0px 0px)")
    await expect(
      canvas.getByRole("img", { name: "The page before" })
    ).toBeVisible()
    await expect(canvas.getByText("Before")).toBeVisible()
    await expect(canvas.getByText("After")).toBeVisible()
    // Not stretched: contained, at its own shape.
    await expect(
      getComputedStyle(canvas.getByRole("img", { name: "The page after" }))
        .objectFit
    ).toBe("contain")

    divider.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(divider).toHaveAttribute("aria-valuenow", "55")
    await expect(args.onPositionChange).toHaveBeenLastCalledWith(55)
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}")
    await expect(divider).toHaveAttribute("aria-valuenow", "45")
    await userEvent.keyboard("{End}")
    await expect(divider).toHaveAttribute("aria-valuenow", "100")
    await userEvent.keyboard("{ArrowRight}")
    await expect(divider).toHaveAttribute("aria-valuenow", "100")
    await userEvent.keyboard("{Home}")
    await expect(clipped(canvasElement)).toBe("inset(0px 100% 0px 0px)")

    // Dragged to a quarter of the way.
    const box = divider.getBoundingClientRect()
    const at = (
      type: string,
      x: number,
      buttons = type === "pointerup" ? 0 : 1
    ) =>
      divider.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          buttons,
          pointerId: 1,
          clientX: box.left + x * box.width,
          clientY: box.top + box.height / 2,
        })
      )
    at("pointerdown", 0.5)
    at("pointermove", 0.25)
    at("pointerup", 0.25)
    await waitFor(() => expect(divider).toHaveAttribute("aria-valuenow", "25"))
    // Moving without a button pressed does not drag.
    at("pointermove", 0.75, 0)
    await rendered()
    await expect(divider).toHaveAttribute("aria-valuenow", "25")
  },
}

/**
 * Under a finger, a vertical swipe over the images is the page's scroll:
 * the line stays. A sideways drag moves it; a tap puts it there.
 */
export const Touch: Story = {
  play: async ({ canvas }) => {
    const divider = canvas.getByRole("slider", { name: "Before and after" })
    await expect(getComputedStyle(divider).touchAction).toBe("pan-y")
    const box = divider.getBoundingClientRect()
    const at = (type: string, x: number, y = 0.5) =>
      divider.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: type === "pointermove" ? -1 : 0,
          buttons: type === "pointerdown" || type === "pointermove" ? 1 : 0,
          pointerId: 2,
          pointerType: "touch",
          clientX: box.left + x * box.width,
          clientY: box.top + y * box.height,
        })
      )
    // A swipe up from right of the line: the browser scrolls, and cancels.
    at("pointerdown", 0.75, 0.7)
    at("pointermove", 0.75, 0.6)
    at("pointermove", 0.76, 0.4)
    at("pointercancel", 0.76, 0.4)
    await rendered()
    await expect(divider).toHaveAttribute("aria-valuenow", "50")
    // Sideways, it follows.
    at("pointerdown", 0.5)
    at("pointermove", 0.4)
    at("pointermove", 0.25)
    at("pointerup", 0.25)
    await waitFor(() => expect(divider).toHaveAttribute("aria-valuenow", "25"))
    // A tap.
    at("pointerdown", 0.75)
    at("pointerup", 0.75)
    await waitFor(() => expect(divider).toHaveAttribute("aria-valuenow", "75"))
  },
}

/** Its place is the app's to keep; its words, the app's language. */
export const ControlledAndLabels: Story = {
  args: {
    position: 30,
    labels: {
      before: "Avant",
      after: "Après",
      divider: "Séparateur avant/après",
      position: (percent) => `${percent} pour cent`,
    },
  },
  play: async ({ args, canvas }) => {
    const divider = canvas.getByRole("slider", {
      name: "Séparateur avant/après",
    })
    await expect(divider).toHaveAttribute("aria-valuenow", "30")
    await expect(divider).toHaveAttribute("aria-valuetext", "30 pour cent")
    divider.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(args.onPositionChange).toHaveBeenLastCalledWith(35)
    // Until the app moves it, where it says.
    await expect(divider).toHaveAttribute("aria-valuenow", "30")
    await expect(canvas.getByText("Avant")).toBeVisible()
  },
}

/** Images of different shapes each fit, neither stretched to the other. */
export const DifferentShapes: Story = {
  args: {
    after: { src: picture("hsl(30 70% 70%)", 600, 900), alt: "The page after" },
  },
  play: async ({ canvas, canvasElement }) => {
    const after = canvas.getByRole("img", { name: "The page after" })
    await waitFor(() =>
      expect((after as HTMLImageElement).naturalWidth).toBe(600)
    )
    await expect(getComputedStyle(after).objectFit).toBe("contain")
    await onTheImages(canvasElement)
  },
}

/** In a phone's narrow frame, the line is no taller than the images. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="h-80 w-80 rounded-lg border">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await onTheImages(canvasElement)
  },
}
