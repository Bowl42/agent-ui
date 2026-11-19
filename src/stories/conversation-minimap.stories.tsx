import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import {
  ConversationMinimap,
  type ConversationMinimapItem,
  type ConversationMinimapLabels,
} from "@/components/conversation-minimap"
import {
  AgentApp,
  AgentAppHeader,
  AgentAppColumn,
  AgentAppDock,
} from "@/components/agent-app/agent-app"
import { AgentAppSidebar } from "@/components/agent-app/agent-app-sidebar"
import {
  ConversationDetails,
  ConversationDetailsArea,
  ConversationDetailsTrigger,
  ConversationDetailsSection,
  ConversationDetailsRow,
} from "@/components/conversation-details"
import { MessageDivider } from "@/components/message-divider"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller"
import { asCoarse } from "@/stories/touch"
import { settled } from "@/stories/wait"

const turns: ConversationMinimapItem[] = Array.from(
  { length: 24 },
  (_, index) => ({
    id: `turn-${index + 1}`,
    label: `Turn ${index + 1}: Review the conversation\nConsider the details of this question.`,
    kind: index === 9 ? "error" : index === 14 ? "mark" : "message",
    ...(index === 2 && {
      attachments: ["release-notes.md", "screenshot.png"],
      reply: "The notes are ready; the screenshot shows the new map.",
    }),
    // The app's sections for a turn far from the view, not rendered.
    ...(index === 4 && { sections: ["Overview", "Specifics"] }),
  })
)
// A long reply, in sections, for one turn.
const sectioned = 20
const sectionNames = ["Summary", "What changed", "Risks", "Next steps"]
const firstLine = (index: number) => turns[index]!.label.split("\n")[0]!

function ScrollToNew() {
  const { scrollToMessage } = useMessageScroller()
  React.useEffect(() => {
    scrollToMessage("new")
  }, [scrollToMessage])
  return null
}

function Turns({
  items,
  short = false,
  newSince = false,
}: {
  items: ConversationMinimapItem[]
  short?: boolean
  newSince?: boolean
}) {
  return (
    <>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {newSince && index === 19 && (
            <MessageScrollerItem messageId="new">
              <MessageDivider>New</MessageDivider>
            </MessageScrollerItem>
          )}
          <MessageScrollerItem messageId={item.id} scrollAnchor>
            <Message align="end">
              <MessageContent>
                <Bubble variant="muted">
                  <BubbleContent className="whitespace-pre-wrap">
                    {short ? `Turn ${index + 1}` : item.label}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          </MessageScrollerItem>
          <MessageScrollerItem messageId={`${item.id}-answer`}>
            <Message>
              <MessageContent>
                {short ? (
                  "Ready."
                ) : index === sectioned ? (
                  <div className="space-y-4">
                    {sectionNames.map((name) => (
                      <section key={name} className="space-y-4">
                        <h2 className="font-semibold">{name}</h2>
                        {Array.from({ length: 4 }, (_, paragraph) => (
                          <p key={paragraph}>
                            {name}: a section of a long reply, long enough that
                            the reader moves through it a screen at a time and
                            wants to know where they are in it.
                          </p>
                        ))}
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }, (_, paragraph) => (
                      <p key={paragraph}>
                        This answer for turn {index + 1} considers how a reader
                        moves through a long conversation. Keep each question
                        and its reply together, and leave enough space to make
                        the next topic easy to find. The conversation map
                        provides a quiet way to return to an earlier question.
                      </p>
                    ))}
                  </div>
                )}
              </MessageContent>
            </Message>
          </MessageScrollerItem>
        </React.Fragment>
      ))}
    </>
  )
}

