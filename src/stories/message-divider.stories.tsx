import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiBrain01Icon,
  Alert02Icon,
  ArrowShrink02Icon,
  GitBranchIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent } from "storybook/test"
import { coarseHitSize } from "@/stories/touch"

import {
  MessageDivider,
  MessageDividerAction,
} from "@/components/message-divider"

const onAction = fn()

const meta = {
  title: "Components/Message Divider",
  component: MessageDivider,
  beforeEach: () => {
    onAction.mockClear()
  },
  decorators: [
    (Story) => (
      <div className="flex w-md max-w-full flex-col gap-2.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessageDivider>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Events between the messages: a day, the context compacted, the model
 * switched, a branch; what can be followed is a button.
 */
export const Default: Story = {
  render: () => (
    <>
      <MessageDivider>Yesterday</MessageDivider>
      <MessageDivider>
        <HugeiconsIcon icon={ArrowShrink02Icon} strokeWidth={2} />
        Context compacted · 182k → 41k
        <MessageDividerAction onClick={() => onAction("summary")}>
          View summary
        </MessageDividerAction>
      </MessageDivider>
      <MessageDivider>
        <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} />
        Switched to Sonnet 5.5 · Medium
      </MessageDivider>
      <MessageDivider>
        <HugeiconsIcon icon={GitBranchIcon} strokeWidth={2} />
        Branched from
        <MessageDividerAction onClick={() => onAction("branch")}>
          Tune the vite build
        </MessageDividerAction>
      </MessageDivider>
    </>
  ),
  play: async ({ canvas }) => {
    const summary = canvas.getByRole("button", { name: "View summary" })
    await userEvent.click(summary)
    await expect(onAction).toHaveBeenCalledWith("summary")
    // To a finger, 40px tall or more.
    await expect(coarseHitSize(summary).height).toBeGreaterThanOrEqual(40)
    await expect(canvas.getByText("Yesterday")).toBeVisible()
  },
}

/** Context compaction completed, running and failed, in the same quiet greys. */
export const Compaction: Story = {
  render: () => (
    <>
      <MessageDivider>
        <HugeiconsIcon icon={ArrowShrink02Icon} strokeWidth={2} />
        Context compacted · 120k → 18k tokens
      </MessageDivider>
      <MessageDivider running>
        <HugeiconsIcon icon={ArrowShrink02Icon} strokeWidth={2} />
        Compacting context…
      </MessageDivider>
      <MessageDivider>
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
        Context compaction failed · the summary exceeded the model's context
      </MessageDivider>
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByText("Context compacted · 120k → 18k tokens")
    ).toBeVisible()
    const words = canvas.getByText("Compacting context…")
    await expect(words).toBeVisible()
    await expect(
      canvas.getByText(
        "Context compaction failed · the summary exceeded the model's context"
      )
    ).toBeVisible()
    const dividers = canvasElement.querySelectorAll(
      "[data-slot=message-divider]"
    )
    await expect(dividers[0]).not.toHaveAttribute("data-running")
    await expect(dividers[1]).toHaveAttribute("data-running")
    await expect(dividers[2]).not.toHaveAttribute("data-running")
    await expect(words).toHaveClass("shimmer", "motion-reduce:shimmer-none")
    const icon = words.querySelector("svg")!
    await expect(icon).toBeVisible()
    const style = getComputedStyle(icon)
    await expect(style.color).not.toBe("transparent")
    await expect(style.color).not.toBe("rgba(0, 0, 0, 0)")
    await expect(style.stroke).toBe(style.color)
  },
}
