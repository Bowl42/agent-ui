import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { Checkbox } from "@/components/ui/checkbox"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const meta = {
  title: "Components/Label",
  component: Label,
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const WithCheckbox: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="label-terms" />
      <Label htmlFor="label-terms">Accept terms and conditions</Label>
    </Field>
  ),
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox", {
      name: "Accept terms and conditions",
    })
    await userEvent.click(canvas.getByText("Accept terms and conditions"))
    await expect(checkbox).toBeChecked()
  },
}

export const WithInput: Story = {
  render: () => (
    <Field className="w-72">
      <Label htmlFor="label-username">Username</Label>
      <Input id="label-username" placeholder="Username" />
    </Field>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Username"))
    await expect(
      canvas.getByRole("textbox", { name: "Username" })
    ).toHaveFocus()
  },
}

export const Disabled: Story = {
  render: () => (
    <Field data-disabled={true} className="w-72">
      <Label htmlFor="label-disabled">Disabled</Label>
      <Input id="label-disabled" placeholder="Disabled" disabled />
    </Field>
  ),
}

export const WithTextarea: Story = {
  render: () => (
    <Field className="w-72">
      <Label htmlFor="label-message">Message</Label>
      <Textarea id="label-message" placeholder="Message" />
    </Field>
  ),
}
