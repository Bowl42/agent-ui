import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const meta = {
  title: "Components/Sheet",
  component: Sheet,
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

export const WithForm: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Agent settings
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Agent settings</SheetTitle>
          <SheetDescription>
            Change how this agent runs. Save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sheet-agent-name">Name</FieldLabel>
              <Input id="sheet-agent-name" defaultValue="Researcher" />
            </Field>
            <Field>
              <FieldLabel htmlFor="sheet-agent-model">Model</FieldLabel>
              <Input id="sheet-agent-model" defaultValue="claude-opus" />
            </Field>
          </FieldGroup>
        </div>
        <SheetFooter>
          <Button type="submit">Save changes</Button>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Agent settings" })
    await userEvent.tab()
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.keyboard("{Enter}")

    const sheet = await body.findByRole("dialog", { name: "Agent settings" })
    await waitFor(() =>
      expect(within(sheet).getByLabelText("Name")).toHaveFocus()
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())

    await userEvent.keyboard("{Enter}")
    await body.findByRole("dialog", { name: "Agent settings" })
  },
}

export const NoCloseButton: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        No close button
      </SheetTrigger>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>No close button</SheetTitle>
          <SheetDescription>
            This sheet has no close button in the corner. Press Escape or click
            outside to close it.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "No close button" })
    )
    const sheet = await body.findByRole("dialog", { name: "No close button" })
    await expect(within(sheet).queryByRole("button")).toBeNull()
  },
}

/** The close button's name in the app's language. */
export const CloseLabel: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Einstellungen
      </SheetTrigger>
      <SheetContent closeLabel="Schließen">
        <SheetHeader>
          <SheetTitle>Einstellungen</SheetTitle>
          <SheetDescription>
            Wie Unterhaltungen angezeigt werden.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Einstellungen" }))
    const sheet = await body.findByRole("dialog", { name: "Einstellungen" })
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Schließen" })
    )
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

const sides = ["top", "right", "bottom", "left"] as const

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger
            render={<Button variant="outline" className="capitalize" />}
          >
            {side}
          </SheetTrigger>
          <SheetContent
            side={side}
            className="data-[side=bottom]:max-h-[50vh] data-[side=top]:max-h-[50vh]"
          >
            <SheetHeader>
              <SheetTitle>Run log</SheetTitle>
              <SheetDescription>Opened from the {side}.</SheetDescription>
            </SheetHeader>
            <div
              className="overflow-y-auto px-4"
              role="region"
              aria-label="Log"
              tabIndex={0}
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <p key={index} className="mb-4 leading-normal">
                  Step {index + 1}: the agent called a tool, read its output and
                  decided what to do next.
                </p>
              ))}
            </div>
            <SheetFooter>
              <SheetClose render={<Button variant="outline" />}>
                Close
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const side of sides) {
      await userEvent.click(canvas.getByRole("button", { name: side }))
      const sheet = await body.findByRole("dialog", { name: "Run log" })
      await expect(sheet).toHaveAttribute("data-side", side)
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    }
    await userEvent.click(canvas.getByRole("button", { name: "right" }))
    await body.findByRole("dialog", { name: "Run log" })
  },
}
