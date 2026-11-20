import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { AtIcon, TextIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CodeViewer, foldRanges, formatJson } from "@/components/code-viewer"
import { ViewerStatusButton } from "@/components/viewer"
import { Panel, PanelMenu } from "@/stories/panel"

import { distance, painted } from "./paint"
import { coarseHitSize } from "./touch"

const code = `import { cache } from "./cache"

export function imageKey(image) {
  if (image.content) {
    return hash(image.content)
  }
  return image.path
}

export function clear() {
  cache.clear()
}
`

const meta = {
  title: "Components/Code Viewer",
  component: CodeViewer,
  parameters: { layout: "padded" },
  args: { code, title: "src/images.ts" },
  decorators: [
    // In a box of its own, or as in the panel beside a conversation.
    (Story, { parameters }) =>
      parameters.panel ? (
        <Panel>
          <Story />
        </Panel>
      ) : (
        <div className="flex h-96 w-xl max-w-full flex-col">
          <Story />
        </div>
      ),
  ],
} satisfies Meta<typeof CodeViewer>

export default meta
type Story = StoryObj<typeof meta>

const line = (element: HTMLElement, number: number) =>
  element.querySelector<HTMLElement>(`[data-line="${number}"]`)

/**
 * The matches drawn, in the order of the code: CSS highlights' ranges
 * (or, in a browser without them, marks), each its text, where it
 * starts and whether it is the one gone to.
 */
function drawn(element: HTMLElement) {
  if (typeof CSS === "undefined" || !("highlights" in CSS))
    return [
      ...element.querySelectorAll<HTMLElement>("[data-slot=search-mark]"),
    ].map((mark) => ({
      text: mark.textContent ?? "",
      node: mark as Node,
      current: mark.hasAttribute("data-current"),
    }))
  const of = (name: string) =>
    [...((CSS.highlights.get(name) as Highlight | undefined) ?? [])].filter(
      (range): range is Range =>
        range instanceof Range && element.contains(range.startContainer)
    )
  const current = new Set(of("code-viewer-current"))
  return [...of("code-viewer-match"), ...current]
    .sort((a, b) => a.compareBoundaryPoints(Range.START_TO_START, b))
    .map((range) => ({
      text: range.toString(),
      node: range.startContainer,
      current: current.has(range),
    }))
}

/**
 * Ctrl+F (⌘F) in it opens its own find bar: its matches marked in the
 * coloured code, counted; Enter and Shift+Enter go between them; Escape
 * closes it, the focus back on the code.
 */
