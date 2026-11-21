import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor } from "storybook/test"

import {
  ConversationSkeleton,
  SkeletonLines,
} from "@/components/conversation-skeleton"
import { UserMessage, UserMessageText } from "@/components/user-message"

const meta = {
  title: "Components/Conversation Skeleton",
  component: ConversationSkeleton,
  decorators: [
    (Story) => (
      <div className="w-188 max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConversationSkeleton>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A conversation not here yet: a message asked and the lines of an
 * answer, in the conversation's sizes; a status for screen readers, seen
 * only past a short wait.
 */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const status = canvas.getByRole("status", { name: "Loading conversation" })
    // Past the wait, seen.
    await waitFor(() =>
      expect(Number(getComputedStyle(status).opacity)).toBe(1)
    )
    const lines = canvasElement.querySelectorAll<HTMLElement>(
      "[data-slot=skeleton-lines] > div"
    )
    await expect(lines).toHaveLength(3)
    for (const line of lines)
      await expect(line.getBoundingClientRect().height).toBe(28)
  },
}

/**
 * Its bubble as tall and as rounded as the user's message with one line,
 * at the same end edge.
 */
export const BesideAMessage: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <UserMessage>
        <UserMessageText>Make the build faster.</UserMessageText>
      </UserMessage>
      <ConversationSkeleton />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const message = canvasElement.querySelector<HTMLElement>(
      "[data-slot=user-message-text] [data-slot=bubble-content]"
    )!
    const bubble = canvasElement.querySelector<HTMLElement>(
      "[data-slot=conversation-skeleton] > [data-slot=skeleton]"
    )!
    const a = message.getBoundingClientRect()
    const b = bubble.getBoundingClientRect()
    await expect(b.height).toBe(a.height)
    await expect(Math.abs(b.right - a.right)).toBeLessThanOrEqual(1)
    await expect(getComputedStyle(bubble).borderTopLeftRadius).toBe(
      getComputedStyle(message).borderTopLeftRadius
    )
  },
}

/** Lines of text not here yet, alone: as tall as the text's lines. */
export const Lines: Story = {
  render: () => (
    <SkeletonLines
      className="text-sm leading-5"
      widths={["w-1/3", "w-2/3", "w-1/2", "w-1/4"]}
    />
  ),
  play: async ({ canvasElement }) => {
    const lines = canvasElement.querySelectorAll<HTMLElement>(
      "[data-slot=skeleton-lines] > div"
    )
    await expect(lines).toHaveLength(4)
    for (const line of lines)
      await expect(line.getBoundingClientRect().height).toBe(20)
  },
}
