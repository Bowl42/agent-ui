import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"

const meta = {
  title: "Components/Spinner",
  component: Spinner,
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status", { name: "Loading" })).toBeVisible()
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Spinner />
      <Spinner className="size-6" />
      <Spinner className="size-8" aria-label="Loading chats" />
    </div>
  ),
}

export const InButtons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button>
        <Spinner data-icon="inline-start" /> Submit
      </Button>
      <Button disabled>
        <Spinner data-icon="inline-start" /> Disabled
      </Button>
      <Button variant="outline" disabled>
        <Spinner data-icon="inline-start" /> Outline
      </Button>
      <Button variant="outline" size="icon" disabled aria-label="Saving">
        <Spinner />
      </Button>
    </div>
  ),
}

export const InBadges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      {(["default", "secondary", "destructive", "outline"] as const).map(
        (variant) => (
          <Badge key={variant} variant={variant}>
            <Spinner data-icon="inline-start" />
            Running
          </Badge>
        )
      )}
    </div>
  ),
}

export const InInputGroup: Story = {
  render: () => (
    <Field className="w-xs">
      <FieldLabel htmlFor="spinner-search">Search tools</FieldLabel>
      <InputGroup>
        <InputGroupInput id="spinner-search" />
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      </InputGroup>
    </Field>
  ),
}

export const InEmpty: Story = {
  render: () => (
    <Empty className="w-md border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>Processing your request</EmptyTitle>
        <EmptyDescription>
          Please wait while the agent finishes. Do not refresh the page.
        </EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" size="sm">
        Cancel
      </Button>
    </Empty>
  ),
}
