import { useLayoutEffect, useState } from "react"
import { expect, test } from "vitest"

import { MarkdownCodeBlock } from "@/components/markdown"
import { loadHighlighter } from "@/lib/highlighter"

import {
  frame,
  measureFrames,
  memory,
  render,
  reportFrames,
  sync,
  unmount,
} from "./harness"

// A long fence in an answer, folded to 12 lines: an agent's log (plain
// text) or a generated file (highlighted). What it costs to mount, to
// hold, to open and to stream into, at 500, 5,000 and 20,000 lines.

const languages = {
  text: (index: number) =>
    `2026-11-09T12:00:${String(index % 60).padStart(2, "0")}Z info worker ${index % 7}: processed batch ${index} in ${10 + (index % 90)}ms`,
  typescript: (index: number) =>
    `export const value${index}: number = ${index} * 2 // line ${index}`,
}
type Language = keyof typeof languages

const source = (language: Language, count: number) =>
  Array.from({ length: count }, (_, index) => languages[language](index)).join(
    "\n"
  )

const block = (host: HTMLElement) =>
  host.querySelector<HTMLElement>("[data-slot=markdown-code-block]")!

/** Folded (or open) and, for a language, highlighted. */
async function settled(host: HTMLElement, language: Language, fold: string) {
  const ready = () =>
    block(host)?.dataset.fold === fold &&
    (language === "text" || host.querySelector("[class^='code-']"))
  for (let i = 0; i < 600 && !ready(); i++) await frame()
  expect(ready()).toBeTruthy()
  await frame()
  await frame()
}

const megabytes = (bytes: number) => Math.round(bytes / 1e4) / 100

/** A folded block once mounted: how long it took, what it holds. */
type Held = { wall: number; heap: number; nodes: number; layoutObjects: number }

const sizes = [
  { count: 500, runs: 5 },
  { count: 5000, runs: 3 },
  { count: 20000, runs: 2 },
]

for (const language of Object.keys(languages) as Language[]) {
  for (const { count, runs } of sizes) {
    test(`code fold: mount and open a folded ${language} fence, ${count} lines`, async () => {
      await loadHighlighter(language)
      const code = source(language, count)
      const mounts = []
      const opens = []
      const ends = []
      const rendered: number[] = []
      const steps: number[] = []
      const held: Held[] = []
      for (let run = 0; run < runs; run++) {
        unmount()
        await frame()
        const before = await memory()
        let host!: HTMLElement
        const start = performance.now()
        mounts.push(
          await measureFrames(
            () => {
              host = render(
                <MarkdownCodeBlock code={code} language={language} />
              )
            },
            () => settled(host, language, "closed")
          )
        )
        const wall = performance.now() - start
        const after = await memory()
        held.push({
          wall,
          heap: after.heap - before.heap,
          nodes: after.nodes - before.nodes,
          layoutObjects: after.layoutObjects - before.layoutObjects,
        })
        const bar = host.querySelector<HTMLElement>(
          "[data-slot=code-block-fold]"
        )!
        expect(bar.textContent).toContain(`${count} lines`)
        opens.push(
          await measureFrames(
            () => sync(() => bar.click()),
            () => settled(host, language, "open")
          )
        )
        rendered.push(
          host.querySelectorAll("[data-slot=code-block-line]").length
        )
        // Then straight to its end: every line rendered on the way.
        let frames = 0
        ends.push(
          await measureFrames(
            () => window.scrollTo(0, document.body.scrollHeight),
            async () => {
              while (host.querySelector("[data-slot=code-block-rest]")) {
                await frame()
                frames++
              }
              await frame()
            }
          )
        )
        steps.push(frames)
        expect(
          host.querySelectorAll("[data-slot=code-block-line]").length
        ).toBe(count)
        window.scrollTo(0, 0)
      }
      unmount()
      reportFrames(`code fold ${language} mount, ${count} lines`, mounts)
      reportFrames(
        `code fold ${language} open, ${count} lines (${rendered[0]} rendered)`,
        opens
      )
      reportFrames(
        `code fold ${language} open, to its end, ${count} lines (${steps[0]} frames)`,
        ends
      )
      const median = (pick: (sample: Held) => number) =>
        [...held.map(pick)].sort((a, b) => a - b)[Math.floor(held.length / 2)]!
      console.log(
        `PERF code fold ${language} held folded, ${count} lines: ${median((s) => Math.round(s.wall))}ms to settle, heap ${megabytes(median((s) => s.heap))}MB, ${median((s) => s.nodes)} nodes, ${median((s) => s.layoutObjects)} layout objects`
      )
    })
  }
}

const control: { write?: (text: string) => void } = {}

function Streaming({ language }: { language: Language }) {
  const [code, setCode] = useState("")
  useLayoutEffect(() => {
    control.write = (text) => setCode((current) => current + text)
  }, [])
  return <MarkdownCodeBlock code={code} language={language} />
}

for (const language of Object.keys(languages) as Language[]) {
  for (const open of [false, true]) {
    test(`code fold: stream into a${open ? "n open" : " folded"} ${language} fence`, async () => {
      await loadHighlighter(language)
      const host = render(<Streaming language={language} />)
      let index = 0
      for (const upTo of [500, 5000]) {
        const lines: string[] = []
        while (index < upTo - 50)
          lines.push(languages[language](index++) + "\n")
        sync(() => control.write!(lines.join("")))
        await settled(host, language, open && upTo > 500 ? "open" : "closed")
        if (open && block(host).dataset.fold === "closed") {
          sync(() =>
            host
              .querySelector<HTMLElement>("[data-slot=code-block-fold]")!
              .click()
          )
          await settled(host, language, "open")
        }
        // Fifty lines, each arriving in two pieces.
        const samples = []
        for (let step = 0; step < 50; step++) {
          const text = languages[language](index++) + "\n"
          const half = Math.floor(text.length / 2)
          samples.push(
            await measureFrames(
              () => sync(() => control.write!(text.slice(0, half))),
              1
            )
          )
          samples.push(
            await measureFrames(
              () => sync(() => control.write!(text.slice(half))),
              1
            )
          )
        }
        expect(
          host.querySelector("[data-slot=code-block-fold]")!.textContent
        ).toContain(`${index} lines`)
        reportFrames(
          `code fold ${language} stream, ${open ? "open" : "folded"}, ~${upTo} lines`,
          samples
        )
      }
    })
  }
}
