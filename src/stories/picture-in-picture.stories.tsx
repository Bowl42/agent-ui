import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { HugeiconsIcon } from "@hugeicons/react"
import { Globe02Icon } from "@hugeicons/core-free-icons"

import { PictureInPicture } from "@/components/picture-in-picture"
import { coarseHitSize } from "@/stories/touch"

/** A made-up page, as a remote browser would draw it small. */
const page = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#fafafa"/><rect x="24" y="24" width="592" height="56" rx="8" fill="#e4e4e7"/><text x="40" y="60" font-family="sans-serif" font-size="20" fill="#18181b">Pricing</text><rect x="24" y="112" width="160" height="40" rx="8" fill="#18181b"/></svg>`
)}`

const expanded = fn()
const closed = fn()
const cornered = fn()
const shown = fn()
const counted = fn()

function Stage({
  dir,
  ...props
}: Partial<React.ComponentProps<typeof PictureInPicture>> & {
  dir?: "rtl" | "ltr"
}) {
  return (
    <div
      dir={dir}
      data-testid="stage"
      className="relative h-150 w-full overflow-hidden rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground"
    >
      The conversation goes on here.
      <PictureInPicture
        title="Pricing · example.com"
        icon={<HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />}
        onExpand={expanded}
        onClose={closed}
        onCornerChange={cornered}
        {...props}
      >
        <button
          type="button"
          aria-label="Show the page"
          className="block size-full"
          onClick={shown}
        >
          <img src={page} alt="" draggable={false} className="size-full" />
        </button>
      </PictureInPicture>
    </div>
  )
}

const meta = {
  title: "Components/Picture in Picture",
  component: Stage,
  parameters: { layout: "padded" },
  beforeEach: () => {
    for (const spy of [expanded, closed, cornered, shown, counted])
      spy.mockClear()
  },
} satisfies Meta<typeof Stage>

export default meta
type Story = StoryObj<typeof meta>

const parts = (canvasElement: HTMLElement) => ({
  stage: within(canvasElement).getByTestId("stage"),
  window: canvasElement.querySelector<HTMLElement>(
    "[data-slot=picture-in-picture]"
  )!,
})

/** Whether it is in a corner of the stage, 16px in. */
async function inCorner(
  canvasElement: HTMLElement,
  vertical: "top" | "bottom",
  horizontal: "left" | "right"
) {
  const { stage, window } = parts(canvasElement)
  await waitFor(() => {
    const place = stage.getBoundingClientRect()
    const box = window.getBoundingClientRect()
    // The stage's border is 1px: its padding box is the place.
    if (vertical === "top") expect(Math.round(box.top - place.top)).toBe(17)
    else expect(Math.round(place.bottom - box.bottom)).toBe(17)
    if (horizontal === "left")
      expect(Math.round(box.left - place.left)).toBe(17)
    else expect(Math.round(place.right - box.right)).toBe(17)
  })
}

/** A drag by the mouse from a point of an element by (dx, dy). */
async function dragBy(element: HTMLElement, dx: number, dy: number) {
  const box = element.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  await userEvent.pointer([
    {
      keys: "[MouseLeft>]",
      target: element,
      coords: { clientX: x, clientY: y },
    },
    { target: element, coords: { clientX: x + dx / 2, clientY: y + dy / 2 } },
    { target: element, coords: { clientX: x + dx, clientY: y + dy } },
    {
      keys: "[/MouseLeft]",
      target: element,
      coords: { clientX: x + dx, clientY: y + dy },
    },
  ])
}

/**
 * In the bottom end corner, 16px in, named by its title: its bar's
 * Expand and Close are the app's.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    await expect(window).toHaveAccessibleName("Pricing · example.com")
    await inCorner(canvasElement, "bottom", "right")
    await expect(Math.round(window.getBoundingClientRect().width)).toBe(320)
    const content = window.querySelector<HTMLElement>(
      "[data-slot=picture-in-picture-content]"
    )!
    const box = content.getBoundingClientRect()
    await expect(box.width / box.height).toBeCloseTo(1.6, 1)
    await userEvent.click(
      within(window).getByRole("button", { name: "Expand" })
    )
    await expect(expanded).toHaveBeenCalledTimes(1)
    await userEvent.click(within(window).getByRole("button", { name: "Close" }))
    await expect(closed).toHaveBeenCalledTimes(1)
    await expect(shown).not.toHaveBeenCalled()
  },
}

/**
 * Dragged, by its content too, it lands in the corner it is let go
 * nearest; the press that dragged it presses nothing in it. Let go near
 * where it was, it goes back.
 */
export const DragToCorner: Story = {
  play: async ({ canvasElement }) => {
    const { stage, window } = parts(canvasElement)
    const content = within(window).getByRole("button", {
      name: "Show the page",
    })
    const place = stage.getBoundingClientRect()
    // Its middle to near the stage's top left.
    const from = content.getBoundingClientRect()
    await dragBy(
      content,
      place.left + 40 - (from.left + from.width / 2),
      place.top + 40 - (from.top + from.height / 2)
    )
    await waitFor(() => expect(cornered).toHaveBeenCalledWith("top-start"))
    await expect(window).toHaveAttribute("data-corner", "top-start")
    await inCorner(canvasElement, "top", "left")
    await expect(shown).not.toHaveBeenCalled()
    // A short drag: back to its corner, no other.
    await dragBy(content, 30, 20)
    await inCorner(canvasElement, "top", "left")
    await expect(cornered).toHaveBeenCalledTimes(1)
    await expect(shown).not.toHaveBeenCalled()
    // A tap on its content is a press, not a drag.
    await userEvent.click(content)
    await expect(shown).toHaveBeenCalledTimes(1)
  },
}

/** Focused, the arrow keys move it from corner to corner. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    window.focus()
    await expect(window).toHaveAccessibleDescription(
      "Arrow keys move it to another corner."
    )
    await userEvent.keyboard("{ArrowUp}")
    await expect(cornered).toHaveBeenLastCalledWith("top-end")
    await inCorner(canvasElement, "top", "right")
    await userEvent.keyboard("{ArrowLeft}")
    await expect(cornered).toHaveBeenLastCalledWith("top-start")
    await inCorner(canvasElement, "top", "left")
    await userEvent.keyboard("{ArrowDown}")
    await inCorner(canvasElement, "bottom", "left")
    await expect(document.activeElement).toBe(window)
  },
}

/**
 * The app's badge on its corner (how many pages, a button through them)
 * and its call for the reader under the content, read out, with a ring.
 */
export const BadgeAndAttention: Story = {
  args: {
    badge: (
      <button
        type="button"
        aria-label="3 pages: next"
        onClick={counted}
        className="flex h-6 min-w-6 items-center justify-center rounded-full bg-foreground px-2 text-xs font-medium text-background tabular-nums shadow-float"
      >
        3
      </button>
    ),
    attention: "Sign in to continue",
  },
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    const badge = within(window).getByRole("button", { name: "3 pages: next" })
    await userEvent.click(badge)
    await expect(counted).toHaveBeenCalledTimes(1)
    // On its top start corner, over its edge.
    const box = window.getBoundingClientRect()
    const mark = badge.getBoundingClientRect()
    await expect(mark.top).toBeLessThan(box.top)
    await expect(mark.left).toBeLessThan(box.left)
    // Pressing it does not drag the window.
    await expect(cornered).not.toHaveBeenCalled()
    await expect(within(window).getByRole("status")).toHaveTextContent(
      "Sign in to continue"
    )
    await expect(window).toHaveAttribute("data-attention")
  },
}

/** In a right-to-left page, its end is the left. */
export const RightToLeft: Story = {
  args: { dir: "rtl" },
  play: async ({ canvasElement }) => {
    await inCorner(canvasElement, "bottom", "left")
    const { window } = parts(canvasElement)
    window.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(cornered).toHaveBeenLastCalledWith("bottom-start")
    await inCorner(canvasElement, "bottom", "right")
  },
}

/** On a phone, 192px wide; its buttons take a finger. */
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
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    await waitFor(() =>
      expect(Math.round(window.getBoundingClientRect().width)).toBe(192)
    )
    for (const name of ["Expand", "Close"]) {
      const { width, height } = coarseHitSize(
        within(window).getByRole("button", { name })
      )
      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
    }
  },
}
