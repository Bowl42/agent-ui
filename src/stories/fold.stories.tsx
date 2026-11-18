import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import { FoldProvider, useFold } from "@/hooks/use-fold"
import { Button } from "@/components/ui/button"
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

const meta = {
  title: "Components/Fold",
  parameters: { layout: "padded" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** A step whose rule is "open while it runs", and buttons to drive it. */
function Step({ id }: { id: string }) {
  const [running, setRunning] = React.useState(true)
  const [open, setOpen] = useFold(id, running)
  return (
    <div className="flex flex-col gap-2">
      <Button size="sm" variant="outline" onClick={() => setRunning(!running)}>
        {running ? "Finish" : "Run again"}
      </Button>
      <TraceCollapsible open={open} onOpenChange={setOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine status={running ? "running" : undefined}>
            <TraceTitle>{running ? "Running" : "Ran"} pnpm build</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>Built in 2s.</TraceCollapsibleContent>
      </TraceCollapsible>
    </div>
  )
}

function Mountable({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = React.useState(true)
  return (
    <div className="flex w-md max-w-full flex-col gap-3">
      <Button size="sm" variant="outline" onClick={() => setShown(!shown)}>
        {shown ? "Unmount" : "Mount"}
      </Button>
      {shown && children}
    </div>
  )
}

const trigger = (canvas: {
  getByRole: (role: string, options: { name: RegExp }) => HTMLElement
}) => canvas.getByRole("button", { name: /pnpm build/ })

const choicesChanged = fn()

/**
 * The rule decides until the reader does: open while it runs, closed when
 * it is done; once the reader has opened or closed it, the rule changes
 * nothing, and the choice outlives an unmount.
 */
export const Rules: Story = {
  render: () => (
    <FoldProvider onValueChange={choicesChanged}>
      <Mountable>
        <Step id="step:1" />
      </Mountable>
    </FoldProvider>
  ),
  play: async ({ canvas }) => {
    choicesChanged.mockClear()
    const step = () => trigger(canvas)
    await expect(step()).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(canvas.getByRole("button", { name: "Finish" }))
    await waitFor(() =>
      expect(step()).toHaveAttribute("aria-expanded", "false")
    )
    await userEvent.click(canvas.getByRole("button", { name: "Run again" }))
    await waitFor(() => expect(step()).toHaveAttribute("aria-expanded", "true"))

    // The reader closes it while it runs: it stays closed.
    await userEvent.click(step())
    await waitFor(() =>
      expect(step()).toHaveAttribute("aria-expanded", "false")
    )
    await expect(choicesChanged).toHaveBeenLastCalledWith({ "step:1": false })
    await userEvent.click(canvas.getByRole("button", { name: "Finish" }))
    await userEvent.click(canvas.getByRole("button", { name: "Run again" }))
    await expect(step()).toHaveAttribute("aria-expanded", "false")

    // Unmounted and mounted again, with its rule saying open.
    await userEvent.click(canvas.getByRole("button", { name: "Unmount" }))
    await userEvent.click(canvas.getByRole("button", { name: "Mount" }))
    await expect(step()).toHaveAttribute("aria-expanded", "false")
  },
}

/** Choices the app kept, e.g. in session storage, are where it starts. */
export const KeptChoices: Story = {
  render: () => (
    <FoldProvider defaultValue={{ "step:1": false }}>
      <Mountable>
        <Step id="step:1" />
      </Mountable>
    </FoldProvider>
  ),
  play: async ({ canvas }) => {
    await expect(trigger(canvas)).toHaveAttribute("aria-expanded", "false")
  },
}

/** Without a provider, a choice lasts only as long as the component. */
export const WithoutProvider: Story = {
  render: () => (
    <Mountable>
      <Step id="step:1" />
    </Mountable>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(trigger(canvas))
    await waitFor(() =>
      expect(trigger(canvas)).toHaveAttribute("aria-expanded", "false")
    )
    await userEvent.click(canvas.getByRole("button", { name: "Unmount" }))
    await userEvent.click(canvas.getByRole("button", { name: "Mount" }))
    await expect(trigger(canvas)).toHaveAttribute("aria-expanded", "true")
  },
}
