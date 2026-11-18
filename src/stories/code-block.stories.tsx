import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  CommandLineIcon,
  FileScriptIcon,
  TextWrapIcon,
} from "@hugeicons/core-free-icons"
import { expect, mocked, spyOn, userEvent, waitFor } from "storybook/test"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { Message, MessageContent } from "@/components/ui/message"

import { foldedLines, frames, insideBorder } from "./code-fold"
import { distance, painted, resolved } from "./paint"
import { asCoarse, coarseHitSize } from "./touch"

const meta = {
  title: "Components/Code Block",
  component: CodeBlock,
  decorators: [
    (Story) => (
      <div className="w-xl max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeBlock>

export default meta
type Story = StoryObj<typeof meta>

const build = `$ pnpm build
 ✓ Compiled successfully in 4.2s
 ✓ Generating static pages (12/12)

Route (app)                Size  First Load JS
┌ ○ /                    1.9 kB         112 kB
└ ƒ /api/chat             141 B         102 kB`

const install = `$ pnpm add ai @ai-sdk/react zod
Progress: resolved 412, reused 398, downloaded 14, added 14, done
Done in 2.8s using pnpm v10.18.0`

const error = `TypeError: Cannot read properties of undefined (reading 'map')
    at MessageList (components/message-list.tsx:18:22)
    at renderWithHooks (react-dom.development.js:16305:18)`

const source = `import { streamText } from "ai"

export async function POST(request: Request) {
  const { messages } = await request.json()

  const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    messages,
  })

  return result.toUIMessageStreamResponse()
}`

const diff = [
  { variant: "default", text: "export function Greeting({ name }: Props) {" },
  { variant: "removed", text: "  return <p>Hello, {name}</p>" },
  {
    variant: "added",
    text: '  return <p className="text-sm">Hello, {name}!</p>',
  },
  { variant: "default", text: "}" },
] as const

const log = Array.from(
  { length: 40 },
  (_, index) =>
    `[${String(index + 1).padStart(2, "0")}] GET /api/chat 200 in ${12 + ((index * 7) % 40)}ms`
).join("\n")

export const Plain: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockContent>{build}</CodeBlockContent>
    </CodeBlock>
  ),
  play: async ({ canvasElement }) => {
    // The content may scroll, so it is reachable from the keyboard.
    await userEvent.tab()
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block-content]"
    )!
    await expect(content).toHaveFocus()
    // Code, not prose: a page translator leaves it as it is.
    await expect(content).toHaveAttribute("translate", "no")
    await expect(content.translate).toBe(false)
  },
}

export const Wrap: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockContent wrap>{error}</CodeBlockContent>
    </CodeBlock>
  ),
  /**
   * The scroll fade's gradient stays on the element that scrolls: the
   * theme resets it on its children. Inherited, it changed for every
   * line inside on each scroll, and a scroll of 3,500 lines took 57 ms
   * restyling them (pnpm perf).
   */
  play: async ({ canvasElement }) => {
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block-content]"
    )!
    const code = content.querySelector<HTMLElement>(
      "[data-slot=code-block-code]"
    )!
    const fade = (element: HTMLElement) =>
      getComputedStyle(element).getPropertyValue("--scroll-fade-block")
    await expect(fade(content)).not.toBe("")
    await expect(fade(code)).toBe("")
  },
}

export const LineNumbers: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockContent lineNumbers>{source}</CodeBlockContent>
    </CodeBlock>
  ),
}

export const StartLine: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockContent lineNumbers startLine={42}>
        {source}
      </CodeBlockContent>
    </CodeBlock>
  ),
}

/**
 * Numbers as long as the last one's (9998 to 10000): their gutter as wide,
 * the code after it in every line, at one place, in either size.
 */
export const LongNumbers: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["default", "sm"] as const).map((size) => (
        <CodeBlock key={size} size={size}>
          <CodeBlockContent lineNumbers startLine={9998}>
            {"one\ntwo\nthree"}
          </CodeBlockContent>
        </CodeBlock>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const block of canvasElement.querySelectorAll(
      "[data-slot=code-block]"
    )) {
      const lines = [
        ...block.querySelectorAll<HTMLElement>("[data-slot=code-block-line]"),
      ]
      const starts = lines.map(
        (line) =>
          line
            .querySelector("[data-slot=code-block-line-content]")!
            .getBoundingClientRect().left
      )
      await expect(new Set(starts).size).toBe(1)
      // A digit's width, in its font.
      const digit = document.createElement("span")
      digit.textContent = "00000"
      lines[0]!.append(digit)
      const five = digit.getBoundingClientRect().width
      digit.remove()
      const number = Number.parseFloat(
        getComputedStyle(lines[2]!, "::before").width
      )
      await expect(number).toBeGreaterThanOrEqual(five - 0.5)
      // The code after the number and a gap.
      const before = getComputedStyle(lines[2]!, "::before")
      const end =
        lines[2]!.getBoundingClientRect().left +
        Number.parseFloat(before.insetInlineStart) +
        number
      await expect(starts[0]! - end).toBeGreaterThanOrEqual(8)
    }
  },
}