function AppConversation({ side }: { side?: "start" | "end" }) {
  const items = turns.slice(0, 16)
  return (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          projects={[]}
          conversations={[
            { id: "docs", title: "Share link docs" },
            { id: "tests", title: "Review tests" },
          ]}
        />
      }
    >
      <ConversationDetails
        details={
          <>
            <ConversationDetailsSection title="Workspace">
              <ConversationDetailsRow>Documentation</ConversationDetailsRow>
              <ConversationDetailsRow>Open in editor</ConversationDetailsRow>
            </ConversationDetailsSection>
            <ConversationDetailsSection title="Version control">
              <ConversationDetailsRow>main</ConversationDetailsRow>
              <ConversationDetailsRow>Changes</ConversationDetailsRow>
            </ConversationDetailsSection>
          </>
        }
      >
        <AgentAppHeader
          title="Review the conversation"
          actions={<ConversationDetailsTrigger />}
        />
        <ConversationDetailsArea>
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="flex-1">
              <MessageScrollerViewport aria-label="Conversation">
                <AgentAppColumn
                  render={<MessageScrollerContent />}
                  className="py-6"
                >
                  <Turns items={items} />
                </AgentAppColumn>
              </MessageScrollerViewport>
              <ConversationMinimap items={items} {...(side ? { side } : {})} />
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
          <AgentAppDock>
            <div className="rounded-composer bg-muted p-4 text-sm text-muted-foreground">
              Continue the conversation
            </div>
          </AgentAppDock>
        </ConversationDetailsArea>
      </ConversationDetails>
    </AgentApp>
  )
}

function Conversation({
  short = false,
  newSince = false,
  labels,
  side,
  resting,
}: {
  short?: boolean
  newSince?: boolean
  labels?: Partial<ConversationMinimapLabels>
  side?: "start" | "end"
  resting?: "full" | "quiet"
}) {
  const items = short ? turns.slice(0, 3) : turns
  return (
    <div className="h-120 w-2xl max-w-full overflow-hidden rounded-xl border">
      <MessageScrollerProvider autoScroll>
        {newSince && <ScrollToNew />}
        <MessageScroller>
          <MessageScrollerViewport aria-label="Conversation">
            <MessageScrollerContent className="mx-auto max-w-md p-4">
              <Turns items={items} short={short} newSince={newSince} />
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <ConversationMinimap
            items={items}
            {...(labels ? { labels } : {})}
            {...(side ? { side } : {})}
            {...(resting ? { resting } : {})}
          />
          <MessageScrollerButton {...(newSince ? { summary: "5 new" } : {})} />
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  )
}

const meta = {
  title: "Components/Conversation Minimap",
  component: ConversationMinimap,
  args: { items: turns },
  parameters: { layout: "padded" },
  render: () => <Conversation />,
} satisfies Meta<typeof ConversationMinimap>
export default meta
type Story = StoryObj<typeof meta>

const viewportOf = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>("[data-slot=message-scroller-viewport]")!
const still = (viewport: HTMLElement, also?: () => unknown) =>
  settled(() => [viewport.scrollTop, viewport.scrollHeight, also?.()], {
    busy: () => viewport.hasAttribute("data-autoscrolling"),
  })
async function visibleMessage(canvas: HTMLElement, id: string) {
  const viewport = viewportOf(canvas)
  await waitFor(() => {
    const message = viewport.querySelector<HTMLElement>(
      `[data-message-id="${id}"]`
    )!
    const box = message.getBoundingClientRect()
    const view = viewport.getBoundingClientRect()
    expect(box.top).toBeGreaterThanOrEqual(view.top - 1)
    expect(box.bottom).toBeLessThanOrEqual(view.bottom + 1)
  })
}
async function map(canvas: HTMLElement) {
  const nav = await within(canvas).findByRole("navigation", {
    name: "Conversation map",
  })
  await still(viewportOf(canvas))
  return nav
}

/**
 * A long conversation, opened at its end: one tick per turn, the current
 * one marked. A tick jumps to its turn.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    await expect(nav).toBeVisible()
    const ticks = within(nav).getAllByRole("button", { name: /Turn / })
    await expect(ticks).toHaveLength(turns.length)
    await waitFor(() =>
      expect(ticks.at(-1)).toHaveAttribute("aria-current", "location")
    )
    await expect(ticks.at(-1)).toHaveAttribute("data-in-view")
    await userEvent.click(ticks[2]!)
    await visibleMessage(canvasElement, "turn-3")
    await waitFor(() =>
      expect(ticks[2]).toHaveAttribute("aria-current", "location")
    )
    await expect(ticks[2]).toHaveFocus()
  },
}

/**
 * The ticks fall off as a dock's icons from the current one: 24px and
 * the text's colour there, each row further a step shorter and lighter,
 * 8px from the fifth on. Under the pointer the falloff centres on the
 * tick pointed at, and back on the current one as it leaves.
 */
