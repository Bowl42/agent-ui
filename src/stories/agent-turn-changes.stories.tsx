import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { GitBranchIcon } from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { AgentTurn } from "@/components/agent-turn"
import {
  AgentTurnAction,
  AgentTurnFooter,
  AgentTurnInfo,
  AgentTurnMore,
  AgentTurnRetry,
} from "@/components/agent-turn-footer"
import { CopyButton } from "@/components/copy-button"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Message, MessageContent } from "@/components/ui/message"
import {
  AgentTurnChanges,
  AgentTurnChangesProvider,
  AgentTurnChangesTrigger,
  AgentTurnSources,
} from "@/components/agent-turn-changes"
import { foldedLines, insideBorder } from "@/stories/code-fold"
import { asCoarse } from "@/stories/touch"

const meta = {
  title: "Blocks/Agent Turn Changes",
  component: AgentTurnChanges,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-170 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AgentTurnChanges>

export default meta
type Story = StoryObj<typeof meta>

const vite = [
  "--- a/vite.config.ts",
  "+++ b/vite.config.ts",
  "@@ -8,4 +8,6 @@",
  "   build: {",
  "-    rollupOptions: { output: { inlineDynamicImports: true } },",
  "-    cssCodeSplit: false,",
  "+    rollupOptions: {",
  '+      output: { manualChunks: { vendor: ["react", "react-dom"] } },',
  "+    },",
  "+    cssCodeSplit: true,",
  "   },",
].join("\n")

const several = [
  vite,
  "--- a/package.json",
  "+++ b/package.json",
  "@@ -12,3 +12,2 @@",
  '     "react-dom": "^19.2.0",',
  '-    "lodash": "^4.17.21",',
  "   },",
  "--- /dev/null",
  "+++ b/src/lib/debounce.ts",
  "@@ -0,0 +1,2 @@",
  "+export const debounce = () => {}",
  "+export default debounce",
].join("\n")

/** The component owns the answer-to-card spacing for either card shape. */
async function expectRule(canvasElement: HTMLElement) {
  const changes = canvasElement.querySelector<HTMLElement>(
    "[data-slot=agent-turn-changes]"
  )!
  const rule = changes.querySelector<HTMLElement>(
    "[data-slot=agent-turn-changes-rule]"
  )!
  const card = rule.nextElementSibling!
  const answer = changes.previousElementSibling!
  const ink = document.createElement("span")
  ink.style.color = "var(--border)"
  ink.style.borderTop = "1px dotted var(--border)"
  changes.append(ink)
  try {
    await waitFor(async () => {
      const style = getComputedStyle(rule)
      await expect(style.borderTopStyle).toBe("dotted")
      await expect(style.borderTopWidth).toBe(
        getComputedStyle(ink).borderTopWidth
      )
      await expect(style.borderTopColor).toBe(getComputedStyle(ink).color)
      await expect(rule).toHaveAttribute("aria-hidden", "true")
      await expect(
        rule.getBoundingClientRect().top - answer.getBoundingClientRect().bottom
      ).toBe(16)
      await expect(
        card.getBoundingClientRect().top - rule.getBoundingClientRect().bottom
      ).toBe(16)
    })
  } finally {
    ink.remove()
  }
}

/** One file: its diff, each line with its number in the file. */
export const OneFile: Story = {
  args: { diff: vite },
  render: (args) => (
    <>
      <p>The answer text.</p>
      <AgentTurnChanges {...args} />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() =>
      expect(
        canvas.getByRole("group", { name: "vite.config.ts" })
      ).toBeVisible()
    )
    await expectRule(canvasElement)
    const lines = [
      ...canvasElement.querySelectorAll<HTMLElement>(
        "[data-slot=code-block-line]"
      ),
    ].map((line) => line.dataset.number)
    // The context line 8; the removed lines the old file's 9 and 10; the
    // added ones the new file's 9 to 12.
    await expect(lines).toEqual(["8", "9", "10", "9", "10", "11", "12", "13"])
  },
}

const opened = fn()
const all = fn()