/** The copy button writes to the clipboard and announces "Copied". */
export const WithHeader: Story = {
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue(undefined)
    return () => writeText.mockRestore()
  },
  render: () => (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
          Terminal
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={install} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>{install}</CodeBlockContent>
    </CodeBlock>
  ),
  play: async ({ canvas }) => {
    const copy = canvas.getByRole("button", { name: "Copy" })
    // The size of a header's buttons: 28px, its icon 16px.
    await expect(copy.getBoundingClientRect()).toMatchObject({
      width: 28,
      height: 28,
    })
    await expect(copy.querySelector("svg")!.getBoundingClientRect().width).toBe(
      16
    )
    await userEvent.tab()
    await expect(copy).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith(
      install
    )
    await expect(
      await canvas.findByRole("button", { name: "Copied" })
    ).toBeVisible()
    await expect(
      canvas.getByText("Copied", { selector: "[aria-live]" })
    ).toBeInTheDocument()
  },
}

/** `labels` name the button and the announcement in the app's language. */
export const CopyLabels: Story = {
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue(undefined)
    return () => writeText.mockRestore()
  },
  render: () => (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
          Terminal
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton
            value={install}
            labels={{ copy: "Kopieren", copied: "Kopiert" }}
          />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>{install}</CodeBlockContent>
    </CodeBlock>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Kopieren" }))
    await expect(
      await canvas.findByRole("button", { name: "Kopiert" })
    ).toBeVisible()
    await expect(
      canvas.getByText("Kopiert", { selector: "[aria-live]" })
    ).toBeInTheDocument()
  },
}

/** When the clipboard refuses, the button says so; nothing claims it was copied. */
export const CopyFails: Story = {
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockRejectedValue(new DOMException("Denied", "NotAllowedError"))
    return () => writeText.mockRestore()
  },
  render: () => (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
          Terminal
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={install} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>{install}</CodeBlockContent>
    </CodeBlock>
  ),
  play: async ({ canvas, canvasElement }) => {
    const copy = canvas.getByRole("button", { name: "Copy" })
    await userEvent.click(copy)
    await expect(mocked(navigator.clipboard.writeText)).toHaveBeenCalled()
    // Refused: the button says so.
    await mocked(navigator.clipboard.writeText).mock.results[0]!.value.catch(
      () => {}
    )
    await waitFor(() => expect(copy).toHaveAccessibleName("Could not copy"))
    await expect(copy).toHaveAttribute("data-failed")
    await expect(copy).not.toHaveAttribute("data-copied")
    await expect(canvasElement.querySelector("[aria-live]")).toHaveTextContent(
      "Could not copy"
    )
  },
}

/**
 * A page that isn't a secure context (plain http on a local network) has
 * no clipboard: copying fails as a refusal does, without throwing.
 */
export const NoClipboard: Story = {
  beforeEach: () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    })
    return () => {
      delete (navigator as { clipboard?: unknown }).clipboard
    }
  },
  render: () => (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
          Terminal
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={install} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>{install}</CodeBlockContent>
    </CodeBlock>
  ),
  play: async ({ canvas }) => {
    await expect(navigator.clipboard).toBeUndefined()
    const copy = canvas.getByRole("button", { name: "Copy" })
    await userEvent.click(copy)
    await waitFor(() => expect(copy).toHaveAccessibleName("Could not copy"))
    await expect(copy).toHaveAttribute("data-failed")
  },
}

function StreamingCopy() {
  const [value, setValue] = React.useState("pnpm install")
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
          Terminal
        </CodeBlockTitle>
        <CodeBlockActions>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setValue((text) => `${text}\nDone.`)}
          >
            More output
          </Button>
          <CodeBlockCopyButton value={value} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>{value}</CodeBlockContent>
    </CodeBlock>
  )
}

/**
 * Once the value has changed, e.g. while it streams, the button no longer
 * says it was copied; it stays the same button, so focus stays on it.
 */