export const Falloff: Story = {
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    // Every row, a reply's sections too: the falloff counts rows.
    const ticks = [...nav.querySelectorAll<HTMLElement>("button[data-kind]")]
    const line = (tick: HTMLElement) => tick.querySelector("span")!
    const width = (tick: HTMLElement) =>
      Math.round(line(tick).getBoundingClientRect().width)
    // A section or a mark a step behind a turn.
    const lengths = [24, 18, 14, 11, 8]
    const expected = (centre: number) =>
      ticks.map((tick, index) => {
        if (tick.dataset.kind === "error") return width(tick)
        const behind =
          tick.dataset.kind === "section" || tick.dataset.kind === "mark"
        return lengths[Math.min(4, Math.abs(index - centre) + (behind ? 1 : 0))]
      })
    const last = ticks.length - 1
    await waitFor(() =>
      expect(ticks[last]).toHaveAttribute("aria-current", "location")
    )
    await waitFor(() => expect(ticks.map(width)).toEqual(expected(last)))
    await expect(width(ticks[last]!)).toBe(24)
    const ink = (tick: HTMLElement) =>
      getComputedStyle(line(tick)).backgroundColor
    const text = getComputedStyle(nav).color
    await expect(ink(ticks[last]!)).toBe(text)
    await expect(ink(ticks[last - 1]!)).not.toBe(text)
    // Pointed at, a far turn is the centre, both ways.
    const at = ticks.findIndex(
      (tick, index) => index > 2 && tick.dataset.kind === "message"
    )
    await userEvent.hover(ticks[at]!)
    await waitFor(() => expect(ticks.map(width)).toEqual(expected(at)))
    await expect(width(ticks[at]!)).toBe(24)
    await userEvent.unhover(nav)
    await waitFor(() => expect(ticks.map(width)).toEqual(expected(last)))
  },
}

/** Arrows, Home and End move between ticks without scrolling; Enter jumps. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    const ticks = within(nav).getAllByRole("button", { name: /Turn / })
    await waitFor(() =>
      expect(ticks.at(-1)).toHaveAttribute("aria-current", "location")
    )
    ticks.at(-1)!.focus()
    await userEvent.keyboard("{ArrowUp}")
    await expect(ticks.at(-2)).toHaveFocus()
    await expect(ticks.at(-1)).toHaveAttribute("aria-current", "location")
    await userEvent.keyboard("{Home}")
    await expect(ticks[0]).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await visibleMessage(canvasElement, "turn-1")
    await waitFor(() =>
      expect(
        within(nav).getByRole("button", { name: "Previous turn" })
      ).toBeDisabled()
    )
    await userEvent.keyboard("{ArrowDown}")
    await expect(ticks[1]).toHaveFocus()
    await userEvent.click(
      within(nav).getByRole("button", { name: "Next turn" })
    )
    await waitFor(() =>
      expect(ticks[1]).toHaveAttribute("aria-current", "location")
    )
  },
}

/**
 * Hovering a tick, or focusing it, shows its turn's card: the question's
 * first line, the reply's opening, its attachments.
 */
export const Card: Story = {
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    const tick = within(nav).getByRole("button", { name: firstLine(2) })
    const card = () =>
      document.querySelector<HTMLElement>(
        "[data-slot=conversation-minimap-card]"
      )
    await userEvent.hover(tick)
    await waitFor(() => expect(card()).toBeVisible())
    await expect(card()).toHaveTextContent(firstLine(2))
    await expect(card()).not.toHaveTextContent("Consider the details")
    // The app's words for the reply: its message far off is not rendered.
    await expect(card()).toHaveTextContent(
      "The notes are ready; the screenshot shows the new map."
    )
    await expect(card()).toHaveTextContent("release-notes.md, screenshot.png")
    await userEvent.unhover(tick)
    await waitFor(() => expect(card()).toBeNull())
    // From the keyboard too.
    tick.focus()
    await waitFor(() => expect(card()).toBeVisible())
    tick.blur()
    await waitFor(() => expect(card()).toBeNull())
  },
}

