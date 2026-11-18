import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import {
  ConversationFind,
  ConversationFindBar,
  type ConversationFindLabels,
} from "@/components/conversation-find"
import { AgentTurn, type AgentTurnPart } from "@/components/agent-turn"
import { Markdown } from "@/components/markdown"
import { UserMessage, UserMessageText } from "@/components/user-message"
import { FoldProvider } from "@/hooks/use-fold"
import { Button } from "@/components/ui/button"
import {
  MessageScroller,
  MessageScrollerProvider,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
} from "@/components/ui/message-scroller"

const meta = {
  title: "Components/Conversation Find",
  component: ConversationFind,
  parameters: { layout: "padded" },
  render: () => <Conversation />,
} satisfies Meta<typeof ConversationFind>
export default meta
type Story = StoryObj<typeof meta>

const parts: AgentTurnPart[] = [
  ...Array.from({ length: 5 }, (_, index) => ({
    type: "tool" as const,
    id: `command-${index}`,
    kind: "command",
    command: `pnpm run check-${index}`,
    output:
      index === 2 ? "All checks passed: quartzneedle" : "All checks passed",
    status: "done" as const,
    duration: "2s",
  })),
  {
    type: "content",
    id: "answer",
    content: <p>The review is complete. The conversation is ready.</p>,
  },
]
const code =
  "```text\n" +
  Array.from({ length: 30 }, (_, index) =>
    index === 24 ? "cobaltneedle" : `Record ${index + 1}: verified`
  ).join("\n") +
  "\n```"
const longMessage =
  Array.from(
    { length: 24 },
    (_, index) =>
      `Review note ${index + 1}: Keep the conversation readable and check all results.`
  ).join("\n") + "\nEnd of notes: amberneedle."

function Conversation({
  controlled = false,
  labels,
  onOpenChange,
}: {
  controlled?: boolean
  labels?: Partial<ConversationFindLabels>
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <MessageScrollerProvider defaultScrollPosition="start">
      <FoldProvider>
        <div className="mx-auto w-3xl max-w-full space-y-3">
          <h2>Review conversation</h2>
          {controlled && <Button onClick={() => setOpen(true)}>Find</Button>}
          <ConversationFind
            {...(controlled
              ? {
                  open,
                  onOpenChange: (next: boolean) => {
                    setOpen(next)
                    onOpenChange?.(next)
                  },
                }
              : {})}
          >
            <MessageScroller className="h-96 rounded-lg border">
              <MessageScrollerViewport aria-label="Conversation">
                <MessageScrollerContent className="gap-6 p-4">
                  <MessageScrollerItem messageId="start">
                    <Button variant="outline">Conversation actions</Button>
                  </MessageScrollerItem>
                  <MessageScrollerItem messageId="request">
                    <UserMessage>
                      <UserMessageText>
                        Please review this conversation.
                      </UserMessageText>
                    </UserMessage>
                  </MessageScrollerItem>
                  <MessageScrollerItem messageId="work">
                    <AgentTurn
                      id="review"
                      status="done"
                      parts={parts}
                      duration="10s"
                    />
                  </MessageScrollerItem>
                  <MessageScrollerItem messageId="long">
                    <UserMessage>
                      <UserMessageText>{longMessage}</UserMessageText>
                    </UserMessage>
                  </MessageScrollerItem>
                  <MessageScrollerItem messageId="code">
                    <AgentTurn
                      id="records"
                      status="done"
                      parts={[
                        {
                          type: "content",
                          id: "records-answer",
                          content: <Markdown mode="static">{code}</Markdown>,
                        },
                      ]}
                    />
                  </MessageScrollerItem>
                  {Array.from({ length: 8 }, (_, index) => (
                    <MessageScrollerItem
                      key={index}
                      messageId={`followup-${index}`}
                    >
                      <UserMessage>
                        <UserMessageText>
                          Thank you. Keep the review notes for the next
                          conversation.
                        </UserMessageText>
                      </UserMessage>
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <ConversationFindBar {...(labels ? { labels } : {})} />
            </MessageScroller>
          </ConversationFind>
        </div>
      </FoldProvider>
    </MessageScrollerProvider>
  )
}

async function openFind(element: HTMLElement, name = "Find in conversation") {
  const viewport = element.querySelector<HTMLElement>(
    "[data-slot=message-scroller-viewport]"
  )!
  viewport.focus()
  await userEvent.keyboard("{Control>}f{/Control}")
  const input = await within(element).findByRole("searchbox", { name })
  await waitFor(() => expect(input).toHaveFocus())
  return input
}

function matchInView(element: HTMLElement, query: string) {
  // The native registry is optional; DOM geometry also tests the fallback.
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let match: Range | undefined
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const start = (node as Text).data.indexOf(query)
    if (start < 0) continue
    match = document.createRange()
    match.setStart(node, start)
    match.setEnd(node, start + query.length)
    break
  }
  expect(match).toBeDefined()
  const rect = match!.getBoundingClientRect()
  const viewport = element
    .querySelector("[data-slot=message-scroller-viewport]")!
    .getBoundingClientRect()
  expect(rect.height).toBeGreaterThan(0)
  expect(rect.top).toBeGreaterThanOrEqual(viewport.top)
  expect(rect.bottom).toBeLessThanOrEqual(viewport.bottom)
}

export const Default: Story = {
  play: async ({ canvasElement, canvas }) => {
    const input = await openFind(canvasElement)
    await userEvent.type(input, "conversation")
    // Shown only while there is a query: looked up each time.
    const status = () =>
      canvasElement.querySelector("[data-slot=viewer-find-status]")
    await waitFor(() => expect(status()?.textContent).toMatch(/^1 of \d+$/))
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(status()?.textContent).toMatch(/^2 of \d+$/))
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}")
    await waitFor(() => expect(status()?.textContent).toMatch(/^1 of \d+$/))
    if (CSS.highlights)
      await waitFor(() =>
        expect(CSS.highlights.get("conversation-find-current")?.size).toBe(1)
      )
    await userEvent.clear(input)
    await userEvent.type(input, "nonexistentneedle")
    await waitFor(() => expect(status()).toHaveTextContent("No results"))
    await expect(
      canvas.getByRole("button", { name: "Previous match" })
    ).toBeDisabled()
    await expect(
      canvas.getByRole("button", { name: "Next match" })
    ).toBeDisabled()
  },
}