export const CopyThenChanged: Story = {
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue(undefined)
    return () => writeText.mockRestore()
  },
  render: () => <StreamingCopy />,
  play: async ({ canvas, canvasElement }) => {
    const copy = canvas.getByRole("button", { name: "Copy" })
    await userEvent.click(copy)
    await expect(await canvas.findByRole("button", { name: "Copied" })).toBe(
      copy
    )
    await userEvent.click(canvas.getByRole("button", { name: "More output" }))
    await expect(copy).toHaveAccessibleName("Copy")
    await expect(
      canvasElement.querySelector("[aria-live]")
    ).toBeEmptyDOMElement()
    await expect(canvas.getByRole("button", { name: "Copy" })).toBe(copy)
  },
}

/** A copy that finishes after the value changed does not claim the new one. */
export const CopyFinishesLate: Story = {
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    return () => writeText.mockRestore()
  },
  render: () => <StreamingCopy />,
  play: async ({ canvas, canvasElement }) => {
    let finish = () => {}
    const copying = new Promise<void>((resolve) => {
      finish = resolve
    })
    mocked(navigator.clipboard.writeText).mockReturnValue(copying)
    const copy = canvas.getByRole("button", { name: "Copy" })
    await userEvent.click(copy)
    await userEvent.click(canvas.getByRole("button", { name: "More output" }))
    // Finished, then the frames a render that said so would take.
    finish()
    await copying
    await frames(2)
    await expect(copy).toHaveAccessibleName("Copy")
    await expect(
      canvasElement.querySelector("[aria-live]")
    ).toBeEmptyDOMElement()
  },
}

export const Destructive: Story = {
  render: () => (
    <CodeBlock variant="destructive">
      <CodeBlockHeader>
        <CodeBlockTitle>Error</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={error} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent wrap>{error}</CodeBlockContent>
    </CodeBlock>
  ),
  /** Failed output in greys, told by weight: no red. */
  play: async ({ canvasElement }) => {
    const grey = (element: Element) => {
      const [r, g, b] = getComputedStyle(element)
        .color.match(/[\d.]+/g)!
        .map(Number)
      return Math.max(r!, g!, b!) - Math.min(r!, g!, b!) < 3
    }
    const content = canvasElement.querySelector(
      "[data-slot=code-block-content]"
    )!
    const title = canvasElement.querySelector("[data-slot=code-block-title]")!
    await expect(grey(content)).toBe(true)
    await expect(grey(title)).toBe(true)
    await expect(Number(getComputedStyle(content).fontWeight)).toBe(500)
    await expect(Number(getComputedStyle(title).fontWeight)).toBe(500)
  },
}

export const Diff: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>components/greeting.tsx</CodeBlockTitle>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {diff.map((line, index) => (
          <CodeBlockLine key={index} variant={line.variant}>
            {line.text}
          </CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  ),
}

export const HighlightedLines: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockContent lineNumbers>
        {source.split("\n").map((line, index) => (
          <CodeBlockLine
            key={index}
            variant={index >= 5 && index <= 8 ? "highlighted" : "default"}
          >
            {line}
          </CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  ),
}

/**
 * Each line's look apart from the others, in either theme, in greys:
 * added a light grey with its +, highlighted a tint a step over it;
 * removed on no tint, struck through in the faintest grey with its −.
 */
export const LineVariants: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockContent lineNumbers>
        {(["default", "added", "removed", "highlighted"] as const).map(
          (variant) => (
            <CodeBlockLine key={variant} variant={variant}>
              {`const line = "${variant}"`}
            </CodeBlockLine>
          )
        )}
      </CodeBlockContent>
    </CodeBlock>
  ),
  play: async ({ canvasElement }) => {
    const [plain, added, removed, highlighted] = [
      ...canvasElement.querySelectorAll<HTMLElement>(
        "[data-slot=code-block-line]"
      ),
    ].map((line) => ({ line, color: painted(line) }))
    for (const each of [added!, highlighted!])
      await expect(distance(each.color, plain!.color)).toBeGreaterThan(8)
    await expect(distance(added!.color, highlighted!.color)).toBeGreaterThan(4)
    // Removed: the page's surface, its text struck and faint.
    await expect(distance(removed!.color, plain!.color)).toBe(0)
    await expect(getComputedStyle(removed!.line).textDecorationLine).toBe(
      "line-through"
    )
    await expect(getComputedStyle(removed!.line).color).toBe(
      resolved(canvasElement, "var(--subtle-foreground)")
    )
    // The signs in greys, not red and green.
    await expect(getComputedStyle(added!.line, "::after").color).toBe(
      resolved(canvasElement, "var(--foreground)")
    )
    await expect(getComputedStyle(removed!.line, "::after").color).toBe(
      resolved(canvasElement, "var(--subtle-foreground)")
    )
  },
}

/**
 * A max height turns the content into a scroll area, which fades at the
 * edges it scrolls past, down and sideways.
 */