export const Find: Story = {
  play: async ({ canvas, canvasElement }) => {
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block-content]"
    )!
    // Coloured first: its matches are marked in the colours.
    await waitFor(() =>
      expect(
        line(canvasElement, 5)!.querySelector("span[class^='code-']")
      ).not.toBe(null)
    )
    const page = fn<(event: KeyboardEvent) => void>()
    window.addEventListener("keydown", page)
    try {
      content.focus()
      await userEvent.keyboard("{Control>}f{/Control}")
      // Not the page's find too.
      await expect(
        page.mock.calls.filter(([event]) => event.key === "f")
      ).toHaveLength(0)
    } finally {
      window.removeEventListener("keydown", page)
    }
    const field = canvas.getByRole("textbox", { name: "Find" })
    await waitFor(() => expect(field).toHaveFocus())

    await userEvent.keyboard("IMAGE.c")
    // Any case; one a line here. Found a moment after the typing (as
    // "IMAGE." finds as many), so waited for.
    const marks = () => drawn(canvasElement)
    const marked = (number: number) =>
      marks().filter((mark) => line(canvasElement, number)!.contains(mark.node))
    await waitFor(() =>
      expect(
        marked(4)
          .map((mark) => mark.text)
          .join("")
      ).toBe("image.c")
    )
    await expect(canvas.getByText("1 of 2")).toBeVisible()
    await expect(marks()).toHaveLength(2)
    const first = marked(4)
    await expect(first[0]!.current).toBe(true)
    await expect(line(canvasElement, 4)).toHaveAttribute(
      "data-variant",
      "highlighted"
    )

    await userEvent.keyboard("{Enter}")
    await expect(await canvas.findByText("2 of 2")).toBeVisible()
    await expect(line(canvasElement, 5)).toHaveAttribute(
      "data-variant",
      "highlighted"
    )
    await userEvent.keyboard("{Enter}")
    await expect(await canvas.findByText("1 of 2")).toBeVisible()
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}")
    await expect(await canvas.findByText("2 of 2")).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Previous match" })
    )
    await expect(await canvas.findByText("1 of 2")).toBeVisible()

    // Five, two in one line: only the one gone to is the current one;
    // back from the first is the last.
    await userEvent.clear(field)
    await userEvent.type(field, "image")
    await expect(await canvas.findByText("1 of 5")).toBeVisible()
    await waitFor(() => expect(marked(3)).toHaveLength(2))
    await expect(marks().filter((mark) => mark.current)).toHaveLength(1)
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}")
    await expect(await canvas.findByText("5 of 5")).toBeVisible()
    await expect(line(canvasElement, 7)).toHaveAttribute(
      "data-variant",
      "highlighted"
    )

    // Across the code's coloured pieces (a keyword, then the rest), all
    // of it marked, in each.
    await userEvent.clear(field)
    await userEvent.type(field, "IF (image")
    await waitFor(() =>
      expect(
        marks()
          .map((mark) => mark.text)
          .join("")
      ).toBe("if (image")
    )
    await expect(canvas.getByText("1 of 1")).toBeVisible()
    // Floating, 36px, its words 12px, its count fainter, no ring inside.
    const bar = field.closest<HTMLElement>("[data-slot=input-group]")!
    await expect(bar.getBoundingClientRect().height).toBe(36)
    await expect(getComputedStyle(field).fontSize).toBe("12px")
    const count = canvas.getByText("1 of 1")
    await expect(getComputedStyle(count).fontSize).toBe("12px")
    await expect(getComputedStyle(count).fontWeight).toBe("400")
    // Each of its shadows (a ring is one) 0px: none shows.
    await expect(
      getComputedStyle(bar).boxShadow.replace(/[a-z]+\([^)]*\)/g, "")
    ).toMatch(/^[\s0px,]*$|^none$/)
    // One range over the pieces where the browser draws highlights; a
    // mark in each where it has to mark them.
    await expect(marks().length).toBe(
      typeof CSS !== "undefined" && "highlights" in CSS ? 1 : 2
    )
    const start = marks()[0]!.node
    const holder = start instanceof Element ? start : start.parentElement
    await expect(holder?.closest("span[class^='code-']")).not.toBeNull()

    await userEvent.clear(field)
    await userEvent.type(field, "nowhere")
    await expect(await canvas.findByText("No results")).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Next match" })
    ).toBeDisabled()

    field.focus()
    await userEvent.keyboard("{Escape}")
    await expect(canvas.queryByRole("textbox", { name: "Find" })).toBeNull()
    await expect(content).toHaveFocus()
    await expect(marks()).toHaveLength(0)
  },
}

/** `:N` in the find bar goes to line N, opening the fold it is in. */
export const GoToLine: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getAllByRole("button", { name: "Fold" })[0]!)
    await waitFor(() => expect(line(canvasElement, 5)).toBeNull())
    await userEvent.click(canvas.getByRole("button", { name: "Find" }))
    await userEvent.keyboard(":5")
    await expect(await canvas.findByText("Line 5")).toBeVisible()
    await expect(line(canvasElement, 5)).toHaveAttribute(
      "data-variant",
      "highlighted"
    )
    await userEvent.clear(canvas.getByRole("textbox", { name: "Find" }))
    await userEvent.keyboard(":999")
    await expect(await canvas.findByText("Line 12")).toBeVisible()
  },
}

/**
 * By indentation, folded and unfolded by a button at a fold's first
 * line; the lines after it keep their numbers.
 */
