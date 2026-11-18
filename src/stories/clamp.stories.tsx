import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor } from "storybook/test"
import { coarseHitSize } from "@/stories/touch"
import { quiet } from "@/stories/wait"

import { Clamp } from "@/components/clamp"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"

const meta = {
  title: "Components/Clamp",
  component: Clamp,
  decorators: [
    (Story) => (
      <div className="flex w-md max-w-full flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Clamp>

export default meta
type Story = StoryObj<typeof meta>

const log = `The deploy got slow this week. Here is the end of the build log:

[12:01:02] vite v8.0.4 building for production...
[12:01:03] transforming (412) src/routes/index.tsx
[12:01:09] transforming (1931) src/components/chart.tsx
[12:01:14] ✓ 4120 modules transformed.
[12:05:02] optimizing images (212)...
[12:05:03] ✓ built in 4m 1s

Why is it so much slower than last week?`

function UserMessage({
  children,
  ...props
}: React.ComponentProps<typeof Clamp>) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble variant="muted">
          <BubbleContent className="whitespace-pre-wrap">
            <Clamp {...props}>{children}</Clamp>
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

const content = (element: HTMLElement) =>
  element.querySelector<HTMLElement>("[data-slot=clamp-content]")!

/**
 * A long message shows its first lines, fading out, and a row: a button
 * that shows it all and how many lines it has; a short one has no row.
 */
export const Default: Story = {
  render: (args) => (
    <>
      <UserMessage {...args}>{log}</UserMessage>
      <UserMessage {...args}>Why is it slower?</UserMessage>
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    const more = await canvas.findByRole("button", { name: "Show all" })
    await expect(canvas.getAllByRole("button")).toHaveLength(1)
    await expect(more).toHaveAttribute("aria-expanded", "false")
    // To a finger, 44px tall, past its 24px.
    await expect(coarseHitSize(more).height).toBeGreaterThanOrEqual(44)
    const total = Number(
      /\d+/.exec(canvas.getByText(/^\d+ lines · \d+ words$/).textContent!)![0]
    )
    const cut = content(canvasElement)
    // Its words counted, of all of it, not only those shown.
    await expect(
      canvas.getByText(/^\d+ lines · \d+ words$/).textContent
    ).toMatch(
      new RegExp(
        ` ${
          cut
            .textContent!.trim()
            .split(/\s+/)
            .filter((word) => /\w/.test(word)).length
        } words$`
      )
    )
    const lines = () =>
      Math.round(
        cut.clientHeight / parseFloat(getComputedStyle(cut).lineHeight)
      )
    await expect(lines()).toBe(6)

    // As many as it said: wrapped lines count as the reader sees them.
    await userEvent.click(more)
    const less = canvas.getByRole("button", { name: "Show less" })
    await expect(less).toHaveAttribute("aria-expanded", "true")
    await waitFor(() => expect(lines()).toBe(total))
    await userEvent.click(less)
    await waitFor(() => expect(lines()).toBe(6))
    await expect(canvas.getByRole("button", { name: "Show all" })).toBeVisible()
  },
}

/** On any bubble: the button is a tint of the text's own color. */
export const Surfaces: Story = {
  render: (args) => (
    <>
      {(["default", "secondary", "muted", "outline"] as const).map(
        (variant) => (
          <Message key={variant} align="end">
            <MessageContent>
              <Bubble variant={variant}>
                <BubbleContent className="whitespace-pre-wrap">
                  <Clamp {...args}>{log}</Clamp>
                </BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        )
      )}
    </>
  ),
}

/** Its text, for other languages. */
export const Labels: Story = {
  args: {
    lines: 2,
    labels: {
      more: "Alles anzeigen",
      less: "Einklappen",
      lines: (lines) => `${lines} Zeilen insgesamt`,
    },
  },
  render: (args) => <UserMessage {...args}>{log}</UserMessage>,
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Alles anzeigen" })
    )
    await expect(
      canvas.getByRole("button", { name: "Einklappen" })
    ).toBeVisible()
  },
}

/** The app can hold whether it is open, e.g. to keep it per message. */
export const Controlled: Story = {
  render: function Render(args) {
    const [open, setOpen] = React.useState(true)
    return (
      <>
        <span>{open ? "Open" : "Closed"}</span>
        <UserMessage {...args} open={open} onOpenChange={setOpen}>
          {log}
        </UserMessage>
      </>
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Show less" })
    )
    await expect(canvas.getByText("Closed")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Show all" })).toBeVisible()
  },
}

/** A link in the cut-off part, reached by Tab, opens it (WCAG 2.4.11). */
export const FocusInside: Story = {
  render: (args) => (
    <UserMessage {...args}>
      {log}
      {"\n"}
      <a href="#log" className="underline">
        Full log
      </a>
      {"\nThanks."}
    </UserMessage>
  ),
  play: async ({ canvas }) => {
    const more = await canvas.findByRole("button", { name: "Show all" })
    await expect(more).toHaveAttribute("aria-expanded", "false")
    await userEvent.tab()
    await expect(canvas.getByRole("link", { name: "Full log" })).toHaveFocus()
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Show less" })).toBeVisible()
    )
  },
}

const words = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    ["alpha", "beta", "gamma", "delta"].at(i % 4)
  ).join(" ")