/** Several: a card of them; a row opens its file, "View all" all of them. */
export const Several: Story = {
  args: {
    diff: several,
    current: "vite.config.ts",
    onOpen: opened,
    onViewAll: all,
  },
  render: (args) => (
    <>
      <p>The answer text.</p>
      <AgentTurnChanges {...args} />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expectRule(canvasElement)
    const card = canvas.getByRole("region", { name: "3 files changed" })
    await expect(card).toHaveTextContent("+6 −3")
    await userEvent.click(
      within(card).getByRole("button", { name: /package\.json/ })
    )
    await expect(opened).toHaveBeenCalledWith("package.json")
    await userEvent.click(canvas.getByRole("button", { name: "View all" }))
    await expect(all).toHaveBeenCalledOnce()
    // A file's counts, plain and in the faintest grey, both alike.
    const stat = within(card)
      .getByRole("button", { name: /package\.json/ })
      .querySelector<HTMLElement>("[data-slot=diff-file-stat]")!
    await expect(stat.children).toHaveLength(0)
    await expect(getComputedStyle(stat).fontWeight).toBe("400")
    // The directory a step fainter than the name.
    await expect(
      within(card).getByText("src/lib/", { exact: false })
    ).toHaveAttribute("data-slot", "diff-file-dir")
    // Under a finger: the counts at the header's end, beside the action;
    // every name in the text's colour, the directory faint; no status.
    const header = card.querySelector<HTMLElement>(
      "[data-slot=diff-files-card-header]"
    )!
    const row = within(card).getByRole("button", { name: /package\.json/ })
    const touch = asCoarse(card, () => ({
      stat: header
        .querySelector("[data-slot=diff-stat]")!
        .getBoundingClientRect().right,
      action: canvas
        .getByRole("button", { name: "View all" })
        .getBoundingClientRect().left,
      name: getComputedStyle(row).color,
      dir: getComputedStyle(within(card).getByText("src/lib/")).color,
      status: getComputedStyle(
        row.querySelector("[data-slot=diff-file-status]")!
      ).display,
    }))
    await expect(Math.round(touch.action - touch.stat)).toBe(8)
    const ink = document.createElement("span")
    ink.style.color = "var(--foreground)"
    card.append(ink)
    await expect(touch.name).toBe(getComputedStyle(ink).color)
    ink.remove()
    await expect(touch.dir).not.toBe(touch.name)
    await expect(touch.status).toBe("none")
  },
}

/** Old and new numbers side by side. */
export const BothNumbers: Story = {
  args: { diff: vite, numbers: "both" },
  play: async ({ canvasElement }) => {
    const lines = [
      ...canvasElement.querySelectorAll<HTMLElement>(
        "[data-slot=code-block-line]"
      ),
    ].map((line) => line.dataset.number)
    await expect(lines.slice(0, 4)).toEqual([
      " 8  8",
      " 9   ",
      "10   ",
      "    9",
    ])
  },
}

