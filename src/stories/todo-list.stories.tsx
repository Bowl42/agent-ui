import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { TodoList } from "@/components/todo-list"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const meta = {
  title: "Components/Todo List",
  component: TodoList,
  decorators: [
    (Story) => (
      <div className="w-165 max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    items: [
      { id: "1", title: "Split vendor code into one chunk", status: "done" },
      { id: "2", title: "Replace lodash helpers", status: "done" },
      { id: "3", title: "Update the pricing snapshot", status: "running" },
      { id: "4", title: "Run the checks", status: "pending" },
      { id: "5", title: "Open a PR", status: "pending" },
    ],
  },
} satisfies Meta<typeof TodoList>

export default meta
type Story = StoryObj<typeof meta>

/**
 * An agent's plan: how many are done, the item in progress in bold with
 * a spinner, those done struck through.
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    const plan = canvas.getByRole("region", { name: "Plan" })
    await expect(
      within(plan).getByRole("progressbar", { name: "2 of 5" })
    ).toHaveAttribute("aria-valuenow", "40")
    const items = within(plan).getAllByRole("listitem")
    await expect(items).toHaveLength(5)
    await expect(items[0]).toHaveTextContent(
      "Done: Split vendor code into one chunk"
    )
    await expect(items[2]).toHaveTextContent(
      "In progress: Update the pricing snapshot"
    )
    await expect(getComputedStyle(items[2]!).fontWeight).toBe("500")
  },
}

/** Its words, for other languages. */
export const Labels: Story = {
  args: {
    title: "Aufgaben",
    labels: {
      done: (done, items) => `${done} von ${items} erledigt`,
      status: { pending: "Offen", running: "In Arbeit", done: "Erledigt" },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("region", { name: "Aufgaben" })).toBeVisible()
    await expect(canvas.getByText("2 von 5 erledigt")).toBeVisible()
  },
}

/**
 * In a popover, e.g. the plan behind a button in the composer: the
 * popover's surface its edge, no border of its own, to its edges.
 */
export const InPopover: Story = {
  render: (args) => (
    <Popover defaultOpen>
      <PopoverTrigger>Plan</PopoverTrigger>
      <PopoverContent className="w-80" aria-label="Plan">
        <TodoList {...args} />
      </PopoverContent>
    </Popover>
  ),
  play: async () => {
    const plan = await within(document.body).findByRole("region", {
      name: "Plan",
    })
    const popover = plan.closest<HTMLElement>("[data-slot=popover-content]")!
    await expect(getComputedStyle(plan).borderTopWidth).toBe("0px")
    const box = plan.getBoundingClientRect()
    const edge = popover.getBoundingClientRect()
    await expect(Math.round(box.left)).toBe(Math.round(edge.left))
    await expect(Math.round(box.right)).toBe(Math.round(edge.right))
    await expect(Math.round(box.top)).toBe(Math.round(edge.top))
  },
}
