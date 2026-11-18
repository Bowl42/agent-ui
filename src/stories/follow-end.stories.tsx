import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown02Icon, CommandLineIcon } from "@hugeicons/core-free-icons"
import * as React from "react"
import { expect, userEvent, waitFor } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { useFollowEnd } from "@/hooks/use-follow-end"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import { frames, settled } from "@/stories/wait"

const green = "\u001b[32m"
const reset = "\u001b[0m"
const line = (index: number) =>
  `${green}✓${reset} test ${index} passed in ${10 + (index % 9)}ms\n`
const lines = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => line(from + index)).join("")

/** A command's output, as it arrives, in a code block that follows it. */
function Output() {
  const [output, setOutput] = React.useState(lines(1, 30))
  const [hidden, setHidden] = React.useState(false)
  const { ref, atEnd, scrollToEnd } = useFollowEnd<HTMLPreElement>()
  const highlighted = useHighlightedCode(output, "ansi")
  const count = output.split("\n").length - 1
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOutput((text) => text + lines(count + 1, 5))}
        >
          Add output
        </Button>
        <Button variant="outline" size="sm" onClick={() => setHidden(!hidden)}>
          {hidden ? "Show" : "Hide"}
        </Button>
      </div>
      <div hidden={hidden}>
        <CodeBlock>
          <CodeBlockHeader>
            <CodeBlockTitle>
              <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
              pnpm test
            </CodeBlockTitle>
            {atEnd ? null : (
              <CodeBlockActions>
                <Button variant="ghost" size="xs" onClick={scrollToEnd}>
                  <HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={2} />
                  Jump to end
                </Button>
              </CodeBlockActions>
            )}
          </CodeBlockHeader>
          <CodeBlockContent ref={ref} aria-label="Output" className="max-h-48">
            {highlighted.map((content, index) => (
              <CodeBlockLine key={index}>{content}</CodeBlockLine>
            ))}
          </CodeBlockContent>
        </CodeBlock>
      </div>
    </div>
  )
}

const meta = {
  title: "Components/Code Block/Follow Output",
  component: Output,
  decorators: [
    (Story) => (
      <div className="w-xl max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Output>

export default meta
type Story = StoryObj<typeof meta>

const output = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>("[data-slot=code-block-content]")!
const distance = (element: HTMLElement) =>
  element.scrollHeight - element.scrollTop - element.clientHeight
/** Waits until it is at the end, and for the scroll events of getting there. */
async function atEnd(canvas: HTMLElement) {
  await waitFor(() => expect(distance(output(canvas))).toBeLessThan(2))
  await frames(2)
}
/** Once it has stopped scrolling, e.g. after the output it would follow. */
const still = (element: HTMLElement) =>
  settled(() => [element.scrollTop, element.scrollHeight])
/** Waits until the last line added is rendered. */
const shown = (canvas: HTMLElement, index: number) =>
  waitFor(() =>
    expect(output(canvas).textContent).toContain(`test ${index} passed`)
  )
/** Scrolls up, as the reader would, and waits for the scroll event. */
async function scrollUp(element: HTMLElement) {
  const scrolled = new Promise((resolve) =>
    element.addEventListener("scroll", resolve, { once: true })
  )
  element.scrollTop = 0
  await scrolled
}

/** It starts at the end, colours ANSI output, and follows what is added. */
export const Follows: Story = {
  play: async ({ canvas, canvasElement }) => {
    await atEnd(canvasElement)
    await waitFor(() =>
      expect(
        output(canvasElement).querySelector("[style*='--shiki']")
      ).not.toBeNull()
    )
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await shown(canvasElement, 35)
    await atEnd(canvasElement)
    await expect(
      canvas.queryByRole("button", { name: "Jump to end" })
    ).not.toBeInTheDocument()
  },
}

/** Scrolled away from the end, output no longer pulls it back. */
export const ScrolledAway: Story = {
  play: async ({ canvas, canvasElement }) => {
    const element = output(canvasElement)
    await atEnd(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await shown(canvasElement, 35)
    await atEnd(canvasElement)

    element.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 }))
    await scrollUp(element)
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await shown(canvasElement, 40)
    await still(element)
    await expect(element.scrollTop).toBe(0)

    // Back at the end, it follows again.
    await userEvent.click(canvas.getByRole("button", { name: "Jump to end" }))
    await atEnd(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await shown(canvasElement, 45)
    await atEnd(canvasElement)
  },
}

/** Keyboard: an up key leaves the end before the output scrolls. */
export const Keyboard: Story = {
  play: async ({ canvas, canvasElement }) => {
    const element = output(canvasElement)
    await atEnd(canvasElement)
    const top = element.scrollTop
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "PageUp", bubbles: true })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await shown(canvasElement, 35)
    await still(element)
    await expect(element.scrollTop).toBe(top)
    await expect(
      canvas.getByRole("button", { name: "Jump to end" })
    ).toBeVisible()
  },
}

/**
 * A little way up, still within reach of the end: scrolling up does not
 * count as coming back to the end (a smooth scroll up starts there).
 */
export const NearTheEnd: Story = {
  play: async ({ canvas, canvasElement }) => {
    const element = output(canvasElement)
    await atEnd(canvasElement)
    element.dispatchEvent(new WheelEvent("wheel", { deltaY: -10 }))
    const scrolled = new Promise((resolve) =>
      element.addEventListener("scroll", resolve, { once: true })
    )
    element.scrollTop -= 10
    await scrolled
    const top = element.scrollTop
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await shown(canvasElement, 35)
    await still(element)
    await expect(element.scrollTop).toBe(top)
  },
}

/**
 * Dragging the scrollbar, or a finger on a touch screen: output added
 * while the pointer is down does not pull it back; let go away from the
 * end, it stays.
 */
export const Dragging: Story = {
  play: async ({ canvas, canvasElement }) => {
    const element = output(canvasElement)
    await atEnd(canvasElement)
    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 7,
        pointerType: "touch",
      })
    )
    // Content grows before the first scroll event of the drag.
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await shown(canvasElement, 35)
    await still(element)
    await expect(distance(element)).toBeGreaterThan(24)

    await scrollUp(element)
    window.dispatchEvent(
      new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await shown(canvasElement, 40)
    await still(element)
    await expect(element.scrollTop).toBe(0)
  },
}

/** Output added while it is hidden is followed when it is shown again. */
export const HiddenThenShown: Story = {
  play: async ({ canvas, canvasElement }) => {
    await atEnd(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Hide" }))
    await userEvent.click(canvas.getByRole("button", { name: "Add output" }))
    await userEvent.click(canvas.getByRole("button", { name: "Show" }))
    await shown(canvasElement, 35)
    await atEnd(canvasElement)
  },
}
