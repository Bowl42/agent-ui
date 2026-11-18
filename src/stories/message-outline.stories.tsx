import * as React from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, spyOn, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/markdown"
import { MessageOutline } from "@/components/message-outline"
import { releaseNotes } from "@/stories/samples"
import { Message, MessageContent } from "@/components/ui/message"

const onOpen = fn()

const meta = {
  title: "Components/Message Outline",
  component: MessageOutline,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    onOpen.mockClear()
  },
} satisfies Meta<typeof MessageOutline>

export default meta
type Story = StoryObj<typeof meta>

function Answer(props: React.ComponentProps<typeof MessageOutline>) {
  return (
    <Message>
      <MessageContent>
        <MessageOutline onOpen={onOpen} {...props}>
          <Markdown mode="static">{releaseNotes}</Markdown>
        </MessageOutline>
      </MessageContent>
    </Message>
  )
}

const scroller = (element: HTMLElement) =>
  element.querySelector<HTMLElement>("[data-shot-scroll]")!

/**
 * A long answer, with room beside it: its outline sticks to the top, the
 * section being read marked and how far the reader is; at the bottom, a
 * button jumps to its end.
 */
export const Beside: Story = {
  render: () => (
    <div data-shot-scroll className="h-[32rem] overflow-y-auto">
      <div className="mx-auto max-w-xl px-6 py-8">
        <Answer />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const nav = await canvas.findByRole("navigation", {
      name: "On this answer",
    })
    const outline = within(nav)
    await expect(
      outline.getAllByRole("button", { name: /./ })
    ).not.toHaveLength(0)
    await expect(
      outline.getByRole("button", { name: "Summary" })
    ).toHaveAttribute("aria-current", "location")
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /^Jump to end · \d+ screens?$/ })
      ).toBeVisible()
    )

    // A heading scrolls its section into view and takes focus.
    await userEvent.click(outline.getByRole("button", { name: "Performance" }))
    const heading = canvas.getByRole("heading", { name: "Performance" })
    await waitFor(() => expect(heading).toHaveFocus())
    await waitFor(() =>
      expect(
        outline.getByRole("button", { name: "Performance" })
      ).toHaveAttribute("aria-current", "location")
    )
    // At the view's end, 24px in, not by the answer.
    const view = scroller(canvasElement)
    const end =
      view.getBoundingClientRect().left + view.clientLeft + view.clientWidth
    await expect(
      Math.round(end - nav.parentElement!.getBoundingClientRect().right)
    ).toBe(24)
    // Its previous and next 28px.
    await expect(
      outline
        .getByRole("button", { name: "Next section" })
        .getBoundingClientRect().width
    ).toBe(28)
    // Stuck to the top while the answer scrolls.
    const box = nav.getBoundingClientRect()
    await expect(box.top).toBeGreaterThanOrEqual(
      scroller(canvasElement).getBoundingClientRect().top
    )
    await expect(box.top).toBeLessThan(
      scroller(canvasElement).getBoundingClientRect().top + 40
    )

    await userEvent.click(
      outline.getByRole("button", { name: "Previous section" })
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("heading", { name: "Breaking changes" })
      ).toHaveFocus()
    )
    await userEvent.click(
      outline.getByRole("button", { name: "Open in reader" })
    )
    await expect(onOpen).toHaveBeenCalled()
  },
}

/**
 * Without room beside it, the outline is a button sticking to the top:
 * the section being read and which of how many; it opens the outline.
 */
export const Narrow: Story = {
  render: () => (
    <div data-shot-scroll className="h-[28rem] w-md overflow-y-auto">
      <div className="px-5 py-5">
        <Answer />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = await canvas.findByRole("button", {
      name: "On this answer: Summary 1 / 7",
    })
    await userEvent.click(trigger)
    const body = within(document.body)
    const nav = await body.findByRole("navigation", { name: "On this answer" })
    // Its popup named, while it closes too.
    await expect(
      body.getByRole("dialog", { name: "On this answer" })
    ).toContainElement(nav)
    await userEvent.click(within(nav).getByRole("button", { name: "Upgrade" }))
    await waitFor(() =>
      expect(canvas.getByRole("heading", { name: "Upgrade" })).toHaveFocus()
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "On this answer: Upgrade 3 / 7" })
      ).toBeVisible()
    )
    // On a band of the page's colour from the top of the view, so the
    // text scrolled past doesn't show round it.
    const scroller =
      canvasElement.querySelector<HTMLElement>("[data-shot-scroll]")!
    const band = canvasElement.querySelector<HTMLElement>(
      "[data-slot=message-outline-band]"
    )!
    const pill = canvasElement.querySelector<HTMLElement>(
      "[data-slot=message-outline-trigger]"
    )!
    await waitFor(() =>
      expect(
        Math.abs(
          band.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top
        )
      ).toBeLessThan(1)
    )
    await expect(getComputedStyle(band).backgroundColor).toBe(
      getComputedStyle(document.body).backgroundColor
    )
    await expect(
      band.getBoundingClientRect().bottom - pill.getBoundingClientRect().bottom
    ).toBe(8)
    // The heading gone to is under the band, not behind it.
    await expect(
      canvas.getByRole("heading", { name: "Upgrade" }).getBoundingClientRect()
        .top
    ).toBeGreaterThanOrEqual(band.getBoundingClientRect().bottom)
    // A 32px tab, its text 13px and regular, the count a step quieter.
    await expect(pill.getBoundingClientRect().height).toBe(32)
    await expect(getComputedStyle(pill).fontSize).toBe("13px")
    await expect(getComputedStyle(pill).fontWeight).toBe("400")
    await expect(getComputedStyle(pill).borderRadius).toBe("10px")
    const count = within(pill).getByText("3 / 7")
    await expect(getComputedStyle(count).fontSize).toBe("11px")
  },
}

