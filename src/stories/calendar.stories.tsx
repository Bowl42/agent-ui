import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import type { DateRange } from "react-day-picker"
import { expect, userEvent, waitFor } from "storybook/test"

import { Calendar } from "@/components/ui/calendar"

const meta = {
  title: "Components/Calendar",
  component: Calendar,
} satisfies Meta<typeof Calendar>

export default meta
type Story = StoryObj<typeof meta>

// A fixed month, so the stories don't change with today's date.
const month = new Date(2026, 5, 1)

function SingleDate() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 5, 12)
  )
  return (
    <Calendar
      mode="single"
      defaultMonth={month}
      selected={date}
      onSelect={setDate}
      className="rounded-lg border"
    />
  )
}

export const Default: Story = {
  render: () => <SingleDate />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("grid", { name: "June 2026" })).toBeVisible()
    // Tab reaches the selected day; arrow keys move between days.
    const selected = canvas.getByRole("button", {
      name: "Friday, 12 June 2026, selected",
    })
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    await expect(selected).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    const next = canvas.getByRole("button", { name: "Saturday, 13 June 2026" })
    await expect(next).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Saturday, 13 June 2026, selected" })
      ).toBeInTheDocument()
    )

    await userEvent.click(
      canvas.getByRole("button", { name: "Go to the Next Month" })
    )
    await expect(canvas.getByRole("grid", { name: "July 2026" })).toBeVisible()
  },
}

function Range() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(2026, 5, 8),
    to: new Date(2026, 5, 19),
  })
  return (
    <Calendar
      mode="range"
      defaultMonth={month}
      numberOfMonths={2}
      selected={range}
      onSelect={setRange}
      className="rounded-lg border"
    />
  )
}

export const DateRangePicker: Story = {
  name: "Range",
  render: () => <Range />,
}

export const MonthAndYearDropdowns: Story = {
  args: {
    mode: "single",
    defaultMonth: month,
    captionLayout: "dropdown",
    className: "rounded-lg border",
  },
  play: async ({ canvas }) => {
    // Native selects, transparent over the visible month and year.
    await expect(
      canvas.getByRole("combobox", { name: "Choose the Month" })
    ).toHaveDisplayValue("Jun")
    await expect(
      canvas.getByRole("combobox", { name: "Choose the Year" })
    ).toHaveDisplayValue("2026")
  },
}
