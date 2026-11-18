import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor } from "storybook/test"

import { StatusMark, type StatusTone } from "@/components/status-mark"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

const meta = {
  title: "Components/Status Mark",
  component: StatusMark,
  args: { label: "Connected", tone: "success" },
} satisfies Meta<typeof StatusMark>

export default meta
type Story = StoryObj<typeof meta>

const shape = (mark: Element) => mark.querySelector("[aria-hidden=true]")!
/** Its colour, a fill's or a ring's. */
const dot = (mark: Element) => {
  const style = getComputedStyle(shape(mark))
  return style.borderTopWidth === "0px"
    ? style.backgroundColor
    : style.borderTopColor
}

/**
 * A property's value where the reader asks for less motion, read from the
 * page's style sheets, as the browser under test does not ask.
 */
function underReducedMotion(element: Element, property: string) {
  let value: string | undefined
  const visit = (rules: CSSRuleList, reduce: boolean, parent: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule)
        visit(
          rule.cssRules,
          reduce || rule.conditionText.includes("prefers-reduced-motion"),
          parent
        )
      else if (rule instanceof CSSStyleRule) {
        const selector = parent
          ? rule.selectorText.replaceAll("&", parent)
          : rule.selectorText
        const set = rule.style.getPropertyValue(property)
        if (reduce && set) {
          try {
            if (element.matches(selector)) value = set
          } catch {
            // A selector this browser does not take.
          }
        }
        visit(rule.cssRules, reduce, selector)
      } else if ("cssRules" in rule)
        visit((rule as CSSGroupingRule).cssRules, reduce, parent)
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules, false, "")
    } catch {
      // Another origin's.
    }
  }
  return value
}

/** A dot in its tone's colour, named for screen readers. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const mark = canvas.getByText("Connected").parentElement!
    await expect(mark).toHaveAttribute("data-slot", "status-mark")
    await expect(mark).toHaveAttribute("data-tone", "success")
    const box = mark.getBoundingClientRect()
    await expect(Math.round(box.width)).toBe(16)
    await expect(Math.round(box.height)).toBe(16)
  },
}

const tones: { tone: StatusTone; label: string }[] = [
  { tone: "neutral", label: "Idle" },
  { tone: "info", label: "Updated" },
  { tone: "success", label: "Connected" },
  { tone: "warning", label: "Needs you" },
  { tone: "destructive", label: "Failed" },
]

/**
 * Each tone its own colour; a warning a ring and a danger a diamond, so
 * they are told apart from the dots, and each other, by shape too.
 */
export const Tones: Story = {
  render: () => (
    <div className="flex gap-2">
      {tones.map(({ tone, label }) => (
        <StatusMark key={tone} tone={tone} label={label} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const marks = [...canvasElement.querySelectorAll("[data-slot=status-mark]")]
    await expect(marks).toHaveLength(5)
    await expect(new Set(marks.map(dot)).size).toBe(5)
    const look = (mark: Element) => {
      const style = getComputedStyle(shape(mark))
      if (style.rotate !== "none") return "diamond"
      return style.backgroundColor === "rgba(0, 0, 0, 0)" ? "ring" : "dot"
    }
    await expect(marks.map(look)).toEqual([
      "dot",
      "dot",
      "dot",
      "ring",
      "diamond",
    ])
  },
}

/**
 * `grey`, where the page has no colour (a sidebar): the same shapes in
 * the text's greys, a warning and a danger in the strongest.
 */
export const Grey: Story = {
  render: () => (
    <div className="flex gap-2">
      {tones.map(({ tone, label }) => (
        <StatusMark key={tone} tone={tone} label={label} grey />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const marks = [...canvasElement.querySelectorAll("[data-slot=status-mark]")]
    // No hue: no chroma, or red, green and blue alike.
    for (const mark of marks) {
      const color = dot(mark)
      const [a, b, c] = color.match(/[\d.]+/g)!.map(Number)
      if (color.startsWith("oklch")) await expect(b).toBe(0)
      else await expect(new Set([a, b, c]).size).toBe(1)
    }
    // A warning and a danger alike, stronger than the others.
    await expect(dot(marks[3]!)).toBe(dot(marks[4]!))
    await expect(dot(marks[3]!)).not.toBe(dot(marks[0]!))
  },
}

/**
 * Its label in a tooltip, as the pointer rests on it, or as the keyboard
 * is on the row it ends.
 */
export const Tooltip: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusMark tone="warning" label="Needs you" />
      <a href="#" className="flex w-48 items-center gap-2 text-sm">
        Fix the slow deploy
        <StatusMark tone="destructive" label="Failed" className="ms-auto" />
      </a>
    </div>
  ),
  play: async ({ canvas }) => {
    const tooltip = () => document.querySelector("[data-slot=tooltip-content]")
    const mark = canvas.getByText("Needs you").parentElement!
    await userEvent.hover(mark)
    await waitFor(() => expect(tooltip()).toHaveTextContent("Needs you"))
    // The pointer away, again until it closes: on a loaded machine one
    // move away can come before the tooltip has settled open.
    await waitFor(async () => {
      await userEvent.unhover(mark)
      expect(tooltip()).toBeNull()
    })

    // The keyboard on its row; the row's name is the same.
    const row = canvas.getByRole("link", { name: "Fix the slow deploy Failed" })
    await userEvent.tab()
    await expect(row).toHaveFocus()
    await waitFor(() => expect(tooltip()).toHaveTextContent("Failed"))
    await expect(row).toHaveAccessibleName("Fix the slow deploy Failed")
    await userEvent.tab()
    await waitFor(() => expect(tooltip()).toBeNull())
  },
}

/** While it is still going, a spinner instead of a dot. */
export const Busy: Story = {
  args: { busy: true, label: "Running" },
  play: async ({ canvas }) => {
    const mark = canvas.getByText("Running").parentElement!
    await expect(mark).toHaveAttribute("data-busy")
    const spinner = mark.querySelector("svg")!
    await expect(spinner).toBeInTheDocument()
    await expect(mark.querySelector(".rounded-full")).toBeNull()
    // Still, where the reader asks for less motion.
    await expect(underReducedMotion(spinner, "animation-name")).toBe("none")
  },
}

/** At the end of a row of a list, e.g. of connections, it names the row too. */
export const InAList: Story = {
  render: () => (
    <nav
      aria-label="Connections"
      className="flex w-sm max-w-full flex-col gap-2"
    >
      {[
        {
          name: "GitHub",
          detail: "Synced 2 minutes ago",
          tone: "success",
          label: "Connected",
        },
        {
          name: "Linear",
          detail: "Token expired",
          tone: "destructive",
          label: "Disconnected",
        },
        {
          name: "Slack",
          detail: "Syncing channels",
          busy: true,
          label: "Syncing",
        },
      ].map(({ name, detail, tone, busy, label }) => (
        <Item key={name} variant="outline" size="sm" render={<a href="#" />}>
          <ItemContent>
            <ItemTitle>{name}</ItemTitle>
            <ItemDescription>{detail}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <StatusMark
              tone={tone as StatusTone | undefined}
              busy={busy}
              label={label}
            />
          </ItemActions>
        </Item>
      ))}
    </nav>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: /^Linear.*Disconnected$/ })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("link", { name: /^Slack.*Syncing$/ })
    ).toBeInTheDocument()
  },
}