/**
 * Without room beside it and `pill` false, no outline over it: a
 * ConversationMinimap beside the conversation has its sections. The
 * button at the bottom stays.
 */
export const NarrowNoPill: Story = {
  render: () => (
    <div data-shot-scroll className="h-[28rem] w-md overflow-y-auto">
      <div className="px-5 py-5">
        <Answer pill={false} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=message-outline-end]")
      ).not.toBeNull()
    )
    await expect(
      canvasElement.querySelector("[data-slot=message-outline-band]")
    ).toBeNull()
    await expect(within(canvasElement).queryByRole("navigation")).toBeNull()
  },
}

/** A short answer has no outline. */
export const Short: Story = {
  render: () => (
    <div className="mx-auto max-w-xl p-8">
      <Message>
        <MessageContent>
          <MessageOutline>
            <Markdown mode="static">
              {"## One\n\nA line.\n\n## Two\n\nAnother."}
            </Markdown>
          </MessageOutline>
        </MessageContent>
      </Message>
    </div>
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("heading", { name: "Two" })).toBeVisible()
    )
    await expect(canvas.queryByRole("navigation")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
  },
}

function ManyAnswers() {
  const [shown, setShown] = React.useState(false)
  const [grown, setGrown] = React.useState(false)
  return (
    <div data-shot-scroll className="h-[32rem] overflow-y-auto">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-8">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShown(true)}>
            Show answers
          </Button>
          <Button variant="outline" onClick={() => setGrown(true)}>
            Grow the first
          </Button>
        </div>
        {shown &&
          Array.from({ length: 142 }, (_, index) => (
            <Message key={index}>
              <MessageContent>
                <MessageOutline data-one={index % 2 === 0 || undefined}>
                  <Markdown mode="static">
                    {index === 0 && grown
                      ? releaseNotes
                      : index % 2 === 0
                        ? `## Answer ${index}\n\nA line.`
                        : `## Answer ${index}\n\nA line.\n\n## More\n\nAnother.`}
                  </Markdown>
                </MessageOutline>
              </MessageContent>
            </Message>
          ))}
      </div>
    </div>
  )
}

/**
 * Many answers in a conversation cost little: one with a heading or none
 * is never measured, and a short one does not follow the scroll. Once an
 * answer grows long with headings, its outline comes.
 */
export const Many: Story = {
  render: () => <ManyAnswers />,
  play: async ({ canvas, canvasElement }) => {
    const rect = Element.prototype.getBoundingClientRect
    const measured = new Set<Element>()
    const rects = spyOn(Element.prototype, "getBoundingClientRect")
    rects.mockImplementation(function (this: Element) {
      measured.add(this)
      return rect.call(this)
    })
    const scroll = scroller(canvasElement)
    const listens = spyOn(scroll, "addEventListener")
    try {
      await userEvent.click(
        canvas.getByRole("button", { name: "Show answers" })
      )
      await expect(
        await canvas.findByRole("heading", { name: "Answer 141" })
      ).toBeInTheDocument()
      // Past the frame its measures wait for.
      await new Promise(requestAnimationFrame)
      await new Promise(requestAnimationFrame)
      const ones = canvasElement.querySelectorAll(
        "[data-slot=message-outline][data-one]"
      )
      await expect(ones).toHaveLength(71)
      for (const one of ones) {
        const content = one.querySelector(
          "[data-slot=message-outline-content]"
        )!
        await expect(measured.has(content)).toBe(false)
      }
      await expect(
        listens.mock.calls.filter(([type]) => type === "scroll")
      ).toHaveLength(0)
    } finally {
      rects.mockRestore()
      listens.mockRestore()
    }
    await userEvent.click(
      canvas.getByRole("button", { name: "Grow the first" })
    )
    await expect(
      await canvas.findByRole("navigation", { name: "On this answer" })
    ).toBeInTheDocument()
  },
}
