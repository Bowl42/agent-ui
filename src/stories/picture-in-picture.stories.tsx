import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { HugeiconsIcon } from "@hugeicons/react"
import { Globe02Icon, SourceCodeIcon } from "@hugeicons/core-free-icons"

import {
  PictureInPicture,
  PictureInPictureLines,
  type PictureInPictureItem,
} from "@/components/picture-in-picture"
import { coarseHitSize } from "@/stories/touch"

/** A made-up page, as a remote browser would draw it small. */
const frame = (label: string, shade: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#fafafa"/><rect x="24" y="24" width="592" height="56" rx="8" fill="${shade}"/><text x="40" y="60" font-family="sans-serif" font-size="20" fill="#18181b">${label}</text><rect x="24" y="112" width="160" height="40" rx="8" fill="#18181b"/></svg>`
  )}`

const shown = fn()
const page = (id: string, title: string, shade: string) =>
  ({
    id,
    title,
    icon: <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />,
    preview: (
      <button
        type="button"
        aria-label={`Show ${title}`}
        className="block size-full"
        onClick={() => shown(id)}
      >
        <img
          src={frame(title, shade)}
          alt=""
          draggable={false}
          className="size-full"
        />
      </button>
    ),
  }) satisfies PictureInPictureItem

const pricing = page("pricing", "Pricing · example.com", "#e4e4e7")
const docs = page("docs", "Docs · example.com", "#d4d4d8")
const checkout = page("checkout", "Checkout · example.com", "#a1a1aa")

const output = [
  "$ pnpm test",
  "",
  " RUN  v5.1.0 ~/code/app",
  "",
  " ✓ src/parser.test.ts (12 tests) 41ms",
  " ✓ src/cache.test.ts (8 tests) 23ms",
  " ✓ src/retry.test.ts (5 tests) 310ms",
  " ❯ src/sync.test.ts (3 tests)",
]

const terminal = {
  id: "tests",
  title: "pnpm test",
  icon: <HugeiconsIcon icon={SourceCodeIcon} strokeWidth={2} />,
  line: output.at(-1)!.trim(),
  status: "Running · 12s",
  preview: <PictureInPictureLines lines={output} />,
  form: "pill",
} satisfies PictureInPictureItem

const expanded = fn()
const closed = fn()
const cornered = fn()
const followed = fn()
const showing = fn()

function Stage({
  dir,
  items = [pricing],
  agentOn,
  ...props
}: Partial<React.ComponentProps<typeof PictureInPicture>> & {
  dir?: "rtl" | "ltr"
  /** The agent's next stops, a button going through them. */
  agentOn?: string[]
}) {
  const [active, setActive] = React.useState(agentOn?.[0] ?? items[0]?.id)
  return (
    <div
      dir={dir}
      data-testid="stage"
      className="relative h-150 w-full overflow-hidden rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground"
    >
      <p>The conversation goes on here.</p>
      {agentOn && (
        <button
          type="button"
          className="mt-2 rounded-md border px-2 py-1"
          onClick={() =>
            setActive(agentOn[(agentOn.indexOf(active!) + 1) % agentOn.length])
          }
        >
          The agent moves on
        </button>
      )}
      <PictureInPicture
        items={items}
        active={active}
        onExpand={expanded}
        onClose={closed}
        onCornerChange={cornered}
        onFollowingChange={followed}
        onShownChange={showing}
        {...props}
      />
    </div>
  )
}

const meta = {
  title: "Components/Picture in Picture",
  component: Stage,
  parameters: { layout: "padded" },
  beforeEach: () => {
    for (const spy of [expanded, closed, cornered, shown, followed, showing])
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
  await waitFor(() => {
    const { stage, window } = parts(canvasElement)
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

/** A drag by the mouse from an element's middle by (dx, dy). */
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
 * A page as a card in the bottom end corner, 16px in, named by its
 * title; Expand and Close are the app's; Minimize makes it a pill, and
 * its line a card again.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    await expect(window).toHaveAccessibleName("Pricing · example.com")
    await expect(window).toHaveAttribute("data-form", "card")
    await inCorner(canvasElement, "bottom", "right")
    await waitFor(() =>
      expect(Math.round(window.getBoundingClientRect().width)).toBe(320)
    )
    const content = window.querySelector<HTMLElement>(
      "[data-slot=picture-in-picture-content]"
    )!
    const box = content.getBoundingClientRect()
    await expect(box.width / box.height).toBeCloseTo(1.6, 1)
    // One: no dots.
    await expect(
      window.querySelector("[data-slot=picture-in-picture-dots]")
    ).toBeNull()
    await userEvent.click(
      within(window).getByRole("button", { name: "Expand" })
    )
    await expect(expanded).toHaveBeenCalledWith("pricing")
    await userEvent.click(within(window).getByRole("button", { name: "Close" }))
    await expect(closed).toHaveBeenCalledTimes(1)
    await userEvent.click(
      within(window).getByRole("button", { name: "Minimize" })
    )
    await expect(window).toHaveAttribute("data-form", "pill")
    await waitFor(() =>
      expect(Math.round(window.getBoundingClientRect().height)).toBe(40)
    )
    await userEvent.click(
      within(window).getByRole("button", {
        name: "Show the preview: Pricing · example.com",
      })
    )
    await expect(window).toHaveAttribute("data-form", "card")
    await expect(shown).not.toHaveBeenCalled()
  },
}

/** Its height and corners' radius (as drawn) each frame, until it stands. */
async function sizes(element: HTMLElement) {
  const seen: { height: number; radius: number }[] = []
  for (let frame = 0; frame < 30; frame++) {
    const { width, height } = element.getBoundingClientRect()
    seen.push({
      height: Math.round(height),
      radius: Math.min(
        parseFloat(getComputedStyle(element).borderTopLeftRadius),
        width / 2,
        height / 2
      ),
    })
    await new Promise(requestAnimationFrame)
  }
  return seen
}

/**
 * From a card to a pill and back, its box changes size, not at once: its
 * corner kept, its corners rounding as it goes.
 */
export const ChangesForm: Story = {
  play: async ({ canvasElement }) => {
    const { stage, window } = parts(canvasElement)
    await waitFor(() =>
      expect(Math.round(window.getBoundingClientRect().width)).toBe(320)
    )
    const card = Math.round(window.getBoundingClientRect().height)
    const corner = () => {
      const box = window.getBoundingClientRect()
      const place = stage.getBoundingClientRect()
      return [
        Math.round(place.right - box.right),
        Math.round(place.bottom - box.bottom),
      ]
    }
    const kept = corner()
    within(window).getByRole("button", { name: "Minimize" }).click()
    const down = await sizes(window)
    // Between the two, a frame or more; at the end, a pill.
    await expect(down.some(({ height }) => height > 40 && height < card)).toBe(
      true
    )
    await expect(down.at(-1)!.height).toBe(40)
    // Its corners rounding on, never back, to the pill's.
    for (const [at, { radius }] of down.entries())
      await expect(radius).toBeGreaterThanOrEqual(
        (down[at - 1]?.radius ?? 0) - 0.5
      )
    await expect(down.at(-1)!.radius).toBe(20)
    await expect(corner()).toEqual(kept)
    await expect(window.style.overflow).toBe("")
    within(window)
      .getByRole("button", { name: "Show the preview: Pricing · example.com" })
      .click()
    const up = await sizes(window)
    await expect(up.some(({ height }) => height > 40 && height < card)).toBe(
      true
    )
    await expect(up.at(-1)!.height).toBe(card)
    await expect(corner()).toEqual(kept)
  },
}

/** Its own `open` as the app's: the reader's button hides and shows it. */
function Closing() {
  const [open, setOpen] = React.useState(true)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="self-start rounded-md border px-2 py-1 text-sm"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide it" : "Show it"}
      </button>
      <Stage open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

/**
 * Closed while rendered (`open={false}`), it shrinks and fades out, out of
 * reach meanwhile, and is then gone; opened again, it comes as at first.
 */
export const Closes: Story = {
  render: () => <Closing />,
  play: async ({ canvas, canvasElement }) => {
    const window = () =>
      canvasElement.querySelector<HTMLElement>("[data-slot=picture-in-picture]")
    await userEvent.click(
      within(window()!).getByRole("button", { name: "Close" })
    )
    // On its way out: still there, closed, not to be reached.
    await expect(window()).toHaveAttribute("data-closed")
    await expect(window()).toHaveAttribute("inert")
    await expect(window()!.getAnimations().length).toBeGreaterThan(0)
    await waitFor(() => expect(window()).toBeNull())
    await userEvent.click(canvas.getByRole("button", { name: "Show it" }))
    await expect(window()).not.toHaveAttribute("data-closed")
    await expect(window()).toHaveAccessibleName("Pricing · example.com")
  },
}

/**
 * Several pages: dots say how many, the agent's one current. A dot, the
 * arrow keys or a sideways scroll go through them; away from the
 * agent's, "Follow" takes it back.
 */
export const ManyPages: Story = {
  args: { items: [pricing, docs, checkout] },
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    const dots = within(
      window.querySelector<HTMLElement>("[data-slot=picture-in-picture-dots]")!
    ).getAllByRole("button")
    await expect(dots).toHaveLength(3)
    await expect(dots[0]).toHaveAttribute("aria-current", "true")
    await expect(dots[1]).toHaveAccessibleName("2 of 3: Docs · example.com")
    await expect(showing).toHaveBeenLastCalledWith("pricing")
    await userEvent.click(dots[1]!)
    await expect(window).toHaveAccessibleName("Docs · example.com")
    await expect(showing).toHaveBeenLastCalledWith("docs")
    await expect(followed).toHaveBeenLastCalledWith(false)
    const follow = within(window).getByRole("button", { name: "Follow" })
    await userEvent.click(follow)
    await expect(window).toHaveAccessibleName("Pricing · example.com")
    await expect(followed).toHaveBeenLastCalledWith(true)
    await expect(
      within(window).queryByRole("button", { name: "Follow" })
    ).toBeNull()
    // By keyboard: on and back.
    window.focus()
    await userEvent.keyboard("{ArrowRight}{ArrowRight}")
    await expect(window).toHaveAccessibleName("Checkout · example.com")
    await userEvent.keyboard("{ArrowRight}")
    await expect(window).toHaveAccessibleName("Checkout · example.com")
    await userEvent.keyboard("{ArrowLeft}")
    await expect(window).toHaveAccessibleName("Docs · example.com")
    // A sideways scroll, once for a gesture; the page does not take it.
    const wheel = new WheelEvent("wheel", {
      deltaX: 60,
      bubbles: true,
      cancelable: true,
    })
    await expect(window.dispatchEvent(wheel)).toBe(false)
    await waitFor(() =>
      expect(window).toHaveAccessibleName("Checkout · example.com")
    )
  },
}

/**
 * Across the preview, a swipe turns to the next; up or down, or by its
 * bar, the window moves. A tap on the preview presses it.
 */
export const SwipeToTurn: Story = {
  args: { items: [pricing, docs, checkout] },
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    await waitFor(() =>
      expect(Math.round(window.getBoundingClientRect().width)).toBe(320)
    )
    const preview = within(window).getByRole("button", {
      name: "Show Pricing · example.com",
    })
    await dragBy(preview, -150, 0)
    await waitFor(() =>
      expect(window).toHaveAccessibleName("Docs · example.com")
    )
    await expect(cornered).not.toHaveBeenCalled()
    await expect(shown).not.toHaveBeenCalled()
    // Not far enough: back.
    const docsPreview = within(window).getByRole("button", {
      name: "Show Docs · example.com",
    })
    await dragBy(docsPreview, -30, 0)
    await expect(window).toHaveAccessibleName("Docs · example.com")
    await userEvent.click(docsPreview)
    await expect(shown).toHaveBeenCalledWith("docs")
    // Up: the window moves, to the top.
    await dragBy(docsPreview, 0, -400)
    await waitFor(() => expect(cornered).toHaveBeenCalledWith("top-end"))
    await inCorner(canvasElement, "top", "right")
  },
}

/**
 * Following the agent, it shows what the agent is on as it goes; once
 * the reader goes elsewhere, it stays there.
 */
export const FollowsTheAgent: Story = {
  args: {
    items: [pricing, docs, checkout],
    agentOn: ["pricing", "checkout"],
  },
  play: async ({ canvas, canvasElement }) => {
    const { window } = parts(canvasElement)
    const next = canvas.getByRole("button", { name: "The agent moves on" })
    await userEvent.click(next)
    await expect(window).toHaveAccessibleName("Checkout · example.com")
    // The reader goes to Docs; the agent moving on does not take it.
    window.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await expect(window).toHaveAccessibleName("Docs · example.com")
    await userEvent.click(next)
    await expect(window).toHaveAccessibleName("Docs · example.com")
    await userEvent.click(
      within(window).getByRole("button", { name: "Follow" })
    )
    await expect(window).toHaveAccessibleName("Pricing · example.com")
  },
}

/**
 * A terminal is a pill of its last line and how it runs; its line shows
 * the last lines as a card, and back.
 */
export const Terminal: Story = {
  args: { items: [terminal] },
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    await expect(window).toHaveAttribute("data-form", "pill")
    await expect(window).toHaveAccessibleName("pnpm test")
    await expect(window).toHaveTextContent("❯ src/sync.test.ts (3 tests)")
    await expect(window).toHaveTextContent("Running · 12s")
    await waitFor(() =>
      expect(Math.round(window.getBoundingClientRect().height)).toBe(40)
    )
    await inCorner(canvasElement, "bottom", "right")
    await userEvent.click(
      within(window).getByRole("button", {
        name: "Show the preview: ❯ src/sync.test.ts (3 tests)",
      })
    )
    await expect(window).toHaveAttribute("data-form", "card")
    const lines = window.querySelector("[data-slot=picture-in-picture-lines]")!
    await expect(lines).toHaveTextContent("✓ src/retry.test.ts")
  },
}

/** A pill and a card together: the agent's terminal, then its page. */
export const PageAndTerminal: Story = {
  args: { items: [terminal, pricing], agentOn: ["tests", "pricing"] },
  play: async ({ canvas, canvasElement }) => {
    const { window } = parts(canvasElement)
    await expect(window).toHaveAttribute("data-form", "pill")
    await userEvent.click(
      canvas.getByRole("button", { name: "The agent moves on" })
    )
    await expect(window).toHaveAttribute("data-form", "card")
    await expect(window).toHaveAccessibleName("Pricing · example.com")
  },
}

/** Past seven, "2/12" in place of dots. */
export const Twelve: Story = {
  args: {
    items: Array.from({ length: 12 }, (_, at) =>
      page(`page-${at + 1}`, `Page ${at + 1}`, "#e4e4e7")
    ),
  },
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    window.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(
      window.querySelector("[data-slot=picture-in-picture-dots]")
    ).toHaveTextContent("2/12")
  },
}

/**
 * Called for the reader: a card's strip and a pill's line say so, read
 * out, with a ring.
 */
export const Attention: Story = {
  args: {
    items: [
      { ...pricing, attention: "Sign in to continue" },
      { ...terminal, attention: "Tests failed" },
    ],
  },
  play: async ({ canvasElement }) => {
    const { window } = parts(canvasElement)
    await expect(within(window).getByRole("status")).toHaveTextContent(
      "Sign in to continue"
    )
    await expect(window).toHaveAttribute("data-attention")
    window.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(window).toHaveAttribute("data-form", "pill")
    await expect(window).toHaveTextContent("Tests failed")
    await expect(within(window).getByRole("status")).toHaveTextContent(
      "Tests failed"
    )
  },
}

/**
 * Dragged, it lands in the corner it is let go nearest; let go near
 * where it was, it goes back. Shift and the arrows move it too.
 */
export const DragToCorner: Story = {
  play: async ({ canvasElement }) => {
    const { stage, window } = parts(canvasElement)
    const bar = window.querySelector<HTMLElement>(
      "[data-slot=picture-in-picture-bar]"
    )!
    const place = stage.getBoundingClientRect()
    const from = bar.getBoundingClientRect()
    await dragBy(
      bar,
      place.left + 40 - (from.left + from.width / 2),
      place.top + 40 - (from.top + from.height / 2)
    )
    await waitFor(() => expect(cornered).toHaveBeenCalledWith("top-start"))
    await inCorner(canvasElement, "top", "left")
    await dragBy(bar, 30, 20)
    await inCorner(canvasElement, "top", "left")
    await expect(cornered).toHaveBeenCalledTimes(1)
    window.focus()
    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}")
    await inCorner(canvasElement, "bottom", "left")
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}")
    await inCorner(canvasElement, "bottom", "right")
    await expect(window).toHaveAccessibleDescription(
      "Shift and the arrow keys move it to another corner."
    )
  },
}

/** In a right-to-left page, its end is the left, and on is leftwards. */
export const RightToLeft: Story = {
  args: { dir: "rtl", items: [pricing, docs] },
  play: async ({ canvasElement }) => {
    await inCorner(canvasElement, "bottom", "left")
    const { window } = parts(canvasElement)
    window.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await expect(window).toHaveAccessibleName("Docs · example.com")
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}")
    await expect(cornered).toHaveBeenLastCalledWith("bottom-start")
    await inCorner(canvasElement, "bottom", "right")
  },
}

/** On a phone, a card is 240px wide; its buttons take a finger. */
export const Phone: Story = {
  args: { items: [pricing, docs] },
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
      expect(Math.round(window.getBoundingClientRect().width)).toBe(240)
    )
    for (const name of ["Minimize", "Expand", "Close"]) {
      const { width, height } = coarseHitSize(
        within(window).getByRole("button", { name })
      )
      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
    }
  },
}
