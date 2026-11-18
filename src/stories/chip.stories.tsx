import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { File01Icon, Globe02Icon } from "@hugeicons/core-free-icons"
import { expect } from "storybook/test"

import { Chip, ChipDetail } from "@/components/chip"

const meta = {
  title: "Components/Chip",
  component: Chip,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

const chips = (variant: "muted" | "raised", size?: "md") => (
  <>
    <Chip variant={variant} size={size}>
      <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
      <span className="truncate font-medium">cache.ts</span>
      <ChipDetail>2 KB</ChipDetail>
    </Chip>
    <Chip variant={variant} size={size}>
      <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
      <span className="truncate font-medium">Cache keys</span>
      <ChipDetail>web.dev</ChipDetail>
    </Chip>
  </>
)

/**
 * Muted on a field, as the composer's; raised, the page's colour, on a
 * tint, as in a sent message's bubble; `md` in a row of its own under the
 * text.
 */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-4 text-sm">
      <p className="leading-7">
        Look at {chips("muted")} before you change it.
      </p>
      <p className="rounded-xl bg-muted px-3.5 py-2 leading-7">
        Look at {chips("raised")} before you change it.
      </p>
      <div className="flex gap-1.5">{chips("muted", "md")}</div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const all = canvasElement.querySelectorAll<HTMLElement>("[data-slot=chip]")
    await expect(all).toHaveLength(6)
    await expect(all[0]!.getBoundingClientRect().height).toBe(24)
    await expect(all[4]!.getBoundingClientRect().height).toBe(28)
  },
}