export const FoldedRun: Story = {
  play: async ({ canvasElement, canvas }) => {
    const input = await openFind(canvasElement)
    await userEvent.type(input, "quartzneedle")
    await canvas.findByText("1 of 1")
    await waitFor(() => {
      expect(
        canvasElement.querySelector("[data-slot=agent-turn-work-trigger]")
      ).toHaveAttribute("aria-expanded", "true")
      const details = [
        ...canvasElement.querySelectorAll(
          "[data-slot=agent-turn-step-details]"
        ),
      ].find((element) => element.textContent?.includes("quartzneedle"))!
      const panel = details.parentElement!
      expect(
        canvasElement.querySelector(`[aria-controls="${panel.id}"]`)
      ).toHaveAttribute("aria-expanded", "true")
      expect(
        canvasElement.querySelector("[data-slot=agent-turn-run] button")
      ).toHaveAttribute("aria-expanded", "true")
      matchInView(canvasElement, "quartzneedle")
    })
  },
}

export const ClampedMessage: Story = {
  play: async ({ canvasElement, canvas }) => {
    const input = await openFind(canvasElement)
    await userEvent.type(input, "amberneedle")
    await canvas.findByText("1 of 1")
    await waitFor(() => {
      expect(canvas.getByRole("button", { name: "Show less" })).toHaveAttribute(
        "aria-expanded",
        "true"
      )
      matchInView(canvasElement, "amberneedle")
    })
  },
}

export const FoldedCode: Story = {
  play: async ({ canvasElement, canvas }) => {
    await waitFor(() =>
      expect(
        canvasElement.querySelector(
          '[data-slot=code-block-rest][hidden="until-found"]'
        )
      ).not.toBeNull()
    )
    const input = await openFind(canvasElement)
    await userEvent.type(input, "cobaltneedle")
    await canvas.findByText("1 of 1")
    // Wait for replacement of the plain-text rest by rendered code lines.
    await waitFor(() => {
      expect(
        canvasElement.querySelector("[data-slot=code-block-rest]")
          ?.textContent ?? ""
      ).not.toContain("cobaltneedle")
      expect(canvas.getByText("1 of 1")).toBeVisible()
      matchInView(canvasElement, "cobaltneedle")
      if (CSS.highlights)
        expect(CSS.highlights.get("conversation-find-current")?.size).toBe(1)
    })
  },
}

export const EscapeRestoresFocus: Story = {
  play: async ({ canvasElement, canvas }) => {
    const button = canvas.getByRole("button", { name: "Conversation actions" })
    button.focus()
    await userEvent.keyboard("{Control>}f{/Control}")
    const input = await canvas.findByRole("searchbox", {
      name: "Find in conversation",
    })
    await userEvent.type(input, "conversation")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(
        canvasElement.querySelector("[data-slot=conversation-find-bar]")
      ).toBeNull()
      expect(button).toHaveFocus()
      if (CSS.highlights) {
        expect(CSS.highlights.has("conversation-find")).toBe(false)
        expect(CSS.highlights.has("conversation-find-current")).toBe(false)
      }
    })
  },
}
const changed = fn()
export const Controlled: Story = {
  beforeEach: () => {
    changed.mockClear()
  },
  render: () => <Conversation controlled onOpenChange={changed} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Find$/ }))
    const input = await canvas.findByRole("searchbox", {
      name: "Find in conversation",
    })
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.click(canvas.getByRole("button", { name: "Close find" }))
    await waitFor(() => expect(changed).toHaveBeenCalledWith(false))
  },
}
export const Labels: Story = {
  render: () => (
    <Conversation
      labels={{
        find: "Rechercher",
        previous: "Précédent",
        next: "Suivant",
        close: "Fermer",
        count: (current, total) => `${current} sur ${total}`,
        none: "Aucun résultat",
      }}
    />
  ),
  play: async ({ canvasElement, canvas }) => {
    const input = await openFind(canvasElement, "Rechercher")
    await expect(input).toHaveAttribute("placeholder", "Rechercher")
    await userEvent.type(input, "amberneedle")
    await canvas.findByText("1 sur 1")
    await expect(
      canvas.getByRole("button", { name: "Précédent" })
    ).toBeEnabled()
    await expect(canvas.getByRole("button", { name: "Suivant" })).toBeEnabled()
    await expect(canvas.getByRole("button", { name: "Fermer" })).toBeVisible()
  },
}
