import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  DELETE_CHARACTER_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from "lexical"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useLayoutEffect, useState } from "react"
import { expect, test } from "vitest"

import {
  Composer,
  ComposerEditor,
  ComposerSubmit,
  ComposerSuggestions,
  ComposerToolbar,
  type ComposerValue,
} from "@/components/composer"

import { frame, render, report, time, sync } from "./harness"

const control: { editor?: LexicalEditor } = {}

function Grab() {
  const [editor] = useLexicalComposerContext()
  useLayoutEffect(() => {
    control.editor = editor
  }, [editor])
  return null
}

function Controlled({ initial }: { initial: ComposerValue }) {
  const [value, setValue] = useState(initial)
  return (
    <Composer value={value} onValueChange={setValue}>
      <ComposerEditor aria-label="Message" />
      <Grab />
    </Composer>
  )
}

const text = (lines: number) =>
  Array.from(
    { length: lines },
    (_, index) => `Line ${index} of a long message pasted into the box.`
  ).join("\n")

for (const lines of [10, 1000]) {
  test(`composer: type into ${lines} lines`, () => {
    render(<Controlled initial={[text(lines)]} />)
    sync(() =>
      control.editor!.update(() => $getRoot().selectEnd(), { discrete: true })
    )
    const typing: number[] = []
    for (let step = 0; step < 100; step++) {
      typing.push(
        time(() =>
          sync(() =>
            control.editor!.update(
              () => {
                const selection = $getSelection()
                if ($isRangeSelection(selection)) selection.insertText("x")
              },
              { discrete: true }
            )
          )
        )
      )
    }
    report(`composer keystroke, ${lines} lines`, typing)

    const moving: number[] = []
    for (let step = 0; step < 100; step++) {
      moving.push(
        time(() =>
          sync(() =>
            control.editor!.update(
              () => {
                const selection = $getSelection()
                if ($isRangeSelection(selection))
                  selection.modify("move", step % 2 === 0, "character")
              },
              { discrete: true }
            )
          )
        )
      )
    }
    report(`composer caret move, ${lines} lines`, moving)
    expect(
      control.editor!.getEditorState().read(() => $getRoot().getTextContent())
    ).toContain("xxxx")
  })
}

/** A long Markdown draft: headings, lists, code blocks, inline code. */
const markdownBlock = [
  "## A heading for this part",
  "",
  "A paragraph that says what changed and why, with `inline code` in it.",
  "",
  "- The first point",
  "- The second point",
  "1. A numbered one",
  "",
  "```ts",
  "const value = compute(input)",
  "```",
  "",
]
const markdown = (lines: number) =>
  Array.from(
    { length: lines },
    (_, index) => markdownBlock[index % markdownBlock.length]
  ).join("\n")

/** As an app has it: suggestions for @ and a send button. */
function Full({ initial }: { initial: ComposerValue }) {
  const [value, setValue] = useState(initial)
  return (
    <Composer value={value} onValueChange={setValue}>
      <ComposerEditor aria-label="Message" />
      <ComposerSuggestions trigger="@" items={[]} label="Files" />
      <ComposerToolbar>
        <ComposerSubmit />
      </ComposerToolbar>
      <Grab />
    </Composer>
  )
}

/**
 * The nodes of line `line`, counting from 0, whether the editor parts its
 * lines with line breaks or as blocks of their own.
 */
function $line(line: number) {
  let at = 0
  for (const block of $getRoot().getChildren()) {
    if (!$isElementNode(block)) continue
    let nodes: LexicalNode[] = []
    let start = 0
    for (const [index, node] of block.getChildren().entries()) {
      if (!$isLineBreakNode(node)) nodes.push(node)
      else if (at++ === line) return { nodes, block, start }
      else {
        nodes = []
        start = index + 1
      }
    }
    if (at++ === line) return { nodes, block, start }
  }
  throw new Error(`No line ${line}`)
}

