import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor } from "storybook/test"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { reducedCustomProperties, reducedMotionAnimation } from "./motion"

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-48" },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Avatar: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-37.5" />
        <Skeleton className="h-4 w-25" />
      </div>
    </div>
  ),
}

export const CardShape: Story = {
  name: "Card",
  render: () => (
    <Card className="w-xs">
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="aspect-square w-full" />
      </CardContent>
    </Card>
  ),
}

export const Text: Story = {
  render: () => (
    <div className="flex w-xs flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
}

export const Form: Story = {
  render: () => (
    <div className="flex w-xs flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  ),
}

/** Skeletons are silent; name the region that is loading. */
export const Table: Story = {
  render: () => (
    <div
      role="status"
      aria-label="Loading runs"
      className="flex w-md flex-col gap-2"
    >
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  ),
}

/**
 * Its pulse on the theme's timing (--motion-pulse, 2s, on --ease-loop,
 * the curve of what repeats), still where the reader asks for less
 * motion: the theme stops `animate-pulse`, so no caller has to.
 */
export const Pulse: Story = {
  play: async ({ canvasElement }) => {
    const bone = canvasElement.querySelector<HTMLElement>(
      "[data-slot=skeleton]"
    )!
    const style = getComputedStyle(bone)
    await expect(style.animationName).toBe("pulse")
    await expect(style.animationDuration).toBe("2s")
    await expect(style.animationTimingFunction).toBe(
      "cubic-bezier(0.4, 0, 0.6, 1)"
    )
    await expect(reducedMotionAnimation(bone)).toBe("none")
  },
}

/**
 * A loading state shown only past a short wait: `animate-wait-in` on
 * what holds the skeletons (their `role="status"`) keeps it unseen for
 * --motion-wait (300ms), then fades it in (motion-fade), so a load
 * quicker than that never flashes one. Where less motion is asked, the
 * wait stays and the fade goes: it shows at once, then.
 */
export const WaitIn: Story = {
  render: () => (
    <div
      role="status"
      aria-label="Loading"
      data-testid="loading"
      className="flex w-xs animate-wait-in flex-col gap-2"
    >
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
  play: async ({ canvas }) => {
    const loading = canvas.getByTestId("loading")
    const style = getComputedStyle(loading)
    await expect(style.animationName).toBe("wait-in")
    await expect(style.animationDelay).toBe("0.3s")
    await expect(style.animationDuration).toBe("0.15s")
    await expect(style.animationFillMode).toBe("backwards")
    // Unseen while it waits, then seen.
    await expect(Number(style.opacity)).toBeLessThan(0.1)
    await waitFor(() => expect(Number(style.opacity)).toBe(1))
    const reduced = reducedCustomProperties()
    await expect(reduced.get("--motion-fade")?.trim()).toBe("0s")
    await expect(reduced.has("--motion-wait")).toBe(false)
  },
}
