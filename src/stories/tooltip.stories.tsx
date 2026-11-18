import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FloppyDiskIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { SearchMark } from "@/components/search-highlight"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

export const Basic: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" className="w-fit" />}>
        Pin chat
      </TooltipTrigger>
      <TooltipContent>
        <p>Keep this chat at the top</p>
      </TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Pin chat" })
    await userEvent.hover(trigger)
    await expect(
      await body.findByText("Keep this chat at the top")
    ).toBeInTheDocument()
    await userEvent.unhover(trigger)
    await waitFor(() =>
      expect(body.queryByText("Keep this chat at the top")).toBeNull()
    )

    // Keyboard focus shows it; Escape dismisses it.
    await userEvent.tab()
    await waitFor(() => expect(trigger).toHaveFocus())
    await body.findByText("Keep this chat at the top")
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(body.queryByText("Keep this chat at the top")).toBeNull()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
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
        <Tooltip key={side}>
          <TooltipTrigger
            render={<Button variant="outline" className="capitalize" />}
          >
            {side.replace("-", " ")}
          </TooltipTrigger>
          <TooltipContent side={side}>
            <p>Tooltip on {side.replace("-", " ")}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("button", { name: "bottom" }))
    await expect(await body.findByText("Tooltip on bottom")).toBeInTheDocument()
  },
}

export const IconButton: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon" aria-label="Info" />}
      >
        <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>
        <p>Additional information</p>
      </TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Info" })).toHaveFocus()
    await body.findByText("Additional information")
  },
}

export const LongContent: Story = {
  render: () => (
    <Tooltip defaultOpen>
      <TooltipTrigger render={<Button variant="outline" className="w-fit" />}>
        Context window
      </TooltipTrigger>
      <TooltipContent>
        Older messages are summarised once the conversation passes the model
        limit. Pin a message to keep it verbatim.
      </TooltipContent>
    </Tooltip>
  ),
}

/** A disabled button gets no pointer events; wrap it so the tooltip still shows. */
export const Disabled: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-block w-fit" />}>
        <Button variant="outline" disabled>
          Deploy
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Deploying is unavailable on this plan</p>
      </TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Deploy" })
    await expect(button).toBeDisabled()
    await userEvent.hover(button.parentElement!)
    await body.findByText("Deploying is unavailable on this plan")
  },
}

export const WithKeyboardShortcut: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="outline" size="icon-sm" aria-label="Save" />}
      >
        <HugeiconsIcon icon={FloppyDiskIcon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>
        Save changes <Kbd>S</Kbd>
      </TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("button", { name: "Save" }))
    await body.findByText("Save changes")
  },
}

export const OnLink: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href="#docs"
            className="w-fit text-sm text-primary underline-offset-4 hover:underline"
          />
        }
      >
        Learn more
      </TooltipTrigger>
      <TooltipContent>
        <p>Read the documentation</p>
      </TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole("link", { name: "Learn more" })).toHaveFocus()
    await body.findByText("Read the documentation")
  },
}

export const FormattedContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" className="w-fit" />}>
        Status
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Running</p>
          <p className="text-xs opacity-80">Started 2 minutes ago</p>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("button", { name: "Status" }))
    await body.findByText("Started 2 minutes ago")
  },
}

/**
 * On its inverted surface, secondary text (text-muted-foreground, a
 * FieldDescription's) and a search's marks are inverted too, legible.
 */
export const InvertedText: Story = {
  render: () => (
    <Tooltip defaultOpen>
      <TooltipTrigger render={<Button variant="outline" />}>
        Quote
      </TooltipTrigger>
      <TooltipContent>
        <span className="flex flex-col">
          <span>
            the <SearchMark>cache</SearchMark> key
          </span>
          <span className="text-muted-foreground">From the answer</span>
        </span>
      </TooltipContent>
    </Tooltip>
  ),
  play: async () => {
    const tooltip = await body.findByText("From the answer")
    const content = tooltip.closest("[data-slot=tooltip-content]")!
    const page = getComputedStyle(document.body).getPropertyValue(
      "--muted-foreground"
    )
    // Its grey is the tooltip's text, faded, not the page's.
    await expect(
      getComputedStyle(content).getPropertyValue("--muted-foreground")
    ).not.toBe(page)
    const mark = body.getByText("cache")
    await expect(getComputedStyle(mark).color).toBe(
      getComputedStyle(content).color
    )
  },
}
