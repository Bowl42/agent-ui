import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  PartyPopperIcon,
  FireIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Marker, MarkerContent } from "@/components/ui/marker"

// Records clicks on the controls the stories exercise.
const onAction = fn()

const meta = {
  title: "Components/Bubble",
  component: Bubble,
  beforeEach: () => {
    onAction.mockClear()
  },
  args: { children: <BubbleContent>How can I help you today?</BubbleContent> },
  decorators: [
    (Story) => (
      <div className="flex w-md max-w-full flex-col gap-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Bubble>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

const variants = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "destructive",
  "ghost",
] as const

export const Variants: Story = {
  render: () => (
    <>
      {variants.map((variant) => (
        <Bubble key={variant} variant={variant}>
          <BubbleContent>
            The {variant} bubble, for one side of a conversation.
          </BubbleContent>
        </Bubble>
      ))}
    </>
  ),
}

export const Alignment: Story = {
  render: () => (
    <>
      <Bubble variant="muted">
        <BubbleContent>This bubble is aligned to the start.</BubbleContent>
      </Bubble>
      <Bubble variant="muted" align="end">
        <BubbleContent>This bubble is aligned to the end.</BubbleContent>
      </Bubble>
      <Bubble variant="muted">
        <BubbleContent>
          This multiline bubble is aligned to the start. It wraps to show the
          grouped side of the conversation.
        </BubbleContent>
      </Bubble>
      <Bubble variant="muted" align="end">
        <BubbleContent>
          This multiline bubble is aligned to the end and sits on the opposite
          side.
        </BubbleContent>
      </Bubble>
    </>
  ),
}

export const Grouped: Story = {
  render: () => (
    <>
      <BubbleGroup>
        <Bubble variant="secondary">
          <BubbleContent>I finished the audit pass.</BubbleContent>
        </Bubble>
        <Bubble variant="secondary">
          <BubbleContent>One tool still has a stale schema.</BubbleContent>
        </Bubble>
        <Bubble variant="secondary">
          <BubbleContent>Want me to fix it now?</BubbleContent>
        </Bubble>
      </BubbleGroup>
      <BubbleGroup>
        <Bubble variant="tinted" align="end">
          <BubbleContent>Yes, fix it.</BubbleContent>
        </Bubble>
        <Bubble variant="tinted" align="end">
          <BubbleContent>Then rerun the evals.</BubbleContent>
        </Bubble>
      </BubbleGroup>
    </>
  ),
}

const summary =
  "The accessibility review found two focus states that were too subtle in dark mode."
const details = `I checked the dialog, menu and drawer paths because each renders focusable controls inside a layered surface.

The dialog and drawer are fine. The menu needs its hover and focus tokens split so keyboard focus stays visible.`

function CollapsibleBubble() {
  const [open, setOpen] = React.useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Bubble variant="muted" align="end">
        <BubbleContent className="whitespace-pre-line">
          <div>{summary}</div>
          <CollapsibleContent className="mt-2">{details}</CollapsibleContent>
          <CollapsibleTrigger
            render={
              <Button
                variant="link"
                className="gap-1 p-0 text-muted-foreground"
              />
            }
          >
            {open ? "Show less" : "Show more"}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              data-icon="inline-end"
              className="group-data-panel-open/button:rotate-180"
            />
          </CollapsibleTrigger>
        </BubbleContent>
      </Bubble>
    </Collapsible>
  )
}

export const WithCollapsible: Story = {
  render: () => <CollapsibleBubble />,
  play: async ({ canvas }) => {
    const more = canvas.getByRole("button", { name: "Show more" })
    await expect(more).toHaveAttribute("aria-expanded", "false")
    await userEvent.tab()
    await expect(more).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    const less = await canvas.findByRole("button", { name: "Show less" })
    await expect(less).toHaveAttribute("aria-expanded", "true")
    await waitFor(() =>
      expect(canvas.getByText(/menu needs its hover/)).toBeVisible()
    )
    await userEvent.keyboard(" ")
    await expect(
      await canvas.findByRole("button", { name: "Show more" })
    ).toHaveAttribute("aria-expanded", "false")
  },
}

/** Read-only reactions are one image with a label describing all of them. */
export const Reactions: Story = {
  render: () => (
    <>
      <Marker variant="separator">
        <MarkerContent>side=bottom align=end</MarkerContent>
      </Marker>
      <Bubble variant="muted">
        <BubbleContent>This is a one line message.</BubbleContent>
        <BubbleReactions role="img" aria-label="Reaction: thumbs up">
          <HugeiconsIcon
            icon={ThumbsUpIcon}
            strokeWidth={2}
            className="size-3.5"
          />
        </BubbleReactions>
      </Bubble>
      <Marker variant="separator">
        <MarkerContent>side=bottom align=start</MarkerContent>
      </Marker>
      <Bubble variant="secondary" align="end">
        <BubbleContent>
          A longer message that wraps across lines so the reaction offset is
          easier to inspect.
        </BubbleContent>
        <BubbleReactions
          align="start"
          role="img"
          aria-label="Reactions: thumbs up, fire"
        >
          <HugeiconsIcon
            icon={ThumbsUpIcon}
            strokeWidth={2}
            className="size-3.5"
          />
          <HugeiconsIcon icon={FireIcon} strokeWidth={2} className="size-3.5" />
        </BubbleReactions>
      </Bubble>
      <Marker variant="separator">
        <MarkerContent>side=top align=start</MarkerContent>
      </Marker>
      <Bubble variant="muted">
        <BubbleContent>This is a one line message.</BubbleContent>
        <BubbleReactions
          side="top"
          align="start"
          role="img"
          aria-label="Reaction: fire"
        >
          <HugeiconsIcon icon={FireIcon} strokeWidth={2} className="size-3.5" />
        </BubbleReactions>
      </Bubble>
    </>
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByRole("img", { name: "Reactions: thumbs up, fire" })
      ).toBeVisible()
    )
  },
}

