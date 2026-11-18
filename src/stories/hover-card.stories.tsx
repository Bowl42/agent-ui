import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

const meta = {
  title: "Components/Hover Card",
  component: HoverCard,
} satisfies Meta<typeof HoverCard>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger delay={100} closeDelay={100} href="#researcher">
        @researcher
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex flex-col gap-1.5">
          <p className="font-medium">Researcher</p>
          <p>Searches the web and summarises sources. 128 runs this week.</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("link", { name: "@researcher" })
    await userEvent.hover(trigger)
    await expect(await body.findByText("Researcher")).toBeInTheDocument()

    await userEvent.unhover(trigger)
    await waitFor(() => expect(body.queryByText("Researcher")).toBeNull())

    // Keyboard focus opens it too.
    await userEvent.tab()
    await waitFor(() => expect(trigger).toHaveFocus())
    await expect(await body.findByText("Researcher")).toBeInTheDocument()
  },
}

const sides = [
  "inline-start",
  "left",
  "top",
  "bottom",
  "right",
  "inline-end",
] as const

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-2">
      {sides.map((side) => (
        <HoverCard key={side}>
          <HoverCardTrigger
            delay={100}
            closeDelay={100}
            render={<Button variant="outline" className="capitalize" />}
          >
            {side.replace("-", " ")}
          </HoverCardTrigger>
          <HoverCardContent side={side}>
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">Hover card</p>
              <p>Shown on the {side.replace("-", " ")} side of the trigger.</p>
            </div>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("button", { name: "right" }))
    await expect(
      await body.findByText("Shown on the right side of the trigger.")
    ).toBeInTheDocument()
  },
}

export const InDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share chat</DialogTitle>
          <DialogDescription>Hover a member to see details.</DialogDescription>
        </DialogHeader>
        <HoverCard>
          <HoverCardTrigger
            delay={100}
            closeDelay={100}
            render={<Button variant="outline" className="w-fit" />}
          >
            Ada Lovelace
          </HoverCardTrigger>
          <HoverCardContent>
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">Ada Lovelace</p>
              <p>Owner of this workspace.</p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open dialog" }))
    const dialog = await body.findByRole("dialog", { name: "Share chat" })
    await userEvent.hover(
      within(dialog).getByRole("button", { name: "Ada Lovelace" })
    )
    await expect(
      await body.findByText("Owner of this workspace.")
    ).toBeInTheDocument()
  },
}