export const Folding: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(foldRanges(code.split("\n"))).toEqual(
      new Map([
        [3, 7],
        [4, 5],
        [10, 11],
      ])
    )
    const folds = canvas.getAllByRole("button", { name: "Fold" })
    await expect(folds).toHaveLength(3)
    // A line high; for a finger, its hit area 16px larger.
    const { width, height } = coarseHitSize(folds[0]!)
    await expect(width).toBeGreaterThanOrEqual(folds[0]!.offsetWidth + 16)
    await expect(height).toBeGreaterThanOrEqual(folds[0]!.offsetHeight + 16)
    await userEvent.click(folds[0]!)
    for (const number of [4, 5, 6, 7])
      await expect(line(canvasElement, number)).toBeNull()
    await expect(line(canvasElement, 3)).not.toBeNull()
    await expect(line(canvasElement, 8)).not.toBeNull()
    // Numbered as in the file.
    await expect(line(canvasElement, 8)!.style.counterSet).toBe("line 8")
    const unfold = canvas.getByRole("button", { name: "Unfold" })
    await userEvent.click(unfold)
    await expect(line(canvasElement, 5)).not.toBeNull()
  },
}

const json = '{"name":"agentui","private":true,"scripts":{"test":"vitest"}}'

/** JSON formatted, or as written; its buttons say which. */
export const Json: Story = {
  args: { code: json, title: "package.json" },
  play: async ({ canvas, canvasElement }) => {
    await expect(formatJson(json)).toBe(
      JSON.stringify(JSON.parse(json), null, 2)
    )
    await expect(formatJson('{\n  "a": 1\n}\n')).toBeUndefined()
    await expect(formatJson("{nope")).toBeUndefined()
    await expect(line(canvasElement, 2)).toBeNull()
    // Its header's buttons and toggles one size: 28px, icons 16px.
    const actions = canvasElement.querySelector(
      "[data-slot=code-block-actions]"
    )!
    for (const each of actions.querySelectorAll(":scope > button")) {
      await expect(each.getBoundingClientRect()).toMatchObject({
        width: 28,
        height: 28,
      })
      await expect(
        each.querySelector("svg")!.getBoundingClientRect().width
      ).toBe(16)
    }
    const format = canvas.getByRole("button", { name: "Format JSON" })
    await userEvent.click(format)
    await expect(format).toHaveAttribute("aria-pressed", "true")
    // Pressed shows on the code's surface, in either theme.
    await waitFor(() =>
      expect(distance(painted(format), painted(actions))).toBeGreaterThan(8)
    )
    await waitFor(() =>
      expect(line(canvasElement, 2)).toHaveTextContent('"name": "agentui",')
    )
  },
}

/** Without what to format, no button to. */
export const NotJson: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("button", { name: "Format JSON" })
    ).toBeNull()
  },
}

/** Wrapped or not: the app keeps it, e.g. for every file. */
export const Wrap: Story = {
  args: {
    code: `const long = "${"a long line ".repeat(20)}"\n`,
    onWrapChange: fn(),
  },
  play: async ({ args, canvas, canvasElement }) => {
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block-content]"
    )!
    await expect(content.scrollWidth).toBeGreaterThan(content.clientWidth)
    await userEvent.click(canvas.getByRole("button", { name: "Wrap lines" }))
    await expect(args.onWrapChange).toHaveBeenCalledWith(true)
    await waitFor(() =>
      expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth)
    )
  },
}

/** A line's look is the app's: e.g. what an edit changed. */
export const LineVariants: Story = {
  args: {
    lineVariant: (number) =>
      number === 5 ? "added" : number === 7 ? "removed" : undefined,
  },
  play: async ({ canvasElement }) => {
    await expect(line(canvasElement, 5)).toHaveAttribute(
      "data-variant",
      "added"
    )
    await expect(line(canvasElement, 7)).toHaveAttribute(
      "data-variant",
      "removed"
    )
    await expect(line(canvasElement, 6)).toHaveAttribute(
      "data-variant",
      "default"
    )
  },
}