/** Puts the caret at the end of line `line`, or in its middle. */
function $caretAt(line: number, middle = false) {
  const { nodes, block, start } = $line(line)
  const texts = nodes.filter($isTextNode)
  const size = (node: TextNode) => node.getTextContentSize()
  if (!texts.length) return block.select(start, start)
  if (!middle) return texts.at(-1)!.select()
  let half = Math.floor(texts.reduce((sum, node) => sum + size(node), 0) / 2)
  for (const node of texts) {
    if (half <= size(node)) return node.select(half, half)
    half -= size(node)
  }
}

/** A key as the editor has it: Shift+Enter, Backspace or a character. */
const press = (key: string) =>
  control.editor!.update(
    () => {
      const editor = control.editor!
      if (key === "Enter")
        editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false)
      else if (key === "Backspace")
        editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true)
      else {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) selection.insertText(key)
      }
    },
    { discrete: true }
  )

const pasted = Array.from(
  { length: 20 },
  (_, index) => `Pasted line ${index}, with \`code\` and words in it.`
).join("\n")

/** Pastes as the browser does, through the editor's paste event. */
function paste(root: HTMLElement) {
  const data = new DataTransfer()
  data.setData("text/plain", pasted)
  const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true })
  // Firefox leaves out the data given to the constructor.
  Object.defineProperty(event, "clipboardData", { value: data })
  root.dispatchEvent(event)
  // Lexical commits a paste in a microtask; this commits it now.
  control.editor!.update(() => {}, { discrete: true })
}

const textSize = () =>
  control.editor!.getEditorState().read(() => $getRoot().getTextContentSize())

// Long drafts, plain text and Markdown, collapsed and expanded (where the
// Markdown is styled), the caret mid-draft and the editor focused, as when
// typing: the editor keeps the caret in view at each key.
for (const lines of [2000, 10_000])
  for (const kind of ["plain", "Markdown"] as const)
    for (const expanded of [false, true]) {
      const draft = `${lines.toLocaleString("en")}-line ${kind}${expanded ? ", expanded" : ""}`
      test(`composer: type into a ${draft}`, async () => {
        const host = render(
          <Full initial={[kind === "plain" ? text(lines) : markdown(lines)]} />
        )
        const root = host.querySelector<HTMLElement>("[contenteditable]")!
        root.focus()
        if (expanded) {
          root.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "E",
              ctrlKey: true,
              shiftKey: true,
              bubbles: true,
            })
          )
          await frame()
          expect(
            host.querySelector("form")!.hasAttribute("data-expanded")
          ).toBe(true)
        }
        await frame()
        const run = (
          name: string,
          line: number,
          step: () => void,
          { middle = false, count = 120 } = {}
        ) => {
          sync(() =>
            control.editor!.update(() => $caretAt(line, middle), {
              discrete: true,
            })
          )
          const samples: number[] = []
          for (let index = 0; index < count; index++)
            samples.push(time(() => sync(step)))
          report(`composer ${name}, ${draft}`, samples)
        }
        const keys = (list: string[]) => {
          let index = 0
          return () => press(list[index++ % list.length]!)
        }
        const before = textSize()
        // Mid-draft; a paragraph's line in Markdown (12 lines a block: 0 a
        // heading, 2 a paragraph, 3 blank, 9 code).
        const at = lines / 2 - ((lines / 2) % 12) + 2
        run("keystroke at a line's end", at, keys(["x"]))
        run("keystroke mid-line", at + 12, keys(["x"]), { middle: true })
        run("Enter and Backspace", at + 24, keys(["Enter", "Backspace"]))
        run("paste of 20 lines", at + 36, () => paste(root), { count: 30 })
        if (kind === "Markdown") {
          run("keystroke in a heading", at + 46, keys(["x"]))
          run("keystroke in code", at + 55, keys(["x"]))
          // Opens a code block over the rest of the draft, then closes it.
          run(
            "a fence typed and taken back",
            at + 61,
            keys(["`", "`", "`", "Backspace", "Backspace", "Backspace"])
          )
        }
        expect(textSize() - before).toBeGreaterThan(30 * pasted.length)
      })
    }
