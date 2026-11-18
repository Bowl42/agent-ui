import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import {
  TerminalViewer,
  type TerminalSession,
} from "@/components/terminal-viewer"
import { Panel, PanelMenu } from "@/stories/panel"
import { resolved } from "@/stories/paint"

const dim = (text: string) => `\x1b[2m${text}\x1b[0m`
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`

const dev = [
  `${dim("~/agent-ui ❯")} ${bold("pnpm dev")}`,
  "",
  dim("> agent-ui@0.1.9 dev"),
  dim("> vite"),
  "",
  `  ${bold("VITE v7.2.1")}  ${dim("ready in")} 412 ms`,
  "",
  `  ➜  ${bold("Local:")}   http://localhost:5173/`,
  `  ➜  ${dim("Network: use --host to expose")}`,
  "",
  `${dim("12:04:11")} [vite] hmr update /src/pages/pricing.tsx`,
  `${dim("12:04:38")} [vite] hmr update /src/lib/debounce.ts`,
  `${dim("12:06:02")} ${bold("[vite] error")} Cannot find module './plans'`,
  "                 src/pages/pricing.tsx:3:22",
  `${dim("12:06:09")} [vite] hmr update /src/pages/pricing.tsx`,
  "",
].join("\n")

const sessions: TerminalSession[] = [
  {
    id: "dev",
    title: "pnpm dev",
    output: dev,
    running: true,
    status: "Running · 12m",
  },
  {
    id: "zsh",
    title: "zsh",
    output: `${dim("~/agent-ui ❯")} `,
    status: "Exited 0",
  },
  {
    id: "test",
    title: "pnpm test",
    output: "Test Files  48 passed (48)\n     Tests  412 passed (412)\n",
    status: "Exited 0 · 38s",
  },
]

const meta = {
  title: "Components/Terminal Viewer",
  component: TerminalViewer,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Panel>
        <Story />
      </Panel>
    ),
  ],
  args: {
    sessions,
    onNew: fn(),
    onStop: fn(),
    onClear: fn(),
    onSendToChat: fn(),
    menu: <PanelMenu />,
  },
} satisfies Meta<typeof TerminalViewer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A tab per process, a live dot on those running; its output with its
 * colours; Stop (while it runs), Clear and "Send output to chat" below,
 * with what the app says of it.
 */
export const Default: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    const tabs = canvas.getByRole("tablist", { name: "Terminals" })
    const dev = canvas.getByRole("tab", { name: /^pnpm dev.*Running$/ })
    await expect(dev).toHaveAttribute("aria-selected", "true")
    await expect(tabs).toBeVisible()
    await expect(await canvas.findByText(/Cannot find module/)).toBeVisible()
    // Its output in the second grey, as a terminal's plain text.
    const output = canvasElement.querySelector(
      "[data-slot=terminal-viewer-output]"
    )!
    await expect(getComputedStyle(output).color).toBe(
      resolved(output, "var(--muted-foreground)")
    )
    await expect(canvas.getByText("Running · 12m")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Stop" }))
    await expect(args.onStop).toHaveBeenCalledWith(sessions[0])
    await userEvent.click(
      canvas.getByRole("button", { name: "Send output to chat" })
    )
    await expect(args.onSendToChat).toHaveBeenCalledWith(sessions[0])
    await userEvent.click(
      canvas.getByRole("tab", { name: /^pnpm test.*Exited$/ })
    )
    await expect(await canvas.findByText(/412 passed/)).toBeVisible()
    await expect(canvas.getByText("Exited 0 · 38s")).toBeVisible()
    // Not running: nothing to stop.
    await expect(canvas.getByRole("button", { name: "Stop" })).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: "New terminal" }))
    await expect(args.onNew).toHaveBeenCalled()
    await userEvent.click(dev)
  },
}

const names = ["black", "red", "green", "yellow", "blue", "magenta", "cyan"]
const palette = [
  ...names.flatMap((name, index) => [
    `\x1b[${30 + index}m${name}\x1b[0m  \x1b[2;${30 + index}mdim ${name}\x1b[0m  \x1b[1;${30 + index}mbold ${name}\x1b[0m`,
    `\x1b[${90 + index}mbright ${name}\x1b[0m  \x1b[2;${90 + index}mdim bright ${name}\x1b[0m`,
  ]),
  `\x1b[37mwhite\x1b[0m  \x1b[2;37mdim white\x1b[0m  \x1b[97mbright white\x1b[0m  \x1b[2;97mdim bright white\x1b[0m`,
  `plain  ${dim("dim")}  ${bold("bold")}  \x1b[3mitalic\x1b[0m  \x1b[4munderline\x1b[0m  \x1b[9mstruck\x1b[0m`,
].join("\n")

/**
 * Every ANSI colour, bright and dimmed: each one reads at 4.5:1 or more
 * on the page in either theme (Shiki's dim, half opacity, did not).
 */
export const Colors: Story = {
  args: {
    sessions: [{ id: "colors", title: "colors", output: palette }],
  },
  play: async ({ canvas }) => {
    const dimmed = await canvas.findByText("dim red")
    await expect(dimmed.style.getPropertyValue("--shiki-light")).not.toMatch(
      /^#[0-9a-f]{6}80$/i
    )
    await expect(canvas.getByText("bold")).toHaveClass("font-semibold")
    await expect(canvas.getByText("italic")).toHaveClass("italic")
  },
}

/** Output still coming: followed at its end, until the reader scrolls up. */
export const Live: Story = {
  render: (args) => {
    const [lines, setLines] = React.useState(80)
    React.useEffect(() => {
      const timer = setInterval(() => setLines((lines) => lines + 1), 50)
      return () => clearInterval(timer)
    }, [])
    const output = Array.from(
      { length: lines },
      (_, index) => `line ${index + 1}`
    ).join("\n")
    return (
      <TerminalViewer
        {...args}
        sessions={[{ id: "log", title: "tail -f", output, running: true }]}
      />
    )
  },
  play: async ({ canvas }) => {
    const output = await canvas.findByRole("tabpanel")
    const pre = output.querySelector("pre")!
    await waitFor(() =>
      expect(pre.scrollHeight - pre.scrollTop - pre.clientHeight).toBeLessThan(
        30
      )
    )
    await expect(
      canvas.queryByRole("button", { name: "Jump to end" })
    ).toBeNull()
  },
}
