import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import {
  aboveTheSheet,
  onAPhone,
  opened,
  sheetGeometry,
  swipeDown,
} from "@/stories/phone"
import { windowOf } from "@/stories/phone"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

const meta = {
  title: "Components/Popover",
  component: Popover,
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

export const Basic: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="w-fit" />}>
        Run details
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Run #42</PopoverTitle>
          <PopoverDescription>
            Finished in 12 s using 3 tools.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Run details" })
    await userEvent.tab()
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.keyboard("{Enter}")

    const popover = await body.findByRole("dialog", { name: "Run #42" })
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(popover).toHaveAccessibleDescription(
      "Finished in 12 s using 3 tools."
    )

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  },
}

/**
 * On a phone, a sheet from the bottom, across the screen over a scrim; a
 * tap on the scrim or a swipe down on its handle closes it.
 */
export const Phone: Story = {
  ...onAPhone,
  render: Basic.render,
  play: async ({ canvas }) => {
    const open = async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Run details" }))
      return opened(await body.findByRole("dialog", { name: "Run #42" }))
    }
    const popover = await open()
    await expect(popover).toHaveAttribute("data-phone-sheet")
    await expect(sheetGeometry(popover, [])).toEqual({
      across: true,
      atBottom: true,
      rows: [],
    })
    await userEvent.click(aboveTheSheet())
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())

    const again = await open()
    await swipeDown(again.querySelector("[data-slot=phone-sheet-header]")!, 120)
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Limits
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <PopoverHeader>
          <PopoverTitle>Limits</PopoverTitle>
          <PopoverDescription>Set the limits for this run.</PopoverDescription>
        </PopoverHeader>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <FieldLabel htmlFor="popover-steps" className="w-1/2">
              Max steps
            </FieldLabel>
            <Input id="popover-steps" defaultValue="25" />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="popover-tokens" className="w-1/2">
              Max tokens
            </FieldLabel>
            <Input id="popover-tokens" defaultValue="8000" />
          </Field>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Limits" }))
    const popover = await body.findByRole("dialog", { name: "Limits" })
    const steps = within(popover).getByLabelText("Max steps")
    await waitFor(() => expect(steps).toHaveFocus())
    await userEvent.clear(steps)
    await userEvent.type(steps, "50")
    await expect(steps).toHaveValue("50")
    await userEvent.tab()
    await expect(within(popover).getByLabelText("Max tokens")).toHaveFocus()
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
        <Popover key={side}>
          <PopoverTrigger
            render={<Button variant="outline" className="capitalize" />}
          >
            {side.replace("-", " ")}
          </PopoverTrigger>
          <PopoverContent
            side={side}
            className="w-40"
            aria-label={`Popover on ${side.replace("-", " ")}`}
          >
            <p>Popover on {side.replace("-", " ")}</p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "top" }))
    await expect(await body.findByText("Popover on top")).toBeInTheDocument()
  },
}

export const Alignments: Story = {
  render: () => (
    <div className="flex gap-6">
      {(["start", "center", "end"] as const).map((align) => (
        <Popover key={align}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="capitalize" />
            }
          >
            {align}
          </PopoverTrigger>
          <PopoverContent
            align={align}
            className="w-40"
            aria-label={`Aligned to ${align}`}
          >
            Aligned to {align}
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
}

export const InDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tool settings</DialogTitle>
          <DialogDescription>
            A popover opened inside a dialog.
          </DialogDescription>
        </DialogHeader>
        <Popover>
          <PopoverTrigger
            render={<Button variant="outline" className="w-fit" />}
          >
            About this tool
          </PopoverTrigger>
          <PopoverContent align="start">
            <PopoverHeader>
              <PopoverTitle>Web search</PopoverTitle>
              <PopoverDescription>
                Lets the agent search the web and read pages.
              </PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open dialog" }))
    const dialog = await body.findByRole("dialog", { name: "Tool settings" })
    await userEvent.click(
      within(dialog).getByRole("button", { name: "About this tool" })
    )
    const popover = await body.findByRole("dialog", { name: "Web search" })
    await waitFor(() => expect(popover).toHaveFocus())

    // Escape closes the popover and leaves the dialog open.
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(body.queryByRole("dialog", { name: "Web search" })).toBeNull()
    )
    await expect(
      body.getByRole("dialog", { name: "Tool settings" })
    ).toBeInTheDocument()
  },
}

/**
 * Wider and taller than there is room for: no more than there is, as a
 * menu is; what is taller scrolls.
 */
export const LargerThanTheWindow: Story = {
  ...windowOf("small", 700, 420),
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Release notes
      </PopoverTrigger>
      <PopoverContent className="w-240">
        <PopoverHeader>
          <PopoverTitle>Release notes</PopoverTitle>
        </PopoverHeader>
        {Array.from({ length: 30 }, (_, index) => (
          <p key={index}>Change {index + 1}: a fix to the build.</p>
        ))}
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Release notes" }))
    const popup = await waitFor(() => {
      const element = document.querySelector<HTMLElement>(
        "[data-slot=popover-content]"
      )
      expect(element).not.toBeNull()
      return element!
    })
    await waitFor(() => {
      const box = popup.getBoundingClientRect()
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(window.innerWidth)
      expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
    })
    await expect(popup.scrollHeight).toBeGreaterThan(popup.clientHeight)
    await userEvent.keyboard("{Escape}")
  },
}