/** The pages an answer drew on: links, as chips. */
export const Sources: Story = {
  args: { diff: "" },
  render: () => (
    <AgentTurnSources
      sources={[
        { href: "https://vitejs.dev/config/build-options" },
        { href: "https://www.rollupjs.org/configuration-options/" },
        { href: "https://example.com/a/very/long/page", title: "Example" },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list", { name: "Sources" })
    const links = within(list).getAllByRole("link")
    await expect(links.map((link) => link.textContent)).toEqual([
      "vitejs.dev",
      "rollupjs.org",
      "Example",
    ])
    await expect(links[0]!.getBoundingClientRect().height).toBe(28)
  },
}

// One file of 22 lines: what an answer's single change often is.
const chunks = [
  "--- a/vite.config.ts",
  "+++ b/vite.config.ts",
  "@@ -6,12 +6,20 @@",
  ' import react from "@vitejs/plugin-react"',
  ' import tailwindcss from "@tailwindcss/vite"',
  " ",
  " export default defineConfig({",
  "   plugins: [react(), tailwindcss()],",
  "   build: {",
  "-    rollupOptions: { output: { inlineDynamicImports: true } },",
  "-    cssCodeSplit: false,",
  "+    rollupOptions: {",
  "+      output: {",
  "+        manualChunks: {",
  '+          vendor: ["react", "react-dom"],',
  '+          charts: ["recharts"],',
  "+        },",
  "+      },",
  "+    },",
  "+    cssCodeSplit: true,",
  "+    sourcemap: true,",
  "   },",
  "   server: { port: 5173 },",
  " })",
  " ",
].join("\n")

/**
 * A single file longer than `lines` folds in its own card: its first
 * lines, fading out, and the card's foot shows the rest, in the app's
 * words; open, its header's button folds it again.
 */
export const OneFileFolded: Story = {
  args: {
    diff: chunks,
    lines: 12,
    labels: {
      more: "Alles anzeigen",
      less: "Einklappen",
      lines: (lines) => `${lines} Zeilen`,
      collapse: "Einklappen",
    },
  },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("group", { name: "vite.config.ts" })
    const bar = await within(card).findByRole("button", {
      name: "Alles anzeigen 22 Zeilen",
    })
    await expect(foldedLines(card)).toMatchObject({ whole: 12, cut: 0 })
    // The control is the card's foot, inside its border, not a row
    // under it.
    await expect(insideBorder(bar, card)).toBe(true)
    await expect(bar.getBoundingClientRect().bottom).toBeCloseTo(
      card.getBoundingClientRect().bottom - 1,
      0
    )
    await userEvent.click(bar)
    await expect(foldedLines(card)).toMatchObject({ whole: 22, cut: 0 })
    await expect(bar).toHaveAccessibleName("Einklappen 22 Zeilen")
    await userEvent.click(
      within(card).getByRole("button", { name: "Einklappen" })
    )
    await expect(bar).toHaveAttribute("aria-expanded", "false")
  },
}

type InFooterProps = {
  diff: string
  lines?: number
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  labels?: React.ComponentProps<typeof AgentTurnChangesTrigger>["labels"]
  visibility?: "always" | "hover"
}

/** A turn, its changes opened from its footer. */
function InFooter({
  diff,
  lines,
  labels,
  visibility,
  ...state
}: InFooterProps) {
  return (
    <Message>
      <MessageContent>
        <AgentTurnChangesProvider diff={diff} {...state}>
          <AgentTurn
            id="turn"
            status="done"
            duration="48s"
            parts={[
              {
                type: "tool",
                id: "read",
                kind: "read",
                path: "vite.config.ts",
                status: "done",
                duration: "1s",
              },
              {
                type: "content",
                id: "answer",
                content: (
                  <>
                    <p>The build now splits vendor code once.</p>
                    <AgentTurnChanges lines={lines} onViewAll={() => {}} />
                  </>
                ),
              },
            ]}
          />
          <AgentTurnFooter {...(visibility && { visibility })}>
            <CopyButton
              value="answer"
              labels={{ copy: "Copy", copied: "Copied" }}
            />
            <AgentTurnRetry onClick={() => {}} />
            <AgentTurnAction label="Branch from here" optional>
              <HugeiconsIcon icon={GitBranchIcon} strokeWidth={2} />
            </AgentTurnAction>
            <AgentTurnMore>
              <DropdownMenuGroup>
                <DropdownMenuItem>Copy as plain text</DropdownMenuItem>
              </DropdownMenuGroup>
            </AgentTurnMore>
            <AgentTurnInfo>
              <AgentTurnChangesTrigger labels={labels} />
              <span>Opus 5.5</span>
              <span>3m 43s</span>
              <time dateTime="2026-11-12T09:55">09:55</time>
            </AgentTurnInfo>
          </AgentTurnFooter>
        </AgentTurnChangesProvider>
      </MessageContent>
    </Message>
  )
}

const changed = fn()

/**
 * In an `AgentTurnChangesProvider`: "3 files changed +6 −3" in the turn's
 * footer's facts, the first, opening the card under the answer, no rule;
 * closed, nothing of the card is rendered.
 */
export const InTheFooter: Story = {
  args: { diff: several },
  render: () => <InFooter diff={several} onOpenChange={changed} />,
  play: async ({ canvas, canvasElement }) => {
    changed.mockClear()
    const trigger = canvas.getByRole("button", { name: /3 files changed/ })
    const region = () =>
      canvas.queryByRole("region", { name: "3 files changed" })
    await expect(trigger).toHaveTextContent("+6 −3")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(trigger).not.toHaveAttribute("aria-controls")
    await expect(region()).not.toBeInTheDocument()
    await expect(
      canvasElement.querySelector("[data-slot=agent-turn-changes-rule]")
    ).toBeNull()
    // The facts' first, in their size and grey, a dot after it; no fill.
    const info = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-turn-info]"
    )!
    await expect(getComputedStyle(trigger).fontSize).toBe(
      getComputedStyle(info).fontSize
    )
    await expect(getComputedStyle(trigger).color).toBe(
      getComputedStyle(info).color
    )
    await expect(info.contains(trigger)).toBe(true)
    await expect(info.textContent).toMatch(/^3 files changed\+6 −3 · Opus 5\.5/)
    await expect(getComputedStyle(trigger).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)"
    )

    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(changed).toHaveBeenCalledWith(true)
    const card = await canvas.findByRole("region", { name: "3 files changed" })
    await expect(
      document
        .getElementById(trigger.getAttribute("aria-controls")!)
        ?.contains(card)
    ).toBe(true)
    // Under the answer, above the footer.
    const answer = canvas.getByText("The build now splits vendor code once.")
    await expect(card.getBoundingClientRect().top).toBeGreaterThan(
      answer.getBoundingClientRect().bottom
    )
    // Once it has opened: as it opens, the card is clipped, not moved.
    await waitFor(() =>
      expect(card.getBoundingClientRect().bottom).toBeLessThan(
        trigger.getBoundingClientRect().top
      )
    )
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(changed).toHaveBeenLastCalledWith(false)
    await waitFor(() => expect(region()).not.toBeInTheDocument())
    trigger.focus()
    await userEvent.keyboard("{Enter}")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{ }")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  },
}