export const Height: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>Logs</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={log} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent className="max-h-48">{log}</CodeBlockContent>
    </CodeBlock>
  ),
  play: async ({ canvasElement }) => {
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block-content]"
    )!
    const style = getComputedStyle(content)
    // Both fades' masks: down and sideways.
    await expect(style.maskImage.match(/gradient\(/g)).toHaveLength(2)
    if (CSS.supports("animation-timeline", "scroll()"))
      await expect(style.animationTimeline).toMatch(/inline.*inline.*y.*y/)
  },
}

export const Small: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <CodeBlock size="sm">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
            pnpm add ai @ai-sdk/react zod
          </CodeBlockTitle>
          <CodeBlockActions>
            <CodeBlockCopyButton value={install} />
          </CodeBlockActions>
        </CodeBlockHeader>
        <CodeBlockContent wrap>{install}</CodeBlockContent>
      </CodeBlock>
      <CodeBlock size="sm" variant="destructive">
        <CodeBlockContent wrap>{error}</CodeBlockContent>
      </CodeBlock>
    </div>
  ),
  /** Stacked, both on a surface of their own, or neither (light). */
  play: async ({ canvasElement }) => {
    const surface = (block: Element) =>
      distance(painted(block), painted(block.parentElement!)) > 1
    const [plain, error] = canvasElement.querySelectorAll(
      "[data-slot=code-block]"
    )
    await expect(surface(error!)).toBe(surface(plain!))
  },
}

export const Empty: Story = {
  render: () => (
    <CodeBlock>
      <CodeBlockContent>{""}</CodeBlockContent>
    </CodeBlock>
  ),
}

function WithActionsDemo() {
  const [wrap, setWrap] = React.useState(false)
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <HugeiconsIcon icon={FileScriptIcon} strokeWidth={2} />
          app/api/chat/route.ts
        </CodeBlockTitle>
        <CodeBlockActions>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Wrap lines"
            aria-pressed={wrap}
            className="aria-pressed:text-foreground"
            onClick={() => setWrap(!wrap)}
          >
            <HugeiconsIcon icon={TextWrapIcon} strokeWidth={2} />
          </Button>
          <CodeBlockCopyButton value={source} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent wrap={wrap} lineNumbers>
        {source}
      </CodeBlockContent>
    </CodeBlock>
  )
}

export const WithActions: Story = {
  render: () => <WithActionsDemo />,
  play: async ({ canvas, canvasElement }) => {
    const toggle = canvas.getByRole("button", { name: "Wrap lines" })
    await userEvent.tab()
    await expect(toggle).toHaveFocus()
    await expect(toggle).toHaveAttribute("aria-pressed", "false")
    await userEvent.keyboard(" ")
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
    // Pressed shows on the block's surface, in either theme.
    await waitFor(() =>
      expect(
        distance(painted(toggle), painted(toggle.parentElement!))
      ).toBeGreaterThan(8)
    )
    await expect(
      canvasElement.querySelector("[data-slot=code-block-content]")
    ).toHaveAttribute("data-wrap")
  },
}

function ShowMoreDemo() {
  const [expanded, setExpanded] = React.useState(false)
  const id = React.useId()
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>logs/api.log</CodeBlockTitle>
      </CodeBlockHeader>
      <CodeBlockContent
        id={id}
        className={expanded ? undefined : "max-h-48 overflow-y-hidden"}
      >
        {log}
      </CodeBlockContent>
      <CodeBlockFooter className="justify-center">
        <Button
          variant="ghost"
          size="xs"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="transition-transform in-aria-expanded:rotate-180"
          />
          {expanded ? "Show less" : "Show more"}
        </Button>
      </CodeBlockFooter>
    </CodeBlock>
  )
}

export const ShowMore: Story = {
  render: () => <ShowMoreDemo />,
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("button", { name: "Show more" })
    toggle.focus()
    await userEvent.keyboard("{Enter}")
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await expect(toggle).toHaveAccessibleName("Show less")
  },
}

export const InMessage: Story = {
  render: () => (
    <div className="flex flex-col gap-4 text-sm">
      <Message align="end">
        <MessageContent>
          <Bubble>
            <BubbleContent>How do I stream a response?</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <MessageContent className="gap-3">
          <p>Create a route handler that returns the stream:</p>
          <CodeBlock>
            <CodeBlockHeader>
              <CodeBlockTitle>app/api/chat/route.ts</CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton value={source} />
              </CodeBlockActions>
            </CodeBlockHeader>
            <CodeBlockContent>{source}</CodeBlockContent>
          </CodeBlock>
          <p>The client reads it with useChat.</p>
        </MessageContent>
      </Message>
    </div>
  ),
}

