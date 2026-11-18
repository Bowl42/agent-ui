import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUp02Icon,
  Attachment01Icon,
  CodeIcon,
  Copy01Icon,
  InformationCircleIcon,
  Search01Icon,
  SparklesIcon,
  Tick02Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent } from "storybook/test"

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"

const onCopy = fn()
const onSend = fn()

const meta = {
  title: "Components/Input Group",
  component: InputGroup,
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <InputGroup>
      <InputGroupInput
        placeholder="Search chats..."
        aria-label="Search chats"
      />
      <InputGroupAddon>
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
    </InputGroup>
  ),
  play: async ({ canvas }) => {
    // Clicking an addon focuses the input.
    await userEvent.click(canvas.getByText("12 results"))
    const input = canvas.getByRole("textbox", { name: "Search chats" })
    await expect(input).toHaveFocus()
    await userEvent.keyboard("deploy")
    await expect(input).toHaveValue("deploy")
  },
}

/** `size="lg"`: a sign-in screen's, 44px, its text 16px, its icon 20px. */
export const Large: Story = {
  render: () => (
    <InputGroup size="lg" className="w-80">
      <InputGroupAddon>
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
      </InputGroupAddon>
      <InputGroupInput aria-label="Email" placeholder="you@example.com" />
    </InputGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    const input = canvas.getByRole("textbox", { name: "Email" })
    const group = canvasElement.querySelector("[data-slot=input-group]")!
    await expect(group.getBoundingClientRect().height).toBe(44)
    await expect(getComputedStyle(input).fontSize).toBe("16px")
    await expect(
      group.querySelector("svg")!.getBoundingClientRect().width
    ).toBe(20)
  },
}

export const States: Story = {
  render: () => (
    <FieldGroup>
      <Field data-disabled="true">
        <FieldLabel htmlFor="input-group-disabled">Disabled</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="input-group-disabled"
            placeholder="This field is disabled"
            disabled
          />
        </InputGroup>
      </Field>
      <Field data-invalid="true">
        <FieldLabel htmlFor="input-group-invalid">Invalid</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="input-group-invalid"
            placeholder="This field is invalid"
            aria-invalid="true"
          />
        </InputGroup>
      </Field>
      <Field data-disabled="true">
        <FieldLabel htmlFor="input-group-loading">Loading</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="input-group-loading"
            defaultValue="researcher"
            disabled
          />
          <InputGroupAddon align="inline-end">
            <Spinner />
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </FieldGroup>
  ),
  play: async ({ canvas }) => {
    // A disabled control dims the whole group.
    const input = canvas.getByRole("textbox", { name: "Disabled" })
    await expect(getComputedStyle(input.parentElement!).opacity).toBe("0.5")
  },
}

export const WithAddons: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="input-group-password">API key</FieldLabel>
        <InputGroup>
          <InputGroupInput id="input-group-password" type="password" />
          <InputGroupAddon align="inline-end">
            <HugeiconsIcon icon={ViewOffSlashIcon} strokeWidth={2} />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-group-url">Website URL</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput id="input-group-url" placeholder="example.com" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>.com</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-group-block-start">
          Addon (block-start)
        </FieldLabel>
        <InputGroup className="h-auto">
          <InputGroupInput id="input-group-block-start" />
          <InputGroupAddon align="block-start">
            <InputGroupText>First name</InputGroupText>
            <HugeiconsIcon
              icon={InformationCircleIcon}
              strokeWidth={2}
              className="ms-auto text-muted-foreground"
            />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-group-username">Username</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="input-group-username"
            defaultValue="researcher"
          />
          <InputGroupAddon align="inline-end">
            <HugeiconsIcon
              icon={Tick02Icon}
              strokeWidth={2}
              className="text-success"
            />
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>This username is available.</FieldDescription>
      </Field>
    </FieldGroup>
  ),
}

export const WithButtons: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="input-group-share">Share link</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="input-group-share"
            readOnly
            defaultValue="https://agent.local/chat/42"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Copy link"
              onClick={onCopy}
            >
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-group-buttons">Branch</FieldLabel>
        <InputGroup>
          <InputGroupInput id="input-group-buttons" placeholder="main" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="secondary">Checkout</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </FieldGroup>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await userEvent.tab()
    await expect(
      canvas.getByRole("button", { name: "Copy link" })
    ).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(onCopy).toHaveBeenCalled()
  },
}

export const WithKbd: Story = {
  render: () => (
    <FieldGroup>
      <InputGroup>
        <InputGroupInput
          placeholder="Search commands..."
          aria-label="Search commands"
        />
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput
          placeholder="Ask the agent..."
          aria-label="Ask the agent"
        />
        <InputGroupAddon>
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </KbdGroup>
        </InputGroupAddon>
      </InputGroup>
    </FieldGroup>
  ),
}

/** A chat composer: the textarea grows; the send button sits in the footer. */
function Composer() {
  const [text, setText] = React.useState("")
  return (
    <Field>
      <FieldLabel htmlFor="input-group-composer">Message</FieldLabel>
      <InputGroup>
        <InputGroupTextarea
          id="input-group-composer"
          placeholder="Ask, search or run a tool..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton size="icon-xs" aria-label="Attach file">
            <HugeiconsIcon icon={Attachment01Icon} strokeWidth={2} />
          </InputGroupButton>
          <InputGroupText className="ms-auto">
            {text.length}/2000
          </InputGroupText>
          <InputGroupButton
            variant="default"
            size="icon-xs"
            className="rounded-full"
            disabled={!text}
            onClick={onSend}
          >
            <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

export const Textarea: Story = {
  render: () => <Composer />,
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole("textbox", { name: "Message" })
    const group = textarea.parentElement!
    const send = canvas.getByRole("button", { name: "Send" })
    // A disabled button in an addon does not make the field look disabled.
    await expect(send).toBeDisabled()
    await expect(getComputedStyle(group).opacity).toBe("1")
    await userEvent.click(textarea)
    await userEvent.keyboard("Summarise run #42")
    await expect(textarea).toHaveValue("Summarise run #42")
    await userEvent.click(send)
    await expect(onSend).toHaveBeenCalled()
  },
}

export const CodeEditor: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="input-group-code">Tool input</FieldLabel>
      <InputGroup>
        <InputGroupTextarea
          id="input-group-code"
          placeholder='{ "query": "open issues" }'
          className="min-h-40 py-3 font-mono"
        />
        <InputGroupAddon align="block-start" className="border-b">
          <InputGroupText className="font-mono font-medium">
            <HugeiconsIcon icon={CodeIcon} strokeWidth={2} />
            input.json
          </InputGroupText>
          <InputGroupButton
            size="icon-xs"
            className="ms-auto"
            aria-label="Copy"
          >
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupAddon align="block-end" className="border-t">
          <InputGroupText>Line 1, Column 1</InputGroupText>
          <InputGroupText className="ms-auto">JSON</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  ),
}
