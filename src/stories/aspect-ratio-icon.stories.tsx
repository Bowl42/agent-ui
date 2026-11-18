import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, userEvent } from "storybook/test"

import { AspectRatioIcon, parseRatio } from "@/components/aspect-ratio-icon"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const meta = {
  title: "Components/Aspect Ratio Icon",
  component: AspectRatioIcon,
  args: { ratio: "16:9" },
} satisfies Meta<typeof AspectRatioIcon>

export default meta
type Story = StoryObj<typeof meta>

const frame = (icon: Element) => {
  const rect = icon.querySelector("rect")!
  return {
    width: Number(rect.getAttribute("width")),
    height: Number(rect.getAttribute("height")),
    dashed: rect.hasAttribute("stroke-dasharray"),
  }
}

const icons = (element: HTMLElement) => [
  ...element.querySelectorAll("[data-slot=aspect-ratio-icon]"),
]

/** A frame of the ratio's shape, its long side the icon's, beside its text. */
export const Default: Story = {
  render: (args) => (
    <span className="flex items-center gap-1.5 text-sm">
      <AspectRatioIcon {...args} className="size-4" />
      {String(args.ratio)}
    </span>
  ),
  play: async ({ canvasElement }) => {
    const [icon] = icons(canvasElement)
    await expect(icon).toHaveAttribute("aria-hidden", "true")
    await expect(frame(icon!)).toEqual({
      width: 20,
      height: 11.25,
      dashed: false,
    })
  },
}

const ratios = ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "32:1", "auto"]

/**
 * Each its own shape; one too thin is kept wide enough to see, and one it
 * cannot read, such as "auto", is a dashed square.
 */
export const Ratios: Story = {
  render: () => (
    <div className="flex gap-4 text-sm">
      {ratios.map((ratio) => (
        <span key={ratio} className="flex flex-col items-center gap-1">
          <AspectRatioIcon ratio={ratio} className="size-6" />
          {ratio}
        </span>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const frames = icons(canvasElement).map(frame)
    await expect(frames[0]).toMatchObject({ width: 20, height: 20 })
    await expect(frames[2]).toMatchObject({ width: 15, height: 20 })
    await expect(frames[4]).toMatchObject({ width: 11.25, height: 20 })
    // 21:9 at its own shape; 32:1, 0.6 high, kept 6 high.
    await expect(frames[5]!.width).toBe(20)
    await expect(frames[5]!.height).toBeCloseTo(8.571, 2)
    await expect(frames[6]).toMatchObject({ width: 20, height: 6 })
    await expect(frames[7]).toEqual({ width: 16, height: 16, dashed: true })
    await expect(parseRatio("32:1")).toEqual({ width: 32, height: 1 })
  },
}

/** Ratios written other ways, or as a number of width to height. */
export const Forms: Story = {
  render: () => (
    <div className="flex gap-4">
      {["16/9", "16 x 9", "16×9", 16 / 9, "0:9", "a:b", ""].map((ratio) => (
        <AspectRatioIcon key={String(ratio)} ratio={ratio} className="size-6" />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const all = icons(canvasElement)
    for (const icon of all.slice(0, 4))
      await expect(frame(icon).height).toBeCloseTo(11.25, 2)
    for (const icon of all.slice(4)) await expect(frame(icon).dashed).toBe(true)
    await expect(parseRatio(32)).toEqual({ width: 32, height: 1 })
    await expect(parseRatio(-1)).toBeUndefined()
    await expect(parseRatio("1:2:3")).toBeUndefined()
  },
}

/**
 * The choice of an image's size: in a toggle, it is the size and colour
 * of the toggle's icons, and the ratio's text names it.
 */
export const InAChoice: Story = {
  render: function Render() {
    const [value, setValue] = React.useState("16:9")
    return (
      <ToggleGroup
        variant="outline"
        aria-label="Aspect ratio"
        value={[value]}
        onValueChange={(next) => next[0] && setValue(next[0])}
      >
        {["auto", "1:1", "4:3", "16:9", "9:16"].map((ratio) => (
          <ToggleGroupItem key={ratio} value={ratio}>
            <AspectRatioIcon ratio={ratio} />
            {ratio === "auto" ? "Auto" : ratio}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    )
  },
  play: async ({ canvas }) => {
    const wide = canvas.getByRole("button", { name: "16:9" })
    await expect(wide).toHaveAttribute("aria-pressed", "true")
    const icon = wide.querySelector("svg")!
    await expect(Math.round(icon.getBoundingClientRect().width)).toBe(16)
    await expect(getComputedStyle(icon).color).toBe(
      getComputedStyle(wide).color
    )
    await userEvent.click(canvas.getByRole("button", { name: "Auto" }))
    await expect(canvas.getByRole("button", { name: "Auto" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  },
}
