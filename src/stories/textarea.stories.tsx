import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  args: { placeholder: "Type your message here.", "aria-label": "Message" },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole("textbox", { name: "Message" })
    await userEvent.tab()
    await expect(textarea).toHaveFocus()
    await userEvent.keyboard(
      "Summarise the last run{Shift>}{Enter}{/Shift}Thanks"
    )
    await expect(textarea).toHaveValue("Summarise the last run\nThanks")
  },
}

export const Invalid: Story = {
  render: (args) => <Textarea {...args} aria-invalid="true" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Message" })).toBeInvalid()
  },
}

export const WithLabel: Story = {
  render: () => (
    <Field className="w-80">
      <FieldLabel htmlFor="textarea-message">Message</FieldLabel>
      <Textarea
        id="textarea-message"
        placeholder="Type your message here."
        rows={6}
      />
    </Field>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <Field className="w-80">
      <FieldLabel htmlFor="textarea-prompt">System prompt</FieldLabel>
      <Textarea
        id="textarea-prompt"
        placeholder="You are a helpful agent."
        rows={6}
      />
      <FieldDescription>
        Sent to the model before every message in this chat.
      </FieldDescription>
    </Field>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Field className="w-80">
      <FieldLabel htmlFor="textarea-disabled">Message</FieldLabel>
      <Textarea
        id="textarea-disabled"
        placeholder="Type your message here."
        disabled
      />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Message" })
    ).toBeDisabled()
  },
}
