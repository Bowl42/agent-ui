import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { SearchHighlight, textMatches } from "@/components/search-highlight"

import { contrast, distance, over, painted, resolved } from "./paint"

const meta = {
  title: "Components/Search Highlight",
  component: SearchHighlight,
  args: {
    terms: ["deploy"],
    current: 1,
    children: "Deploy the images, then ＤＥＰＬＯＹ the cache.",
  },
} satisfies Meta<typeof SearchHighlight>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Its matches in any case, full-width or not, marked as written; the
 * current one a darker tint.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const marks = canvasElement.querySelectorAll("[data-slot=search-mark]")
    await expect([...marks].map((mark) => mark.textContent)).toEqual([
      "Deploy",
      "ＤＥＰＬＯＹ",
    ])
    await expect(marks[0]).not.toHaveAttribute("data-current")
    await expect(marks[1]).toHaveAttribute("data-current")
    // A soft grey tint, not an outline hugging the letters; the current
    // one a darker tint, not inverted: its text keeps the text colour.
    const [match, current] = [...marks].map((mark) => getComputedStyle(mark))
    await expect(match!.outlineStyle).toBe("none")
    await expect(
      distance(painted(marks[0]!), painted(canvasElement))
    ).toBeGreaterThan(8)
    await expect(
      distance(painted(marks[1]!), painted(canvasElement))
    ).toBeGreaterThan(distance(painted(marks[0]!), painted(canvasElement)))
    const ink = resolved(canvasElement, "var(--foreground)")
    await expect(current!.color).toBe(ink)
    // Legible on the surfaces it is found on, in either theme.
    for (const surface of ["background", "muted", "card"]) {
      const under = over(
        resolved(canvasElement, `var(--${surface})`),
        [255, 255, 255]
      )
      for (const style of [match!, current!]) {
        const fill = over(style.backgroundColor, under)
        await expect(contrast(over(ink, fill), fill)).toBeGreaterThan(4.5)
      }
    }
    await expect(canvasElement).toHaveTextContent(
      "Deploy the images, then ＤＥＰＬＯＹ the cache."
    )
  },
}

/** In a node: a match across its elements is marked in each. */
export const InANode: Story = {
  args: {
    terms: ["image.path"],
    current: undefined,
    children: (
      <code>
        <span className="text-primary">image</span>.<b>path</b> + 1
      </code>
    ),
  },
  play: async ({ canvasElement }) => {
    const marks = canvasElement.querySelectorAll("[data-slot=search-mark]")
    await expect([...marks].map((mark) => mark.textContent).join("")).toBe(
      "image.path"
    )
    await expect(marks[0]!.parentElement!.tagName).toBe("SPAN")
    await expect(marks[marks.length - 1]!.parentElement!.tagName).toBe("B")
    // Its pieces one band: side by side, the same tint, each line's piece
    // rounded on its own if it wraps.
    const boxes = [...marks].map((mark) => mark.getBoundingClientRect())
    for (let at = 1; at < boxes.length; at++)
      await expect(
        Math.abs(boxes[at]!.left - boxes[at - 1]!.right)
      ).toBeLessThanOrEqual(0.5)
    const style = getComputedStyle(marks[0]!)
    await expect(
      style.boxDecorationBreak ||
        style.getPropertyValue("-webkit-box-decoration-break")
    ).toBe("clone")
  },
}

/** The places are the text's own: a letter and its accent are one. */
export const Places: Story = {
  play: async () => {
    await expect(textMatches("Café café", ["CAFÉ"])).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 10 },
    ])
    await expect(textMatches("aaa", ["aa", "a"])).toEqual([
      { start: 0, end: 3 },
    ])
    await expect(textMatches("anything", [" ", ""])).toEqual([])
  },
}
