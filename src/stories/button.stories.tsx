import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight02Icon,
  Loading03Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent } from "storybook/test"

import { Button, buttonVariants } from "@/components/ui/button"

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Button", onClick: fn() },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Button" })
    await userEvent.tab()
    await expect(button).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

const variants = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const
const sizes = ["xs", "sm", "default", "lg"] as const

export const VariantsAndSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {sizes.map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-2">
          {variants.map((variant) => (
            <Button key={variant} size={size} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="outline">
        <HugeiconsIcon
          icon={PlusSignIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        New chat
      </Button>
      <Button>
        Continue
        <HugeiconsIcon
          icon={ArrowRight02Icon}
          strokeWidth={2}
          data-icon="inline-end"
        />
      </Button>
    </div>
  ),
}

export const IconOnly: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {(["icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size) => (
        <Button key={size} size={size} variant="outline" aria-label="Add">
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        </Button>
      ))}
    </div>
  ),
}

export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <HugeiconsIcon
          icon={Loading03Icon}
          strokeWidth={2}
          className="animate-spin"
          data-icon="inline-start"
        />
        Saving
      </>
    ),
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button")
    await expect(button).toBeDisabled()
    // A muted button, not the primary half see-through.
    await expect(getComputedStyle(button).opacity).toBe("1")
  },
}

/** A link stays a link; `buttonVariants` gives it the look. */
export const AsLink: Story = {
  render: () => (
    <a href="#docs" className={buttonVariants({ variant: "outline" })}>
      Read the docs
    </a>
  ),
}
