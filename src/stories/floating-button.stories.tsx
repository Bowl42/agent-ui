import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown02Icon } from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import { FloatingButton } from "@/components/floating-button"

const meta = {
  title: "Components/Floating Button",
  component: FloatingButton,
  parameters: { layout: "padded" },
  args: { onClick: fn() },
  render: (args) => (
    <div className="relative h-48 w-96 max-w-full overflow-hidden rounded-xl border p-4 text-sm text-muted-foreground">
      <p>
        The cache is keyed on each image&apos;s path, so an image whose content
        changes keeps the stale entry until it expires. Keying it on the
        content&apos;s hash fixes it.
      </p>
      <FloatingButton
        {...args}
        className="absolute bottom-3 left-1/2 -translate-x-1/2"
      >
        <HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={2} />
        Jump to end
      </FloatingButton>
    </div>
  ),
} satisfies Meta<typeof FloatingButton>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Round and raised over the text it covers, on the page's colour: the
 * look of every button that floats, e.g. a terminal's jump to its end.
 */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Jump to end" })
    await expect(button).toHaveAttribute("data-slot", "floating-button")
    await expect(getComputedStyle(button).boxShadow).not.toBe("none")
    await userEvent.click(button)
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

/**
 * `visible`: rendered all along, it fades and shrinks out of reach, and
 * back, as the app says.
 */
export const Visible: Story = {
  args: { visible: false },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<HTMLElement>(
      "[data-slot=floating-button]"
    )!
    await waitFor(() => expect(getComputedStyle(button).opacity).toBe("0"))
    await expect(button).toHaveAttribute("inert")
    await expect(getComputedStyle(button).pointerEvents).toBe("none")
  },
}
