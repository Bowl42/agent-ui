import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent } from "storybook/test"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"

const meta = {
  title: "Components/Native Select",
  component: NativeSelect,
  args: { "aria-label": "Model", onChange: fn() },
} satisfies Meta<typeof NativeSelect>

export default meta
type Story = StoryObj<typeof meta>

const models = (
  <>
    <NativeSelectOption value="">Select a model</NativeSelectOption>
    <NativeSelectOption value="opus">Claude Opus</NativeSelectOption>
    <NativeSelectOption value="sonnet">Claude Sonnet</NativeSelectOption>
    <NativeSelectOption value="haiku">Claude Haiku</NativeSelectOption>
    <NativeSelectOption value="legacy" disabled>
      Legacy model
    </NativeSelectOption>
  </>
)

export const Default: Story = {
  args: { children: models },
  play: async ({ args, canvas }) => {
    const select = canvas.getByRole("combobox", { name: "Model" })
    await userEvent.selectOptions(select, "Claude Sonnet")
    await expect(select).toHaveValue("sonnet")
    await expect(args.onChange).toHaveBeenCalledOnce()
    await expect(
      canvas.getByRole("option", { name: "Legacy model" })
    ).toBeDisabled()
  },
}

export const WithGroups: Story = {
  args: {
    "aria-label": "Tool",
    children: (
      <>
        <NativeSelectOption value="">Select a tool</NativeSelectOption>
        <NativeSelectOptGroup label="Built in">
          <NativeSelectOption value="shell">Shell</NativeSelectOption>
          <NativeSelectOption value="browser">Web browser</NativeSelectOption>
          <NativeSelectOption value="files">File system</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="MCP servers">
          <NativeSelectOption value="github">GitHub</NativeSelectOption>
          <NativeSelectOption value="linear">Linear</NativeSelectOption>
        </NativeSelectOptGroup>
      </>
    ),
  },
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <NativeSelect {...args} size="sm" aria-label="Small model select">
        {models}
      </NativeSelect>
      <NativeSelect {...args} size="default" aria-label="Default model select">
        {models}
      </NativeSelect>
    </div>
  ),
}

export const WithField: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="native-select-model">Default model</FieldLabel>
      <NativeSelect
        id="native-select-model"
        aria-describedby="native-select-model-description"
      >
        {models}
      </NativeSelect>
      <FieldDescription id="native-select-model-description">
        Used for new chats in this workspace.
      </FieldDescription>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("combobox", { name: "Default model" })
    ).toHaveAccessibleDescription("Used for new chats in this workspace.")
  },
}

export const Disabled: Story = {
  args: { disabled: true, children: models },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Model" })).toBeDisabled()
  },
}

export const Invalid: Story = {
  args: { "aria-invalid": true, children: models },
}
