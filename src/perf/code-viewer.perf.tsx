import { expect, test } from "vitest"

import { CodeViewer } from "@/components/code-viewer"
import { loadHighlighter } from "@/lib/highlighter"

import {
  frame,
  measureFrames,
  render,
  report,
  reportFrames,
  sync,
  time,
} from "./harness"

/** ~3500 lines of TypeScript: flat, or in blocks that fold. */
const source = (folding: boolean) =>
  Array.from({ length: 700 }, (_, block) =>
    folding
      ? [
          `export function value${block}(input: number) {`,
          `  const doubled = input * 2 // block ${block}`,
          `  const tripled = input * 3`,
          `  return doubled + tripled`,
          `}`,
        ]
      : Array.from(
          { length: 5 },
          (_, line) =>
            `export const value${block}_${line}: number = ${block} * ${line} // line`
        )
  )
    .flat()
    .join("\n")

const setValue = (input: HTMLInputElement, value: string) => {
  const set = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )!.set!
  set.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

// Typed, then erased.
const typing = (term: string) => {
  const typed = term
    .split("")
    .map((_, index, all) => all.slice(0, index + 1).join(""))
  return [...typed, ...typed.slice(0, -1).reverse(), ""]
}
const terms = [
  // In every line.
  { name: "common", steps: typing("value12") },
  // In none: what typing costs beyond the matches.
  { name: "rare", steps: typing("zqxw") },
]

for (const folded of [false, true]) {
  const name = `code-viewer: type in find, ~3500 lines${folded ? ", folded" : ""}`
  test(name, async () => {
    await loadHighlighter("typescript")
    const host = render(
      <CodeViewer
        code={source(folded)}
        language="typescript"
        title="values.ts"
        className="h-[600px]"
      />
    )
    for (let i = 0; i < 100 && !host.querySelector("[class^='code-']"); i++)
      await frame()
    expect(host.querySelector("[class^='code-']")).not.toBeNull()
    if (folded) {
      // Every other block folded.
      const buttons = [
        ...host.querySelectorAll<HTMLButtonElement>("button[aria-label=Fold]"),
      ]
      expect(buttons.length).toBeGreaterThan(600)
      buttons.forEach(
        (button, index) => index % 2 || sync(() => button.click())
      )
      expect(
        host.querySelectorAll("button[aria-label=Unfold]").length
      ).toBeGreaterThan(300)
    }
    sync(() =>
      host.querySelector<HTMLButtonElement>("button[aria-label=Find]")!.click()
    )
    await frame()
    const input = host.querySelector<HTMLInputElement>(
      "input[aria-label=Find]"
    )!

    for (const { name, steps } of terms) {
      const samples: number[] = []
      const totals = []
      for (let round = 0; round < 3; round++) {
        for (const value of steps) {
          samples.push(time(() => sync(() => setValue(input, value))))
          await frame()
        }
      }
      for (const value of steps)
        totals.push(
          await measureFrames(() => sync(() => setValue(input, value)))
        )
      const label = `code-viewer find keystroke, ${name} term, ~3500 lines${folded ? ", folded" : ""}`
      report(label, samples)
      reportFrames(label, totals)
    }
  })
}