/**
 * A long reply's headings are shorter ticks under its turn's: the one
 * being read marked, as the reader scrolls; one jumps to its heading;
 * the card lists them, the one hovered bold. The ticks near the pointer
 * grow.
 */
export const Sections: Story = {
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    const viewport = viewportOf(canvasElement)
    const what = await within(nav).findByRole("button", {
      name: "What changed",
    })
    await expect(what).toHaveAttribute("data-kind", "section")
    // Under its turn, in its list.
    const turn = within(nav).getByRole("button", {
      name: firstLine(sectioned),
    })
    await expect(what.closest("li")!.parentElement!.parentElement).toBe(
      turn.closest("li")
    )
    await userEvent.click(what)
    const heading = within(viewport).getByRole("heading", {
      name: "What changed",
    })
    await waitFor(() =>
      expect(
        Math.abs(
          heading.getBoundingClientRect().top -
            viewport.getBoundingClientRect().top
        )
      ).toBeLessThan(4)
    )
    await waitFor(() =>
      expect(what).toHaveAttribute("aria-current", "location")
    )
    await expect(turn).not.toHaveAttribute("aria-current")
    what.blur()
    // Its card lists the reply's sections, this one bold, and opens with
    // the reply's first paragraph, read from it.
    const risks = within(nav).getByRole("button", { name: "Risks" })
    await userEvent.hover(risks)
    // The one hovered, once the card of the one clicked has closed: on a
    // slow machine that one may still be the only card at first, so the
    // card is found anew until it is the hovered one's.
    const openCard = () => {
      const cards = document.querySelectorAll<HTMLElement>(
        "[data-slot=conversation-minimap-card]"
      )
      expect(cards).toHaveLength(1)
      expect(cards[0]).toBeVisible()
      return cards[0]!
    }
    const card = await waitFor(() => {
      const card = openCard()
      expect(within(card).getByText("Risks")).toHaveClass("font-medium")
      return card
    })
    await expect(
      [...card.querySelectorAll("li")].map((item) => item.textContent)
    ).toEqual(sectionNames)
    await expect(card).toHaveTextContent(/Summary: a section of a long reply/)
    // The falloff centred on the pointer: the heading pointed at longest,
    // its neighbour a step shorter, a far turn short.
    const width = (button: HTMLElement) =>
      button.querySelector("span")!.getBoundingClientRect().width
    const far = within(nav).getByRole("button", { name: firstLine(3) })
    await waitFor(() => expect(width(risks)).toBeGreaterThan(14))
    await expect(width(what)).toBeGreaterThan(10)
    await expect(width(what)).toBeLessThan(width(risks))
    await expect(width(far)).toBe(8)
    await userEvent.unhover(risks)
    // The app's sections for a turn not rendered: ticks all the same.
    await expect(
      within(nav).getByRole("button", { name: "Overview" })
    ).toHaveAttribute("data-kind", "section")
  },
}

/** A conversation that fits shows no map. */
export const Fits: Story = {
  render: () => <Conversation short />,
  play: async ({ canvasElement }) => {
    await still(viewportOf(canvasElement))
    await expect(within(canvasElement).queryByRole("navigation")).toBeNull()
  },
}

/** Hidden on touch screens. */
export const OnTouchScreens: Story = {
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    await expect(asCoarse(nav, () => getComputedStyle(nav).display)).toBe(
      "none"
    )
  },
}

