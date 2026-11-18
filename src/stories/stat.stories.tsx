import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import {
  Fact,
  FactList,
  Stat,
  StatDetail,
  StatGrid,
  StatLabel,
  StatValue,
} from "@/components/stat"

const meta = {
  title: "Components/Stat",
  component: Stat,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Stat>

export default meta
type Story = StoryObj<typeof meta>

const stats = [
  { label: "Spend this month", value: "$412.80", detail: "+12% on October" },
  { label: "Requests", value: "18,204", detail: "Last 30 days" },
  { label: "Errors", value: "0.4%", detail: "Of requests" },
]

/**
 * A page's headline numbers under its title's facts: as many across as
 * fit, at least 192px each, 16px apart; a row of facts, 24px apart.
 */
export const Default: Story = {
  render: () => (
    <div className="flex w-column max-w-full flex-col gap-6">
      <FactList>
        <Fact label="Plan">Pro</Fact>
        <Fact label="Seats">4</Fact>
        <Fact label="Renews">1 Dec</Fact>
      </FactList>
      <StatGrid>
        {stats.map((stat) => (
          <Stat key={stat.label}>
            <StatLabel>{stat.label}</StatLabel>
            <StatValue>{stat.value}</StatValue>
            <StatDetail>{stat.detail}</StatDetail>
          </Stat>
        ))}
      </StatGrid>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const cards = Array.from(canvasElement.querySelectorAll("[data-slot=stat]"))
    const boxes = cards.map((card) => card.getBoundingClientRect())
    // Three across, one row, 16px apart.
    await expect(new Set(boxes.map((box) => box.top)).size).toBe(1)
    await expect(Math.round(boxes[1]!.left - boxes[0]!.right)).toBe(16)
    await expect(getComputedStyle(canvas.getByText("$412.80")).fontSize).toBe(
      "22px"
    )
    // Facts: terms and their values, 24px apart.
    await expect(canvas.getByText("Plan").tagName).toBe("DT")
    await expect(canvas.getByText("Pro").tagName).toBe("DD")
    const facts = Array.from(canvasElement.querySelectorAll("[data-slot=fact]"))
    await expect(
      Math.round(
        facts[1]!.getBoundingClientRect().left -
          facts[0]!.getBoundingClientRect().right
      )
    ).toBe(24)
  },
}

/** On a phone, one under another. */
export const Narrow: Story = {
  render: () => (
    <StatGrid className="w-80">
      {stats.map((stat) => (
        <Stat key={stat.label}>
          <StatLabel>{stat.label}</StatLabel>
          <StatValue>{stat.value}</StatValue>
        </Stat>
      ))}
    </StatGrid>
  ),
  play: async ({ canvasElement }) => {
    const lefts = Array.from(
      canvasElement.querySelectorAll("[data-slot=stat]")
    ).map((card) => card.getBoundingClientRect().left)
    await expect(new Set(lefts).size).toBe(1)
  },
}