const script = [
  'import fs from "node:fs"',
  'import path from "node:path"',
  'import { registrySchema } from "shadcn/schema"',
  "",
  'const root = path.resolve(import.meta.dirname, "..")',
  "const registry = JSON.parse(",
  '  fs.readFileSync(path.join(root, "registry.json"), "utf8")',
  ")",
  "",
  "export async function build() {",
  "  const parsed = registrySchema.parse(registry)",
  "  for (const item of parsed.items) {",
  "    const files = item.files.map((file) => read(file.path))",
  "    write(item.name, { ...item, files })",
  "  }",
  "}",
  "",
  "function read(file: string) {",
  "  return {",
  "    path: file,",
  '    content: fs.readFileSync(path.join(root, file), "utf8"),',
  "  }",
  "}",
  "",
  "function write(name: string, item: object) {",
  '  const out = path.join(root, "public/r", name + ".json")',
  "  fs.writeFileSync(out, JSON.stringify(item, null, 2))",
  "}",
  "",
  "await build()",
].join("\n")

function FoldDemo({
  code = script,
  ...props
}: React.ComponentProps<typeof CodeBlock> & { code?: string }) {
  return (
    <CodeBlock lines={12} {...props}>
      <CodeBlockHeader>
        <CodeBlockTitle>scripts/registry.ts</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>{code}</CodeBlockContent>
    </CodeBlock>
  )
}

/**
 * Longer than `lines`, it shows those, whole, fading out, and a bar
 * across its foot, inside its border, shows the rest: "Show all · 30
 * lines". Open, the bar folds it again, as does a button in its header.
 * Copying copies it all.
 */
export const Fold: Story = {
  render: () => <FoldDemo />,
  play: async ({ canvas, canvasElement }) => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue()
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    const content = block.querySelector<HTMLElement>(
      "[data-slot=code-block-content]"
    )!
    const bar = await canvas.findByRole("button", { name: "Show all 30 lines" })
    await expect(block).toHaveAttribute("data-fold", "closed")
    await expect(bar).toHaveAttribute("aria-expanded", "false")
    await expect(bar).toHaveAttribute("aria-controls", content.id)
    // Twelve lines whole, none cut.
    await expect(foldedLines(block)).toMatchObject({ whole: 12, cut: 0 })
    // The bar is the card's foot: inside its border, across it, at its
    // end, its corners the card's (14px), clipped by it: at the very
    // corner the card shows, a radius in the bar.
    await expect(insideBorder(bar, block)).toBe(true)
    const card = block.getBoundingClientRect()
    const foot = bar.getBoundingClientRect()
    await expect(foot.width).toBeCloseTo(card.width - 2, 0)
    await expect(foot.bottom).toBeCloseTo(card.bottom - 1, 0)
    await expect(foot.height).toBe(36)
    const radius = parseFloat(getComputedStyle(block).borderBottomLeftRadius)
    await expect(radius).toBe(14)
    await expect(getComputedStyle(bar).borderBottomLeftRadius).toBe("14px")
    await expect(getComputedStyle(bar).borderBottomRightRadius).toBe("14px")
    await expect(getComputedStyle(block).overflow).toBe("clip")
    await expect(
      document.elementFromPoint(card.left + 2, card.bottom - 2)
    ).not.toBe(bar)
    await expect(
      bar.contains(
        document.elementFromPoint(card.left + radius, card.bottom - 2)
      )
    ).toBe(true)
    await expect(getComputedStyle(bar).borderTopWidth).toBe("1px")
    // Its last two lines fade out, to nothing at the last one's end;
    // its sideways fades kept.
    const mask = getComputedStyle(content).maskImage
    const [, from, to] =
      /gradient\(rgb\(0, 0, 0\) ([\d.]+)px, rgba\(0, 0, 0, 0\) ([\d.]+)px/.exec(
        mask
      ) ?? []
    const lines = [
      ...content.querySelectorAll("[data-slot=code-block-line]"),
    ].map((line) => line.getBoundingClientRect())
    const top = content.getBoundingClientRect().top
    await expect(Number(to)).toBeCloseTo(lines[11]!.bottom - top, 0)
    await expect(Number(from)).toBeCloseTo(lines[10]!.top - top, 0)
    await expect(mask.match(/gradient\(/g)).toHaveLength(2)
    // No collapse in the header while closed.
    await expect(
      block.querySelector("[data-slot=code-block-collapse]")
    ).toBeNull()

    await userEvent.click(canvas.getByRole("button", { name: "Copy" }))
    await expect(writeText).toHaveBeenCalledWith(script)

    await userEvent.click(bar)
    await expect(block).toHaveAttribute("data-fold", "open")
    await expect(bar).toHaveAccessibleName("Show less 30 lines")
    await expect(bar).toHaveAttribute("aria-expanded", "true")
    await expect(foldedLines(block)).toMatchObject({ whole: 30, cut: 0 })
    await expect(content.scrollHeight).toBe(content.clientHeight)
    const collapse = canvas.getByRole("button", { name: "Collapse" })
    await expect(collapse).toHaveAttribute("aria-controls", content.id)
    await expect(
      getComputedStyle(block.querySelector("[data-slot=code-block-header]")!)
        .position
    ).toBe("sticky")
    await userEvent.click(bar)
    await expect(block).toHaveAttribute("data-fold", "closed")
    await expect(foldedLines(block)).toMatchObject({ whole: 12, cut: 0 })
  },
}

/** Its words, as the app gives them. */
export const FoldLabels: Story = {
  render: () => (
    <FoldDemo
      labels={{
        more: "Alles anzeigen",
        less: "Einklappen",
        lines: (lines) => `${lines} Zeilen`,
        collapse: "Code einklappen",
      }}
    />
  ),
  play: async ({ canvas }) => {
    const bar = await canvas.findByRole("button", {
      name: "Alles anzeigen 30 Zeilen",
    })
    await userEvent.click(bar)
    await expect(bar).toHaveAccessibleName("Einklappen 30 Zeilen")
    await expect(
      canvas.getByRole("button", { name: "Code einklappen" })
    ).toBeVisible()
  },
}

/** No longer than `lines`, it is as it was: no fold, no bar. */
export const FoldShort: Story = {
  render: () => <FoldDemo code={script.split("\n").slice(0, 12).join("\n")} />,
  play: async ({ canvasElement }) => {
    await frames(2)
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    await expect(block).not.toHaveAttribute("data-fold")
    await expect(block.querySelector("[data-slot=code-block-fold]")).toBeNull()
    await expect(foldedLines(block)).toMatchObject({ whole: 12, cut: 0 })
  },
}

/**
 * Open and long, its header stays at the top of what scrolls, with the
 * button that folds it; folding brings its start back into view.
 */
export const FoldScrolled: Story = {
  render: () => (
    <div data-testid="scroller" className="h-96 overflow-y-auto border">
      <div className="p-4">
        <p className="mb-4 text-sm">The script that builds the registry:</p>
        <FoldDemo defaultOpen />
        <p className="mt-4 text-sm">It runs on every push.</p>
      </div>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const scroller = canvas.getByTestId("scroller")
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    const header = block.querySelector<HTMLElement>(
      "[data-slot=code-block-header]"
    )!
    await waitFor(() => expect(block).toHaveAttribute("data-fold", "open"))
    scroller.scrollTop = 400
    await frames(2)
    const top = scroller.getBoundingClientRect().top + scroller.clientTop
    await expect(header.getBoundingClientRect().top).toBeCloseTo(top, 0)
    // Opaque, so the code passes under it.
    await expect(getComputedStyle(header).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)"
    )
    await userEvent.click(canvas.getByRole("button", { name: "Collapse" }))
    await expect(block).toHaveAttribute("data-fold", "closed")
    await waitFor(() =>
      expect(block.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        top - 0.5
      )
    )
  },
}