/** Its words are labels, for other languages. */
export const Labels: Story = {
  render: () => (
    <Conversation
      labels={{
        title: "Turn navigation",
        previous: "Earlier turn",
        next: "Later turn",
        failed: "Unsuccessful",
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const nav = await within(canvasElement).findByRole("navigation", {
      name: "Turn navigation",
    })
    await expect(
      within(nav).getByRole("button", { name: "Earlier turn" })
    ).toBeInTheDocument()
    await expect(
      within(nav).getByRole("button", { name: "Later turn" })
    ).toBeInTheDocument()
    await expect(
      within(nav).getByRole("button", { name: /^Unsuccessful: Turn 10/ })
    ).toBeInTheDocument()
  },
}

/**
 * Back in a conversation: it opens at a "New" divider before the first
 * unseen message, and the scroll button says how many are new.
 */
export const NewSinceLastVisit: Story = {
  render: () => <Conversation newSince />,
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement)
    const divider = within(canvasElement).getByText("New", { exact: true })
    await still(viewport, () => divider.getBoundingClientRect().top)
    await visibleMessage(canvasElement, "new")
    // At the top, below the content's padding.
    const padding = parseFloat(
      getComputedStyle(viewport.firstElementChild!).paddingTop
    )
    await expect(
      Math.abs(
        divider.closest("[data-message-id]")!.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top -
          padding
      )
    ).toBeLessThanOrEqual(1)
    await expect(
      within(canvasElement).getByRole("button", {
        name: /Scroll to end.*5 new/,
      })
    ).toBeVisible()
  },
}

function viewport(name: string, width: number, height: number) {
  return {
    parameters: {
      layout: "fullscreen",
      viewport: {
        options: {
          [name]: {
            name,
            styles: { width: `${width}px`, height: `${height}px` },
            type: "tablet",
          },
        },
      },
    },
    globals: { viewport: { value: name, isRotated: false } },
  } satisfies Partial<Story>
}

/**
 * In the agent app, wide: below the pinned details card, in the margin
 * beside the column.
 */
export const InAgentApp: Story = {
  ...viewport("wide", 1440, 900),
  render: () => <AppConversation />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const details = await canvas.findByRole("region", { name: "Details" })
    await expect(details).toBeVisible()
    const nav = await map(canvasElement)
    const card = details.querySelector("[data-slot=conversation-details-card]")!
    const column = canvasElement.querySelector("[data-slot=agent-app-column]")!
    const root = nav.closest("[data-slot=message-scroller]")!
    await waitFor(() => {
      expect(nav).toBeVisible()
      // 12px below the card.
      expect(
        Math.abs(
          nav.getBoundingClientRect().top -
            card.getBoundingClientRect().bottom -
            12
        )
      ).toBeLessThanOrEqual(1)
      const contentEnd =
        column.getBoundingClientRect().right -
        parseFloat(getComputedStyle(column).paddingRight)
      expect(nav.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        contentEnd
      )
      expect(nav.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        root.getBoundingClientRect().bottom + 1
      )
    })
    await expect(
      within(nav).getByRole("button", { name: /^Failed: / })
    ).toBeInTheDocument()
  },
}

/** Once the details card is closed, the map takes its place. */
export const InAgentAppCardClosed: Story = {
  ...viewport("wide", 1440, 900),
  render: () => <AppConversation />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const details = await canvas.findByRole("region", { name: "Details" })
    const nav = await map(canvasElement)
    const card = details.querySelector("[data-slot=conversation-details-card]")!
    await waitFor(() =>
      expect(nav.getBoundingClientRect().top).toBeGreaterThan(
        card.getBoundingClientRect().bottom
      )
    )
    const cardBottom = card.getBoundingClientRect().bottom
    await userEvent.click(canvas.getByRole("button", { name: "Details" }))
    await waitFor(() => {
      expect(canvas.queryByRole("region", { name: "Details" })).toBeNull()
      expect(nav.getBoundingClientRect().top).toBeLessThan(cardBottom)
    })
  },
}

/**
 * At the start, beside the sidebar: its room measured there, its cards
 * and tooltips opening towards the conversation.
 */
export const AtStart: Story = {
  render: () => <Conversation side="start" />,
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    const root = nav.closest("[data-slot=message-scroller]")!
    const content = canvasElement.querySelector(
      "[data-slot=message-scroller-content]"
    )!
    await waitFor(() => expect(nav).toBeVisible())
    const box = nav.getBoundingClientRect()
    await expect(
      Math.abs(box.left - root.getBoundingClientRect().left - 8)
    ).toBeLessThanOrEqual(1)
    await expect(box.right).toBeLessThanOrEqual(
      content.getBoundingClientRect().left
    )
    const tick = within(nav).getByRole("button", { name: firstLine(2) })
    await userEvent.hover(tick)
    const card = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot=conversation-minimap-card]"
      )
      expect(found).toBeVisible()
      return found!
    })
    await expect(card.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      box.right
    )
    await userEvent.unhover(tick)
    const next = within(nav).getByRole("button", { name: "Previous turn" })
    await userEvent.hover(next)
    await waitFor(
      () => {
        const tooltip = document.querySelector<HTMLElement>(
          "[data-slot=tooltip-content]"
        )
        expect(tooltip).toBeVisible()
        expect(tooltip!.getBoundingClientRect().left).toBeGreaterThanOrEqual(
          box.right
        )
      },
      { timeout: 3000 }
    )
  },
}

