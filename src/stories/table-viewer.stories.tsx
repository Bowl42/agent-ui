import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { TableViewer, parseCsv } from "@/components/table-viewer"
import { Panel, PanelMenu } from "@/stories/panel"
import { resolved } from "@/stories/paint"

const csv = `plan,region,price,seats
Starter,eu,9,"1,204"
Starter,us,9,"3,881"
Team,eu,29,612
Team,us,29,"1,940"
Scale,eu,99,88
Scale,us,99,241
Starter,apac,9,702
Team,apac,29,133
Scale,apac,99,12
Enterprise,us,,9
`
const [columns, ...rows] = parseCsv(csv)

// Many rows: only those in view are drawn.
const many = Array.from({ length: 5000 }, (_, index) => [
  `row ${index + 1}`,
  String((index * 37) % 1000),
])

const meta = {
  title: "Components/Table Viewer",
  component: TableViewer,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Panel>
        <Story />
      </Panel>
    ),
  ],
  args: {
    name: "plans.csv",
    path: [{ label: "data" }],
    columns: columns!,
    rows,
    totalRows: 1284,
    onBack: fn(),
    onAddToChat: fn(),
    details: ["CSV"],
    menu: <PanelMenu />,
  },
} satisfies Meta<typeof TableViewer>

export default meta
type Story = StoryObj<typeof meta>

const cell = (grid: HTMLElement, row: number, column: number) =>
  within(grid).getAllByRole("row")[row]!.querySelectorAll("td")[column]!

/**
 * A CSV file: each column's type under its name, numbers to the end. A
 * cell picked by a click or the arrow keys; the status bar says which,
 * and its column's sum; "@" gives it to the app.
 */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    const grid = canvas.getByRole("grid", { name: "plans.csv" })
    await expect(canvas.getByText("1,284 rows · 4 columns · CSV")).toBeVisible()
    const seats = canvas.getByRole("columnheader", { name: "seats num" })
    await expect(getComputedStyle(seats).textAlign).toBe("end")
    // Its names in the second grey, quieter than the cells.
    await expect(getComputedStyle(seats).color).toBe(
      resolved(seats, "var(--muted-foreground)")
    )
    await expect(
      canvas.getByRole("columnheader", { name: "plan text" })
    ).toBeVisible()
    // An empty number is a dash.
    await expect(cell(grid, 10, 3)).toHaveTextContent("—")
    await userEvent.click(cell(grid, 4, 4))
    await expect(cell(grid, 4, 4)).toHaveAttribute("aria-selected", "true")
    await expect(canvas.getByText("Row 4 · seats")).toBeVisible()
    await expect(canvas.getByText("Sum 8,822")).toBeVisible()
    await expect(grid).toHaveAttribute(
      "aria-activedescendant",
      cell(grid, 4, 4).id
    )
    grid.focus()
    await userEvent.keyboard("{ArrowLeft}{ArrowDown}")
    await waitFor(() => expect(canvas.getByText("Row 5 · price")).toBeVisible())
    await userEvent.keyboard("{ArrowUp}{ArrowRight}")
    await userEvent.click(canvas.getByRole("button", { name: "Add to chat" }))
    await expect(args.onAddToChat).toHaveBeenCalledWith({
      row: 3,
      column: 3,
      value: "1,940",
      name: "seats",
    })
  },
}

/** Sorted by the picked cell's column, then the other way, then not. */
export const Sort: Story = {
  play: async ({ canvas }) => {
    const grid = canvas.getByRole("grid", { name: "plans.csv" })
    await userEvent.click(cell(grid, 1, 4))
    await userEvent.click(
      canvas.getByRole("button", { name: "Sort by seats, ascending" })
    )
    await expect(cell(grid, 1, 4)).toHaveTextContent("9")
    await expect(
      canvas.getByRole("columnheader", { name: "seats num" })
    ).toHaveAttribute("aria-sort", "ascending")
    await userEvent.click(
      canvas.getByRole("button", { name: "Sort by seats, descending" })
    )
    await expect(cell(grid, 1, 4)).toHaveTextContent("3,881")
  },
}

/** The filter keeps the rows with the text. */
export const Filter: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter rows" }))
    const input = await canvas.findByRole("textbox", { name: "Filter rows" })
    await userEvent.type(input, "apac")
    const grid = canvas.getByRole("grid", { name: "plans.csv" })
    await waitFor(() =>
      expect(within(grid).getAllByRole("row")).toHaveLength(4)
    )
  },
}

/** Thousands of rows: only those in view are drawn; the keys go on. */
export const Long: Story = {
  args: {
    name: "events.csv",
    columns: ["name", "count"],
    rows: many,
    totalRows: undefined,
  },
  play: async ({ canvas }) => {
    const grid = canvas.getByRole("grid", { name: "events.csv" })
    await expect(canvas.getByText("5,000 rows · 2 columns · CSV")).toBeVisible()
    await expect(within(grid).getAllByRole("row").length).toBeLessThan(80)
    await userEvent.click(cell(grid, 1, 1))
    grid.focus()
    await userEvent.keyboard("{Shift>}{End}{/Shift}")
    await waitFor(() =>
      expect(canvas.getByText("Row 5000 · count")).toBeVisible()
    )
    await waitFor(() =>
      expect(canvas.getByRole("gridcell", { name: "row 5000" })).toBeVisible()
    )
  },
}
