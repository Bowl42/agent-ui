import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { ToolCallData, mcpToolName } from "@/components/tool-call-data"

const input = JSON.stringify({
  message:
    "There is a small uncommitted change in the agentry workspace: the settings page's breadcrumb.\nCheck the diff and tell me whether it is safe to push.",
  timeout: 120,
  wait: true,
  context: { cwd: "/home/sam/code/agentry", files: ["src/settings.tsx"] },
})

const output = JSON.stringify({
  reply:
    "I will check the diff. It only touches the breadcrumb's link and its story; the tests pass. It can be pushed.",
  agent: "codex",
  cwd: "/home/sam/code/agentry",
  usage: '{"input":1204,"output":88}',
  note: "",
  error: null,
})

const meta = {
  title: "Components/Tool Call Data",
  component: ToolCallData,
  parameters: { layout: "padded" },
  args: { value: input, title: "Input" },
  decorators: [
    (Story) => (
      <div className="w-lg max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ToolCallData>

export default meta
type Story = StoryObj<typeof meta>

const field = (root: HTMLElement, key: string) => {
  const term = within(root).getByText(key, { selector: "dt" })
  return term.nextElementSibling as HTMLElement
}

/**
 * A JSON object as its fields: text wrapped with its lines kept, not one
 * long line of JSON; a number and true as code; an object a JSON block.
 * The toggle shows the JSON as it came, formatted; copy is there.
 */
export const Input: Story = {
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-slot=tool-call-data]"
    )!
    await expect(root).toHaveAttribute("data-view", "fields")
    const message = field(root, "message")
    await expect(message).toHaveTextContent(/uncommitted change/)
    // Wrapped, not scrolled sideways; its two lines kept.
    await expect(message.scrollWidth).toBeLessThanOrEqual(
      message.clientWidth + 1
    )
    await expect(
      getComputedStyle(message.querySelector("[data-slot=clamp-content]")!)
        .whiteSpace
    ).toBe("pre-wrap")
    await expect(message.getBoundingClientRect().height).toBeGreaterThan(40)
    await expect(field(root, "timeout")).toHaveTextContent("120")
    await expect(field(root, "wait")).toHaveTextContent("true")
    const context = field(root, "context")
    await expect(
      context.querySelector("[data-slot=tool-call-data-json]")
    ).not.toBeNull()
    await expect(context).toHaveTextContent(/"files":/)

    const canvas = within(root)
    await expect(canvas.getByRole("button", { name: "Copy" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Raw JSON" }))
    await expect(root).toHaveAttribute("data-view", "raw")
    await expect(root.querySelector("dl")).toBeNull()
    await expect(
      root.querySelectorAll("[data-slot=code-block-line]").length
    ).toBeGreaterThan(5)
    await expect(root).toHaveTextContent(/"timeout": 120/)
    await userEvent.click(canvas.getByRole("button", { name: "Raw JSON" }))
    await expect(root).toHaveAttribute("data-view", "fields")
  },
}

/**
 * Output that is a JSON object the same: a field that is JSON as text is
 * read as JSON; an empty string and null say so.
 */
export const Output: Story = {
  args: { value: output, title: "Output", language: "ansi" },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-slot=tool-call-data]"
    )!
    await expect(root).toHaveAttribute("data-view", "fields")
    await expect(field(root, "agent")).toHaveTextContent("codex")
    const usage = field(root, "usage")
    await expect(
      usage.querySelector("[data-slot=tool-call-data-json]")
    ).not.toBeNull()
    await expect(usage).toHaveTextContent(/"input": 1204/)
    await expect(field(root, "note")).toHaveTextContent("Empty")
    await expect(field(root, "error")).toHaveTextContent("null")
  },
}

/** A value, not text, is read the same. */
export const Value: Story = {
  args: { value: { path: "src/app.tsx", line: 12 } },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-slot=tool-call-data]"
    )!
    await expect(field(root, "path")).toHaveTextContent("src/app.tsx")
    await expect(field(root, "line")).toHaveTextContent("12")
  },
}

const log = Array.from(
  { length: 20 },
  (_, index) =>
    `\u001b[32m✓\u001b[0m test ${index + 1} passed \u001b[2m(${index * 3}ms)\u001b[0m`
).join("\n")

/**
 * Text, not a JSON object: as text, coloured (a terminal's colours),
 * folding past 12 lines; no toggle.
 */
export const Text: Story = {
  args: { value: log, title: "Output", language: "ansi" },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-slot=tool-call-data]"
    )!
    await expect(root).toHaveAttribute("data-view", "text")
    await expect(
      within(root).queryByRole("button", { name: "Raw JSON" })
    ).toBeNull()
    await waitFor(() => expect(root).toHaveTextContent(/test 1 passed/))
    await expect(root).not.toHaveTextContent("\u001b")
    await expect(
      await within(root).findByRole("button", { name: /Show all/ })
    ).toBeVisible()
  },
}

/** A long value: its first 6 lines, "Show all" for the rest. */
export const LongValue: Story = {
  args: {
    value: {
      prompt: Array.from(
        { length: 30 },
        (_, index) => `Line ${index + 1} of the prompt.`
      ).join("\n"),
    },
  },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-slot=tool-call-data]"
    )!
    const prompt = field(root, "prompt")
    const more = await within(prompt).findByRole("button", {
      name: /Show all/,
    })
    const closed = prompt.getBoundingClientRect().height
    await userEvent.click(more)
    await waitFor(() =>
      expect(prompt.getBoundingClientRect().height).toBeGreaterThan(closed * 3)
    )
  },
}

/** An empty object or an array: the JSON, formatted, no fields. */
export const Array_: Story = {
  name: "Array",
  args: { value: '[{"id":1},{"id":2}]' },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-slot=tool-call-data]"
    )!
    await expect(root).toHaveAttribute("data-view", "raw")
    await expect(root).toHaveTextContent(/"id": 1/)
  },
}

/** mcpToolName: an MCP tool's server and tool; other names, nothing. */
export const McpToolName: Story = {
  play: async () => {
    await expect(mcpToolName("mcp__github__create_issue")).toEqual({
      server: "github",
      tool: "create_issue",
    })
    await expect(mcpToolName("mcp__my_server__send__now")).toEqual({
      server: "my_server",
      tool: "send__now",
    })
    await expect(mcpToolName("Bash")).toBeUndefined()
    await expect(mcpToolName("mcp__github")).toBeUndefined()
  },
}