let showWords: (count: number) => void = () => {}

/**
 * Wider when long, as a user's bubble is: a text long at its narrower
 * width and short at its wider one stays long, rather than the two taking
 * turns every frame.
 */
export const WiderWhenLong: Story = {
  render: function Render(args) {
    const [count, setCount] = React.useState(0)
    showWords = setCount
    return (
      <div className="w-75 leading-5 has-data-clamped:w-85">
        <Clamp {...args}>{words(count)}</Clamp>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector<HTMLElement>(".w-75")!
    // How many lines a count of words takes at a width, measured aside.
    const probe = document.createElement("div")
    probe.className = "leading-5"
    probe.style.cssText = "position:absolute;visibility:hidden"
    box.after(probe)
    const linesAt = (count: number, width: number) => {
      probe.style.width = `${width}px`
      probe.textContent = words(count)
      return Math.round(probe.scrollHeight / 20)
    }
    let count = 1
    while (!(linesAt(count, 300) > 6 && linesAt(count, 340) <= 6)) count++
    probe.remove()

    let turns = 0
    const observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of [...record.addedNodes, ...record.removedNodes])
          if (
            node instanceof HTMLElement &&
            node.dataset.slot === "clamp-footer"
          )
            turns++
    })
    observer.observe(box, { childList: true, subtree: true })
    React.startTransition(() => showWords(count))
    await waitFor(() =>
      expect(box.querySelector("[data-slot=clamp-footer]")).toBeInTheDocument()
    )
    // Once it has stopped changing: the row came once and stayed.
    await quiet(box)
    observer.disconnect()
    await expect(turns).toBe(1)
    await expect(Math.round(box.getBoundingClientRect().width)).toBe(340)
  },
}

/** Its height as the content first lays out, before any frame is painted. */
function FirstHeight({ found }: { found: (height: number) => void }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  React.useLayoutEffect(() => {
    const cut = ref.current?.closest<HTMLElement>("[data-slot=clamp-content]")
    if (cut) found(cut.offsetHeight)
  }, [found])
  return <span ref={ref} />
}

let firstHeight = 0

/**
 * A long message is cut as it mounts, not shown whole for a frame first:
 * in a conversation, what is below it would jump up as it closed.
 */
export const CutAsItMounts: Story = {
  render: (args) => (
    <div className="leading-5">
      <Clamp {...args}>
        {Array.from({ length: 40 }, (_, line) => `Line ${line + 1}`).join("\n")}
        <FirstHeight found={(height) => (firstHeight = height)} />
      </Clamp>
    </div>
  ),
  args: { className: "whitespace-pre-wrap" },
  play: async ({ canvasElement }) => {
    // Six lines of 20px.
    await expect(firstHeight).toBe(120)
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=clamp-footer]")
      ).toBeInTheDocument()
    )
    await expect(content(canvasElement).offsetHeight).toBe(120)
  },
}
