import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor, within } from "storybook/test"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { reducedMotionDuration } from "./motion"

/*
 * The theme's motion: four durations and four curves, given by name
 * (motion-hover, -fade, -size, -slide, -pop), never a component's own
 * `duration-200` or `ease-[cubic-bezier(…)]` (check-grid fails on one).
 */

const meta = { title: "Theme/Motion" } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const durations = [
  [
    "--motion-hover",
    "a row's background as the pointer comes; a popup leaving",
  ],
  [
    "--motion-fade",
    "colour and opacity in place, a chevron's turn; a popup coming",
  ],
  ["--motion-size", "a box changing size: a panel, the sidebar, a collapsible"],
  ["--motion-slide", "a surface crossing the screen: a sheet, a drawer"],
] as const

const curves = [
  ["--ease-ui", "what changes in place (ease-in-out)"],
  ["--ease-enter", "what arrives, fast then settling (ease-out)"],
  ["--ease-exit", "what leaves, gathering speed (ease-in)"],
  ["--ease-slide", "a surface under a finger, as the platform's sheets"],
] as const

const value = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** The curve drawn 48px square, time across, progress up. */
function Curve({ name }: { name: string }) {
  const [x1, y1, x2, y2] = (
    /cubic-bezier\(([^)]*)\)/.exec(value(name))?.[1] ?? "0,0,1,1"
  )
    .split(",")
    .map(Number)
  const at = (x: number, y: number) => `${x * 48},${48 - y * 48}`
  return (
    <svg viewBox="-2 -2 52 52" className="size-12 shrink-0 overflow-visible">
      <rect width="48" height="48" className="fill-muted" rx="4" />
      <path
        d={`M${at(0, 0)} C${at(x1!, y1!)} ${at(x2!, y2!)} ${at(1, 1)}`}
        className="fill-none stroke-foreground"
        strokeWidth="1.5"
      />
    </svg>
  )
}

/** The scale: each duration and curve, what it is for. */
export const Scale: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-6 text-sm">
      <dl className="grid grid-cols-[auto_auto_1fr] gap-x-4 gap-y-2">
        {durations.map(([name, use]) => (
          <div key={name} className="contents">
            <dt className="font-mono text-2sm">{name}</dt>
            <dd className="text-end tabular-nums">{value(name)}</dd>
            <dd className="text-muted-foreground">{use}</dd>
          </div>
        ))}
      </dl>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
        {curves.map(([name, use]) => (
          <div key={name} className="contents">
            <dt className="flex items-center gap-4 font-mono text-2sm">
              <Curve name={name} />
              {name}
            </dt>
            <dd className="text-muted-foreground">{use}</dd>
          </div>
        ))}
      </dl>
    </div>
  ),
}

const curve = {
  ui: "cubic-bezier(0.2, 0, 0, 1)",
  enter: "cubic-bezier(0.22, 1, 0.36, 1)",
  exit: "cubic-bezier(0.3, 0, 1, 1)",
  slide: "cubic-bezier(0.32, 0.72, 0, 1)",
}

/**
 * Tailwind's own timings are the theme's: a bare transition-colors the
 * fade on --ease-ui, ease-out the arriving curve, ease-in the leaving.
 * Where the reader asks for less motion, all of it is still.
 */
export const Utilities: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <div data-testid="bare" className="transition-colors" />
      <div data-testid="out" className="transition-opacity ease-out" />
      <div data-testid="in" className="transition-opacity ease-in" />
      <div data-testid="pop" className="transition-opacity motion-pop" />
      <div
        data-testid="pop-closed"
        data-closed=""
        className="transition-opacity motion-pop"
      />
      <div data-testid="slide" className="transition motion-slide" />
    </div>
  ),
  play: async ({ canvas }) => {
    const timing = (id: string) => {
      const style = getComputedStyle(canvas.getByTestId(id))
      return [style.transitionDuration, style.transitionTimingFunction]
    }
    await expect(timing("bare")).toEqual(["0.15s", curve.ui])
    await expect(timing("out")).toEqual(["0.15s", curve.enter])
    await expect(timing("in")).toEqual(["0.15s", curve.exit])
    // A popup arrives at the fade and leaves faster.
    await expect(timing("pop")).toEqual(["0.15s", curve.enter])
    await expect(timing("pop-closed")).toEqual(["0.1s", curve.exit])
    await expect(timing("slide")).toEqual(["0.4s", curve.slide])
    for (const id of ["bare", "pop", "pop-closed", "slide"])
      await expect(reducedMotionDuration(canvas.getByTestId(id))).toBe("0s")
  },
}

/** A dialog pops in on the arriving curve, not shadcn's 100ms `ease`. */
export const DialogPops: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogTitle>Rename</DialogTitle>
        <DialogDescription>A new name for the conversation.</DialogDescription>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog")
    const style = getComputedStyle(dialog)
    await expect(style.animationDuration).toBe("0.15s")
    await expect(style.animationTimingFunction).toBe(curve.enter)
  },
}

/** A sheet slides on the platform's curve, as the drawer does. */
export const SheetSlides: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetContent>
        <SheetTitle>Details</SheetTitle>
        <SheetDescription>The conversation's facts.</SheetDescription>
      </SheetContent>
    </Sheet>
  ),
  play: async () => {
    const sheet = await within(document.body).findByRole("dialog")
    await waitFor(() =>
      expect(getComputedStyle(sheet).transitionDuration).toBe("0.4s")
    )
    await expect(getComputedStyle(sheet).transitionTimingFunction).toBe(
      curve.slide
    )
  },
}
