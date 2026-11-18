import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const meta = {
  title: "Components/Input",
  component: Input,
  args: { type: "email", placeholder: "Email", "aria-label": "Email" },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Email" })
    await userEvent.tab()
    await expect(input).toHaveFocus()
    await userEvent.keyboard("dev@agent.local")
    await expect(input).toHaveValue("dev@agent.local")
  },
}

/**
 * `size="sm"`: 28px and 13px, beside a toolbar's 28px buttons; a number
 * is still the native size.
 */
export const Small: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Input {...args} size="sm" />
      <Button variant="outline" size="sm">
        Go
      </Button>
      <Input aria-label="Code" size={6} />
    </div>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Email" })
    const button = canvas.getByRole("button", { name: "Go" })
    await expect(input.getBoundingClientRect().height).toBe(28)
    await expect(button.getBoundingClientRect().height).toBe(28)
    await expect(getComputedStyle(input).fontSize).toBe("13px")
    await expect(canvas.getByRole("textbox", { name: "Code" })).toHaveAttribute(
      "size",
      "6"
    )
  },
}

export const Invalid: Story = {
  args: { type: "text", placeholder: "Error", "aria-label": "Run name" },
  render: (args) => <Input {...args} aria-invalid="true" />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Run name" })
    ).toBeInvalid()
  },
}

export const WithLabel: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="input-email">Email</FieldLabel>
      <Input id="input-email" type="email" placeholder="name@example.com" />
    </Field>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Email"))
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveFocus()
  },
}

export const WithDescription: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="input-username">Username</FieldLabel>
      <Input
        id="input-username"
        type="text"
        placeholder="Enter your username"
      />
      <FieldDescription>
        Choose a unique username for your account.
      </FieldDescription>
    </Field>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="input-disabled">Email</FieldLabel>
      <Input id="input-disabled" type="email" placeholder="Email" disabled />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Email" })).toBeDisabled()
  },
}

export const Types: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-6">
      <Field>
        <FieldLabel htmlFor="input-password">Password</FieldLabel>
        <Input id="input-password" type="password" placeholder="Password" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-url">URL</FieldLabel>
        <Input id="input-url" type="url" placeholder="https://example.com" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-search">Search</FieldLabel>
        <Input id="input-search" type="search" placeholder="Search" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-number">Max tokens</FieldLabel>
        <Input id="input-number" type="number" placeholder="4096" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-date">Date</FieldLabel>
        <Input id="input-date" type="date" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-file">File</FieldLabel>
        <Input id="input-file" type="file" />
      </Field>
    </div>
  ),
}

export const WithSelect: Story = {
  render: () => (
    <div className="flex w-80 gap-2">
      <Input
        type="text"
        placeholder="Enter amount"
        aria-label="Amount"
        className="flex-1"
      />
      <Select defaultValue="usd">
        <SelectTrigger className="w-32" aria-label="Currency">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="usd">USD</SelectItem>
            <SelectItem value="eur">EUR</SelectItem>
            <SelectItem value="gbp">GBP</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const WithButton: Story = {
  render: () => (
    <div className="flex w-80 gap-2">
      <Input
        type="search"
        placeholder="Search chats..."
        aria-label="Search chats"
        className="flex-1"
      />
      <Button>Search</Button>
    </div>
  ),
}

export const WithNativeSelect: Story = {
  render: () => (
    <div className="flex w-80 gap-2">
      <Input
        type="tel"
        placeholder="(555) 123-4567"
        aria-label="Phone number"
        className="flex-1"
      />
      <NativeSelect defaultValue="+1" aria-label="Country code">
        <NativeSelectOption value="+1">+1</NativeSelectOption>
        <NativeSelectOption value="+44">+44</NativeSelectOption>
        <NativeSelectOption value="+49">+49</NativeSelectOption>
      </NativeSelect>
    </div>
  ),
}

export const Form: Story = {
  render: () => (
    <form className="w-80" onSubmit={(event) => event.preventDefault()}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="form-name">Agent name</FieldLabel>
          <Input id="form-name" type="text" placeholder="Researcher" />
        </Field>
        <Field>
          <FieldLabel htmlFor="form-endpoint">Endpoint</FieldLabel>
          <Input
            id="form-endpoint"
            type="url"
            placeholder="https://api.example.com"
          />
          <FieldDescription>Where the agent sends its runs.</FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </Field>
      </FieldGroup>
    </form>
  ),
}