/** One file: "1 file changed" too; its name and diff once open, folded. */
export const InTheFooterOneFile: Story = {
  args: { diff: chunks },
  render: () => <InFooter diff={chunks} lines={12} />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: /^1 file changed/ })
    await expect(trigger).not.toHaveTextContent("vite.config.ts")
    await userEvent.click(trigger)
    const card = await canvas.findByRole("group", { name: "vite.config.ts" })
    await expect(foldedLines(card)).toMatchObject({ whole: 12, cut: 0 })
  },
}

/** Where the app keeps it (`open`), in its words. */
export const InTheFooterControlled: Story = {
  args: { diff: several },
  render: function Render() {
    const [open, setOpen] = React.useState(true)
    return (
      <InFooter
        diff={several}
        open={open}
        onOpenChange={setOpen}
        labels={{ filesChanged: (n) => `${n} Dateien geändert` }}
      />
    )
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: /3 Dateien geändert/ })
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await waitFor(() => expect(canvas.getByRole("region")).toBeVisible())
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(canvas.queryByRole("region")).not.toBeInTheDocument()
    )
  },
}

/**
 * On a phone: the actions, the changes and the time on one line; its
 * words are cut before anything is left out. Under a finger 44px to
 * press, the footer no taller.
 */
export const InTheFooterPhone: Story = {
  args: { diff: several },
  render: () => (
    // A phone's width less its margins, as the footer's phone story.
    <div className="w-[358px]">
      <InFooter
        diff={several}
        labels={{
          filesChanged: (n) =>
            `Changed ${n} files in this turn of the conversation`,
        }}
      />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole("button", { name: /Changed 3 files/ })
    const footer = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-turn-footer-content]"
    )!
    const time = canvas.getByText("09:55")
    await waitFor(() =>
      expect(canvas.queryByText("Opus 5.5")).not.toBeVisible()
    )
    await waitFor(() => expect(time).toBeVisible())
    await expect(trigger.getBoundingClientRect().right).toBeLessThanOrEqual(
      time.getBoundingClientRect().left
    )
    await expect(
      Math.round(time.getBoundingClientRect().right)
    ).toBeLessThanOrEqual(Math.round(footer.getBoundingClientRect().right))
    const title = trigger.querySelector<HTMLElement>(
      "[data-slot=agent-turn-changes-title]"
    )!
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth)
    // The footer no taller for it; under a finger 44px to press.
    await waitFor(() => expect(footer.getBoundingClientRect().height).toBe(40))
    await expect(trigger).toHaveClass(
      "pointer-coarse:after:absolute",
      "pointer-coarse:after:h-11"
    )
  },
}

/**
 * A turn before the last (`visibility="hover"`): its actions show on hover
 * only; its changes are one of its facts, and stay as they do.
 */
export const InTheFooterHover: Story = {
  args: { diff: several },
  render: () => <InFooter diff={several} visibility="hover" />,
  play: async ({ canvas, canvasElement }) => {
    const actions = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-turn-footer-actions]"
    )!
    await expect(getComputedStyle(actions).opacity).toBe("0")
    const trigger = canvas.getByRole("button", { name: /3 files changed/ })
    await waitFor(() => expect(trigger).toBeVisible())
    await expect(getComputedStyle(trigger).opacity).toBe("1")
    // With the facts, after the actions.
    await expect(trigger.getBoundingClientRect().left).toBeGreaterThan(
      actions.getBoundingClientRect().right
    )
    await userEvent.click(trigger)
    await waitFor(async () =>
      expect(
        await canvas.findByRole("region", { name: "3 files changed" })
      ).toBeVisible()
    )
  },
}