/**
 * Quiet at rest: the falloff at half its lengths, in fainter greys; as
 * long and dark as ever under the pointer or with focus in it.
 */
export const QuietAtRest: Story = {
  render: () => <Conversation side="start" resting="quiet" />,
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    const line = (name: string | RegExp) =>
      within(nav)
        .getByRole("button", { name })
        .querySelector<HTMLElement>("span")!
    const width = (name: string | RegExp) =>
      line(name).getBoundingClientRect().width
    const current = () =>
      within(nav)
        .getAllByRole("button")
        .find((button) => button.getAttribute("aria-current") === "location")!
        .querySelector<HTMLElement>("span")!
    await expect(nav).toHaveAttribute("data-quiet")
    // At the last turn, no next one: its button hidden too.
    const next = within(nav).getByRole("button", { name: "Next turn" })
    await expect(next).toBeDisabled()
    await waitFor(() => expect(getComputedStyle(next).opacity).toBe("0"))
    await waitFor(() => {
      expect(width(firstLine(2))).toBeLessThanOrEqual(6.5)
      expect(current().getBoundingClientRect().width).toBeLessThanOrEqual(12.5)
      expect(current().getBoundingClientRect().width).toBeGreaterThan(
        width(firstLine(2))
      )
    })
    await userEvent.hover(nav)
    await waitFor(() => {
      expect(getComputedStyle(next).opacity).toBe("0.5")
      expect(nav).not.toHaveAttribute("data-quiet")
      expect(width(firstLine(2))).toBeGreaterThanOrEqual(8)
    })
    await userEvent.unhover(nav)
    await waitFor(() => expect(nav).toHaveAttribute("data-quiet"))
    // From the keyboard: awake while focus is in it.
    within(nav)
      .getByRole("button", { name: firstLine(2) })
      .focus()
    await waitFor(() => {
      expect(nav).not.toHaveAttribute("data-quiet")
      expect(width(firstLine(2))).toBe(24)
    })
    ;(document.activeElement as HTMLElement).blur()
    await waitFor(() => expect(nav).toHaveAttribute("data-quiet"))
  },
}

/**
 * At the start in the agent app: beside the sidebar, at the top since the
 * details card is at the other side, hidden once the column fills the area.
 */
export const InAgentAppAtStart: Story = {
  ...viewport("wide", 1440, 900),
  render: () => <AppConversation side="start" />,
  play: async ({ canvasElement }) => {
    const nav = await map(canvasElement)
    const column = canvasElement.querySelector("[data-slot=agent-app-column]")!
    const root = nav.closest("[data-slot=message-scroller]")!
    await waitFor(() => {
      expect(nav).toBeVisible()
      const contentStart =
        column.getBoundingClientRect().left +
        parseFloat(getComputedStyle(column).paddingLeft)
      expect(nav.getBoundingClientRect().right).toBeLessThanOrEqual(
        contentStart
      )
      expect(
        nav.getBoundingClientRect().left - root.getBoundingClientRect().left
      ).toBeLessThanOrEqual(9)
      expect(nav.style.top).toBe("")
    })
  },
}

/** Where the column fills the area, there is no room: hidden. */
export const Narrow: Story = {
  ...viewport("narrow", 900, 800),
  render: () => <AppConversation />,
  play: async ({ canvasElement }) => {
    await still(viewportOf(canvasElement))
    await waitFor(() => {
      expect(
        within(canvasElement).queryByRole("navigation", {
          name: "Conversation map",
        })
      ).toBeNull()
      expect(
        canvasElement.querySelector("[data-slot=conversation-minimap]")
      ).toHaveAttribute("hidden")
    })
  },
}
