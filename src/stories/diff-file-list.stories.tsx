import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { DiffFileList, type DiffFileSummary } from "@/components/diff-block"

const files: DiffFileSummary[] = [
  {
    name: "src/transport/client.ts",
    status: "modified",
    added: 18,
    removed: 3,
  },
  // One path in two roots: told apart by `id`.
  {
    id: "workspace:package.json",
    name: "package.json",
    status: "modified",
    added: 1,
    removed: 1,
  },
  {
    id: "sandbox:package.json",
    name: "package.json",
    status: "modified",
    added: 2,
    removed: 0,
  },
  // Changed by a command: no counts.
  { name: "dist/bundle.min.js", status: "added" },
]

const meta = {
  title: "Components/Diff File List",
  component: DiffFileList,
  parameters: { layout: "padded" },
  args: { files, onSelect: fn(), current: "sandbox:package.json" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DiffFileList>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A file's row: its status, path and counts where they are known; one
 * changed by a command has none. Two of one name are told apart by
 * `id`, for the current one and `onSelect`.
 */
export const Default: Story = {
  play: async ({ canvas, args }) => {
    const rows = canvas.getAllByRole("button")
    await expect(rows).toHaveLength(4)
    await expect(rows[3]).toHaveTextContent("dist/bundle.min.js")
    await expect(
      rows[3]!.querySelector("[data-slot=diff-file-stat]")
    ).toBeNull()
    await expect(rows[3]).not.toHaveTextContent("undefined")
    // The sandbox's package.json is the current one, not the workspace's.
    await expect(rows[2]).toHaveAttribute("aria-current", "true")
    await expect(rows[1]).not.toHaveAttribute("aria-current")
    await userEvent.click(rows[1]!)
    await expect(args.onSelect).toHaveBeenCalledWith("workspace:package.json")
  },
}

/** `wrap`: in a narrow panel, a long path wraps, not cut short. */
export const Wrap: Story = {
  args: {
    wrap: true,
    files: [
      {
        name: "packages/transport/src/internal/connection/reconnect-strategy.ts",
        status: "modified",
        added: 4,
        removed: 2,
      },
      ...files,
    ],
  },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getAllByRole("button")
    const row = rows[0]!
    const path = row.children[1]!
    // Whole, on more than one line, inside its row.
    await expect(path.scrollWidth).toBeLessThanOrEqual(path.clientWidth)
    await expect(path.getBoundingClientRect().height).toBeGreaterThan(20)
    await expect(path.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      row.getBoundingClientRect().bottom
    )
    // No row over the next.
    for (let at = 1; at < rows.length; at++)
      await expect(
        rows[at]!.getBoundingClientRect().top
      ).toBeGreaterThanOrEqual(rows[at - 1]!.getBoundingClientRect().bottom)
  },
}

/** Wrapped in a card, too: each row as tall as its path. */
export const WrapCard: Story = {
  ...Wrap,
  args: { ...Wrap.args, variant: "card" },
}
