import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight02Icon,
  ArrowUpRight01Icon,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons"
import { expect, userEvent } from "storybook/test"

import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Badge" },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

const variants = [
  "default",
  "secondary",
  "destructive",
  "success",
  "warning",
  "info",
  "outline",
  "ghost",
  "link",
] as const

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
}

/**
 * The theme's status colours by name, as destructive's: a key that works,
 * one being checked, a log line's level.
 */
export const StatusColours: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success">Valid</Badge>
      <Badge variant="warning">Checking</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="destructive">Failed</Badge>
      <span data-testid="ink" className="text-success" />
    </div>
  ),
  play: async ({ canvas }) => {
    // Its words in the state's colour, on a tenth of it.
    await expect(getComputedStyle(canvas.getByText("Valid")).color).toBe(
      getComputedStyle(canvas.getByTestId("ink")).color
    )
    await expect(
      getComputedStyle(canvas.getByText("Checking")).backgroundColor
    ).not.toBe("rgba(0, 0, 0, 0)")
  },
}

export const IconStart: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          <HugeiconsIcon
            icon={CheckmarkBadge01Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          {variant}
        </Badge>
      ))}
    </div>
  ),
}

export const IconEnd: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
          <HugeiconsIcon
            icon={ArrowRight02Icon}
            strokeWidth={2}
            data-icon="inline-end"
          />
        </Badge>
      ))}
    </div>
  ),
}

export const WithSpinner: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          <Spinner data-icon="inline-start" />
          {variant}
        </Badge>
      ))}
    </div>
  ),
}

/** `render` swaps the element; a link badge stays a link. */
export const AsLink: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(["default", "secondary", "destructive", "ghost"] as const).map(
        (variant) => (
          <Badge
            key={variant}
            variant={variant}
            render={
              <a href={`#${variant}`}>
                Open {variant}
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  strokeWidth={2}
                  data-icon="inline-end"
                />
              </a>
            }
          />
        )
      )}
    </div>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Open default" })
    await userEvent.tab()
    await expect(link).toHaveFocus()
  },
}

export const LongText: Story = {
  args: {
    variant: "secondary",
    children: "A badge with a lot of text to see how it wraps",
  },
}