export const ReactionButtons: Story = {
  render: () => (
    <>
      <Bubble variant="muted">
        <BubbleContent>This is a one line message.</BubbleContent>
        <BubbleReactions>
          <Button variant="outline" size="xs">
            Reply
          </Button>
        </BubbleReactions>
      </Bubble>
      <Bubble variant="muted" align="end">
        <BubbleContent>The run finished.</BubbleContent>
        <BubbleReactions align="start">
          <Button variant="ghost" size="icon-xs" aria-label="Celebrate">
            <HugeiconsIcon icon={PartyPopperIcon} strokeWidth={2} />
          </Button>
        </BubbleReactions>
      </Bubble>
      <Bubble variant="tinted">
        <BubbleContent>Shall I merge the branch? Are you in?</BubbleContent>
        <BubbleReactions className="gap-1 bg-background">
          <Button
            variant="secondary"
            size="icon-xs"
            aria-label="Thumbs up"
            onClick={onAction}
          >
            <HugeiconsIcon icon={ThumbsUpIcon} strokeWidth={2} />
          </Button>
          <Button variant="secondary" size="icon-xs" aria-label="Thumbs down">
            <HugeiconsIcon icon={ThumbsDownIcon} strokeWidth={2} />
          </Button>
        </BubbleReactions>
      </Bubble>
    </>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Thumbs up" }))
    await expect(onAction).toHaveBeenCalledOnce()
  },
}

const quickReplies = [
  "Summarise this chat.",
  "Which model ran this?",
  "Show me the tool calls from the last run, with their inputs.",
]

/** `render` turns the content into a link or a button. */
export const ButtonsAndLinks: Story = {
  render: () => (
    <>
      <Bubble variant="muted">
        <BubbleContent render={<a href="#run" />}>
          This bubble is a link.
        </BubbleContent>
      </Bubble>
      <Bubble variant="secondary">
        <BubbleContent render={<button type="button" />}>
          This one is a button you can click.
        </BubbleContent>
      </Bubble>
      <Marker variant="separator">
        <MarkerContent>Suggestions</MarkerContent>
      </Marker>
      <BubbleGroup>
        {quickReplies.map((reply) => (
          <Bubble key={reply} variant="outline" align="end">
            <BubbleContent
              className="border-dashed border-primary"
              render={<button type="button" onClick={onAction} />}
            >
              {reply}
            </BubbleContent>
          </Bubble>
        ))}
      </BubbleGroup>
    </>
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByRole("link", { name: "This bubble is a link." })
      ).toBeVisible()
    )
    const reply = canvas.getByRole("button", { name: quickReplies[0] })
    reply.focus()
    await userEvent.keyboard("{Enter}")
    await expect(onAction).toHaveBeenCalledOnce()
  },
}