const linked = script.split("\n")

/** Focus moving into the folded part, e.g. a link by Tab, opens it. */
export const FoldFocus: Story = {
  render: () => (
    <CodeBlock lines={12}>
      <CodeBlockHeader>
        <CodeBlockTitle>scripts/registry.ts</CodeBlockTitle>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {linked.map((line, index) => (
          <CodeBlockLine key={index}>
            {index === 20 ? (
              <>
                {"    content: "}
                <a href="#read" className="underline">
                  readFileSync
                </a>
                {"(file),"}
              </>
            ) : (
              line
            )}
          </CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  ),
  play: async ({ canvas, canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    await waitFor(() => expect(block).toHaveAttribute("data-fold", "closed"))
    // The content (it scrolls sideways), then the link in line 21.
    await userEvent.tab()
    await userEvent.tab()
    await expect(canvas.getByRole("link")).toHaveFocus()
    await expect(block).toHaveAttribute("data-fold", "open")
    await expect(foldedLines(block).cut).toBe(0)
  },
}

/** Wrapped, a long line counts each line it takes; the fold ends on one. */
export const FoldWrapped: Story = {
  render: () => (
    <div className="w-80">
      <CodeBlock lines={12}>
        <CodeBlockContent wrap lineNumbers>
          {log}
        </CodeBlockContent>
      </CodeBlock>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    await canvas.findByRole("button", { name: "Show all 40 lines" })
    await expect(foldedLines(block)).toMatchObject({ whole: 12, cut: 0 })
  },
}

// Eleven short lines and one of 39 characters: at 12px, about 280px of
// code, more than fits at 300px (274px inside) and less than at 340px.
const steady = [
  ...Array.from({ length: 11 }, (_, index) => `step ${index + 1}`),
  "ship the build when every check passes.",
].join("\n")

function SteadyDemo() {
  return (
    // Wider while it folds, as a bubble with a bar across it might be: at
    // 300px its text takes 13 lines, at 340px 12, and a fold that looked
    // again at the wider width would open and close by turns.
    <div className="w-75 has-data-[fold=closed]:w-85">
      <CodeBlock lines={12}>
        <CodeBlockContent wrap>{steady}</CodeBlockContent>
      </CodeBlock>
    </div>
  )
}

/** A fold whose own state changes its width settles; it does not flicker. */
export const FoldSteady: Story = {
  render: () => <SteadyDemo />,
  play: async ({ canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    const code = block.querySelector<HTMLElement>(
      "[data-slot=code-block-code]"
    )!
    // The long line fits at 340px, not at 300px.
    const measure = document.createElement("canvas").getContext("2d")!
    measure.font = getComputedStyle(code).font
    const width = measure.measureText(steady.split("\n").at(-1)!).width
    await expect(width).toBeGreaterThan(274)
    await expect(width).toBeLessThan(314)
    let changes = 0
    const observer = new MutationObserver(() => changes++)
    observer.observe(block, { attributeFilter: ["data-fold"] })
    await frames(20)
    observer.disconnect()
    await expect(changes).toBeLessThanOrEqual(1)
    await expect(block).toHaveAttribute("data-fold", "closed")
    await expect(block.getBoundingClientRect().width).toBe(340)
  },
}

function StreamingDemo() {
  const [count, setCount] = React.useState(500)
  return (
    <>
      <Button size="sm" onClick={() => setCount((count) => count + 1)}>
        Add a line
      </Button>
      <CodeBlock lines={12} className="mt-2">
        <CodeBlockContent lineNumbers>
          {Array.from({ length: count }, (_, index) => (
            <CodeBlockLine key={index}>{`line ${index + 1}`}</CodeBlockLine>
          ))}
        </CodeBlockContent>
      </CodeBlock>
    </>
  )
}

/**
 * Output streaming into a folded block: each chunk reads the lines up to
 * the fold, not all of them, and the count follows.
 */
export const FoldStreaming: Story = {
  render: () => <StreamingDemo />,
  play: async ({ canvas, canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    await canvas.findByRole("button", { name: "Show all 500 lines" })
    const read = spyOn(Element.prototype, "getBoundingClientRect")
    read.mockClear()
    await userEvent.click(canvas.getByRole("button", { name: "Add a line" }))
    await canvas.findByRole("button", { name: "Show all 501 lines" })
    const reads = read.mock.calls.length
    read.mockRestore()
    // Its code, the 12 lines up to the fold, and few else.
    await expect(reads).toBeLessThan(30)
    await expect(foldedLines(block)).toMatchObject({ whole: 12, cut: 0 })
  },
}

/** Under a finger, the bar and the header's button are 44px. */
export const FoldTouch: Story = {
  render: () => <FoldDemo defaultOpen />,
  play: async ({ canvas, canvasElement }) => {
    const bar = await canvas.findByRole("button", {
      name: "Show less 30 lines",
    })
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    await expect(
      asCoarse(block, () => bar.getBoundingClientRect().height)
    ).toBe(44)
    const collapse = canvas.getByRole("button", { name: "Collapse" })
    await expect(coarseHitSize(collapse)).toMatchObject({
      width: 44,
      height: 44,
    })
  },
}

// A build's log of five thousand lines.
const huge = Array.from(
  { length: 5000 },
  (_, index) => `[${index + 1}] compiled module ${index + 1} of 5000`
).join("\n")

/**
 * Thousands of lines folded cost the twelve it shows: only those are
 * lines, the rest one plain text, hidden until found (find in the page
 * reaches it). Open, lines are rendered a few screens at a time as the
 * rest nears the view, each where its text was; the count and copying
 * are of every line, and opening moves nothing.
 */
export const FoldLong: Story = {
  render: () => <FoldDemo code={huge} />,
  play: async ({ canvas, canvasElement }) => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue()
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    const lines = () =>
      block.querySelectorAll<HTMLElement>("[data-slot=code-block-line]")
    const bar = await canvas.findByRole("button", {
      name: "Show all 5000 lines",
    })
    const rest = block.querySelector<HTMLElement>(
      "[data-slot=code-block-rest]"
    )!
    await expect(lines()).toHaveLength(12)
    await expect(rest).toHaveAttribute("hidden", "until-found")
    await expect(getComputedStyle(rest).contentVisibility).toBe("hidden")
    await expect(rest.getBoundingClientRect().height).toBe(0)
    await expect(rest.textContent).toContain("[5000] compiled module 5000")
    await expect(foldedLines(block)).toMatchObject({ whole: 12, cut: 0 })
    // The gutter is as wide as 5000's digits already.
    const first = textPlace(block, lines()[0]!)

    await userEvent.click(canvas.getByRole("button", { name: "Copy" }))
    await expect(writeText).toHaveBeenCalledWith(huge)

    await userEvent.click(bar)
    await expect(bar).toHaveAccessibleName("Show less 5000 lines")
    await expect(textPlace(block, lines()[0]!)).toEqual(first)
    // Lines a few screens down (250 at a time), then the rest's text,
    // shown, in line.
    const shown = lines().length
    await expect(shown).toBeGreaterThanOrEqual(262)
    await expect((shown - 12) % 250).toBe(0)
    await expect(rest).not.toHaveAttribute("hidden")
    const next = textPlace(block, rest)
    await expect(next.left).toBeCloseTo(first.left, 1)
    await expect(next.top).toBeCloseTo(
      textPlace(block, lines()[shown - 1]!).top + 20,
      1
    )
    // Near the view, the rest's text turns into lines where it was.
    rest.scrollIntoView({ block: "center" })
    await waitFor(() => expect(lines().length).toBeGreaterThan(shown))
    await expect(textPlace(block, lines()[shown]!)).toEqual(next)
    await expect(lines()[shown]).toHaveTextContent(
      `[${shown + 1}] compiled module ${shown + 1}`
    )
    await expect(rest.textContent).toContain("[5000] compiled module 5000")
  },
}

/**
 * Where a line's text starts in its block, or the rest's: the start of
 * its text's box and the top of its first line.
 */
function textPlace(block: HTMLElement, line: HTMLElement) {
  const rest = line.dataset.slot === "code-block-rest"
  const text = rest
    ? line.firstElementChild!
    : line.querySelector("[data-slot=code-block-line-content]")!
  const top = (rest ? text : line).getBoundingClientRect().top
  const box = block.getBoundingClientRect()
  return {
    left: text.getBoundingClientRect().left - box.left,
    top: top - box.top,
  }
}

/**
 * Find in the page reaching the rest opens the block at once, the text
 * it found left in place, shown, while the browser scrolls to it; its
 * lines come after.
 */
export const FoldFound: Story = {
  render: () => <FoldDemo code={huge} />,
  play: async ({ canvas, canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    const lines = () => block.querySelectorAll("[data-slot=code-block-line]")
    await canvas.findByRole("button", { name: "Show all 5000 lines" })
    const rest = block.querySelector<HTMLElement>(
      "[data-slot=code-block-rest]"
    )!
    const text = rest.firstElementChild!.firstChild
    // As the browser does, before it shows what it found.
    rest.dispatchEvent(new Event("beforematch", { bubbles: true }))
    await expect(block).toHaveAttribute("data-fold", "open")
    await expect(rest).not.toHaveAttribute("hidden")
    await expect(rest.firstElementChild!.firstChild).toBe(text)
    await expect(lines()).toHaveLength(12)
    await waitFor(() => expect(lines().length).toBeGreaterThanOrEqual(262))
  },
}

function LongStreamingDemo() {
  const [count, setCount] = React.useState(500)
  const code = Array.from(
    { length: count },
    (_, index) => `line ${index + 1}`
  ).join("\n")
  return (
    <>
      <Button size="sm" onClick={() => setCount((count) => count + 1)}>
        Add a line
      </Button>
      <CodeBlock lines={12} className="mt-2">
        <CodeBlockContent lineNumbers>{code}</CodeBlockContent>
      </CodeBlock>
    </>
  )
}

/**
 * Output streaming into a folded block's rest: the count follows, and
 * only the rest's last part changes, its earlier text left as it was.
 */
export const FoldLongStreaming: Story = {
  render: () => <LongStreamingDemo />,
  play: async ({ canvas, canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    await canvas.findByRole("button", { name: "Show all 500 lines" })
    const rest = block.querySelector("[data-slot=code-block-rest]")!
    const parts = [...rest.children].map((part) => part.firstChild)
    await expect(parts).toHaveLength(2)
    await userEvent.click(canvas.getByRole("button", { name: "Add a line" }))
    await canvas.findByRole("button", { name: "Show all 501 lines" })
    await expect(rest.children[0]!.firstChild).toBe(parts[0])
    await expect(rest.lastElementChild).toHaveTextContent(/line 501$/)
    await expect(
      block.querySelectorAll("[data-slot=code-block-line]")
    ).toHaveLength(12)
  },
}