/** Its words are the app's. */
export const Labels: Story = {
  args: {
    labels: {
      find: "Suchen",
      findHint: "Suchen oder :Zeile",
      matches: (current, count) => `${current} / ${count}`,
      noMatches: "Keine Treffer",
      line: (line) => `Zeile ${line}`,
      wrap: "Zeilenumbruch",
      fold: "Einklappen",
      unfold: "Ausklappen",
      copy: "Code kopieren",
      copied: "Kopiert",
      previous: "Vorheriger Treffer",
      next: "Nächster Treffer",
      closeFind: "Suche schließen",
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Zeilenumbruch" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Code kopieren" })
    ).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Suchen" }))
    const field = canvas.getByRole("textbox", { name: "Suchen" })
    await expect(field).toHaveAttribute("placeholder", "Suchen oder :Zeile")
    await userEvent.type(field, "image")
    await expect(await canvas.findByText(/^1 \/ \d+$/)).toBeVisible()
    await userEvent.clear(field)
    await userEvent.type(field, ":3")
    await expect(await canvas.findByText("Zeile 3")).toBeVisible()
    await expect(
      canvas.getAllByRole("button", { name: "Einklappen" }).length
    ).toBe(3)
  },
}

/** In a long file, the match gone to is scrolled to. */
export const Scrolls: Story = {
  args: {
    code: Array.from({ length: 200 }, (_, index) =>
      index === 150 ? "const needle = 1" : `const line${index} = ${index}`
    ).join("\n"),
    title: "long.ts",
  },
  play: async ({ canvas, canvasElement }) => {
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block-content]"
    )!
    await userEvent.click(canvas.getByRole("button", { name: "Find" }))
    await userEvent.keyboard("needle")
    await waitFor(() => expect(content.scrollTop).toBeGreaterThan(0))
    const box = content.getBoundingClientRect()
    const found = line(canvasElement, 151)!.getBoundingClientRect()
    await expect(found.top).toBeGreaterThanOrEqual(box.top)
    await expect(found.bottom).toBeLessThanOrEqual(box.bottom)
    await waitFor(() =>
      expect(drawn(canvasElement).map((mark) => mark.text)).toEqual(["needle"])
    )
  },
}

/** Controlled: the app's wrap shows, whatever it was. */
export const ControlledWrap: Story = {
  render: (args) => {
    const [wrap, setWrap] = React.useState(true)
    return <CodeViewer {...args} wrap={wrap} onWrapChange={setWrap} />
  },
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("button", { name: "Wrap lines" })
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute("aria-pressed", "false")
  },
}

/**
 * The props React holds for each line's element: the same object while
 * the line is not rendered again.
 */
const lineProps = (element: HTMLElement) =>
  [...element.querySelectorAll("[data-slot=code-block-line]")].map((node) => {
    const key = Object.keys(node).find((name) =>
      name.startsWith("__reactProps$")
    )!
    return (node as unknown as Record<string, unknown>)[key]
  })

/**
 * Typing in the find bar of a long file renders the lines whose matches
 * change, not every line.
 */
export const FindInLongFile: Story = {
  args: {
    code: Array.from(
      { length: 1500 },
      (_, index) =>
        `export const value${index}: number = ${index} * 2${index === 1200 ? " // zebra" : ""}`
    ).join("\n"),
    title: "long.ts",
  },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() =>
      expect(
        line(canvasElement, 5)!.querySelector("span[class^='code-']")
      ).not.toBe(null)
    )
    await userEvent.click(canvas.getByRole("button", { name: "Find" }))
    // A term in no line, then in one.
    await userEvent.keyboard("zq")
    await expect(await canvas.findByText("No results")).toBeVisible()
    const before = lineProps(canvasElement)
    await expect(before).toHaveLength(1500)
    await userEvent.keyboard("{Backspace}ebra")
    await expect(await canvas.findByText("1 of 1")).toBeVisible()
    const after = lineProps(canvasElement)
    const rendered = after.filter((props, index) => props !== before[index])
    // The line found, only.
    await expect(rendered).toHaveLength(1)
  },
}

