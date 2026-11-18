import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, userEvent, waitFor } from "storybook/test"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const meta = {
  title: "Components/Scroll Area",
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

const runs = Array.from({ length: 50 }).map((_, i, a) => `run-${a.length - i}`)

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm leading-none font-medium">Runs</h4>
        {runs.map((run) => (
          <React.Fragment key={run}>
            <div className="font-mono text-sm">{run}</div>
            <Separator className="my-2" />
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  ),
  play: async ({ canvasElement }) => {
    const viewport = canvasElement.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]"
    )!
    const thumb = canvasElement.querySelector<HTMLElement>(
      "[data-slot=scroll-area-thumb]"
    )!
    // The viewport is a tab stop so keyboard users can scroll it.
    await userEvent.tab()
    await expect(viewport).toHaveFocus()
    // The thumb follows the scroll position.
    const top = thumb.getBoundingClientRect().top
    viewport.scrollTop = viewport.scrollHeight
    await waitFor(() =>
      expect(thumb.getBoundingClientRect().top).toBeGreaterThan(top + 100)
    )
  },
}

const models = [
  { name: "Opus", hue: "bg-chart-1" },
  { name: "Sonnet", hue: "bg-chart-2" },
  { name: "Haiku", hue: "bg-chart-3" },
  { name: "Local", hue: "bg-chart-4" },
  { name: "Custom", hue: "bg-chart-5" },
]

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 rounded-md border p-4">
      <div className="flex gap-4">
        {models.map((model) => (
          <figure key={model.name} className="shrink-0">
            <div className={`h-40 w-32 rounded-md ${model.hue}`} />
            <figcaption className="pt-2 text-xs text-muted-foreground">
              Model{" "}
              <span className="font-semibold text-foreground">
                {model.name}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
  play: async ({ canvasElement }) => {
    const viewport = canvasElement.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]"
    )!
    await waitFor(() =>
      expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth)
    )
    await userEvent.tab()
    await expect(viewport).toHaveFocus()
    const thumb = canvasElement.querySelector<HTMLElement>(
      "[data-slot=scroll-area-scrollbar][data-orientation=horizontal] [data-slot=scroll-area-thumb]"
    )!
    const left = thumb.getBoundingClientRect().left
    viewport.scrollLeft = viewport.scrollWidth
    await waitFor(() =>
      expect(thumb.getBoundingClientRect().left).toBeGreaterThan(left + 50)
    )
  },
}

/**
 * No taller than its max-height: shorter content sets its height, longer
 * scrolls in it.
 */
export const MaxHeight: Story = {
  render: () => (
    <ScrollArea className="max-h-48 w-48 rounded-md border">
      <div className="p-4">
        {runs.map((run) => (
          <div key={run} className="font-mono text-sm">
            {run}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-slot=scroll-area]"
    )!
    const viewport = root.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]"
    )!
    await expect(root.getBoundingClientRect().height).toBe(192)
    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
  },
}