/**
 * `embedded`: a viewer's, as a code page in the browser. No box in the
 * frame: the lines to its edges, its tools in the viewer's toolbar, Wrap,
 * its language and length in the status bar.
 */
export const Embedded: Story = {
  args: {
    variant: "embedded",
    frame: { name: "images.ts", path: [{ label: "src" }] },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvasElement.querySelector("[data-slot=code-block]")
    ).toBeNull()
    const toolbar = within(
      canvasElement.querySelector<HTMLElement>("[data-slot=viewer-toolbar]")!
    )
    await expect(toolbar.getByRole("button", { name: "Copy" })).toBeVisible()
    await userEvent.click(toolbar.getByRole("button", { name: "Find" }))
    await userEvent.keyboard("image")
    await expect(await canvas.findByText("1 of 5")).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await expect(canvas.queryByRole("textbox", { name: "Find" })).toBeNull()
    const wrap = canvas.getByRole("button", { name: "Wrap lines" })
    await userEvent.click(wrap)
    await expect(wrap).toHaveAttribute("aria-pressed", "true")
    await expect(
      canvasElement.querySelector("[data-slot=viewer-facts]")
    ).toHaveTextContent("TS · 12 lines")
  },
}

/** A CI job's log, 4,812 lines, where it first fails at line 1,204. */
const log = (() => {
  const failure = [
    "##[group]Run pnpm registry:build",
    "> agentui@0.1.9 registry:build",
    "> node scripts/registry.mjs",
    "",
    "Reading registry.json (48 items)",
    "  ✓ button",
    "Error: ENOENT: no such file or directory, open 'public/r/chart.json'",
    "    at Object.openSync (node:fs:573:3)",
    "    at readFileSync (node:fs:452:35)",
    "    at build (scripts/registry.mjs:41:18)",
    "    at main (scripts/registry.mjs:88:3)",
    "##[error]Process completed with exit code 1.",
    "##[endgroup]",
    "Post job cleanup.",
    "[command]/usr/bin/git version",
    "git version 2.47.1",
    "Temporarily overriding HOME='/home/runner/work/_temp'",
    "Copying '/home/runner/.gitconfig' to '/home/runner/work/_temp/.gitconfig'",
  ]
  const filler = (line: number) =>
    line % 40 === 1
      ? `##[group]Step ${Math.ceil(line / 40)}`
      : line % 40 === 0
        ? "##[endgroup]"
        : `  + package-${line} 1.${line % 9}.${line % 4} (cached)`
  const lines = Array.from({ length: 4812 }, (_, index) => filler(index + 1))
  lines.splice(1197, failure.length, ...failure)
  lines[4805] = "##[error]The job failed after 6m 12s."
  return lines.join("\n")
})()

/**
 * A long paste, or a log, read in the panel: an embedded viewer back to
 * the message it is from, its lines numbered and not folded (it is not
 * code), found in (the line gone to in the status bar), wrapped or not,
 * and the app's control to quote lines into the conversation.
 */
export const LongPaste: Story = {
  parameters: { panel: true },
  args: {
    code: log,
    language: "",
    folding: false,
    variant: "embedded",
    frame: {
      name: "Pasted text",
      icon: <HugeiconsIcon icon={TextIcon} strokeWidth={2} />,
      path: [{ label: "Message", onSelect: fn() }],
      onBack: fn(),
      menu: <PanelMenu />,
      details: ["212 KB"],
    },
    controls: (
      <ViewerStatusButton>
        <HugeiconsIcon icon={AtIcon} strokeWidth={2} />
        Quote lines
      </ViewerStatusButton>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvasElement.querySelector("[data-slot=viewer-facts]")
    ).toHaveTextContent("4,812 lines · 212 KB")
    // Not code: no folds.
    await expect(canvas.queryByRole("button", { name: "Fold" })).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Find" }))
    await userEvent.keyboard("Error")
    await expect(await canvas.findByText("1 of 3")).toBeVisible()
    await expect(canvas.getByText("Line 1,204")).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Quote lines" })
    ).toBeVisible()
  },
}
