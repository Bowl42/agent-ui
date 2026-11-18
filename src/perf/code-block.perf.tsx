import { useLayoutEffect, useState } from "react"
import { expect, test } from "vitest"

import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockLine,
} from "@/components/ui/code-block"
import { useFollowEnd } from "@/hooks/use-follow-end"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
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

const green = "\u001b[32m"
const reset = "\u001b[0m"
const ansiLine = (index: number) =>
  `${green}✓${reset} test ${index} passed in ${10 + (index % 9)}ms\n`
const tsLine = (index: number) =>
  `export const value${index}: number = ${index} * 2 // line ${index}\n`

const control: { write?: (text: string) => void } = {}
const write = (text: string) => control.write!(text)

function Output({ language, wrap }: { language: string; wrap?: boolean }) {
  const [output, setOutput] = useState("")
  useLayoutEffect(() => {
    control.write = (text) => setOutput((current) => current + text)
  }, [])
  const { ref } = useFollowEnd<HTMLPreElement>()
  const lines = useHighlightedCode(output, language)
  return (
    <CodeBlock>
      <CodeBlockContent ref={ref} wrap={wrap} className="max-h-96">
        {lines.map((content, index) => (
          <CodeBlockLine key={index}>{content}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

const cases = [
  { language: "ansi", line: ansiLine },
  { language: "typescript", line: tsLine },
]

for (const { language, line } of cases) {
  test(`code-block: stream ${language}`, async () => {
    await loadHighlighter(language)
    const host = render(<Output language={language} />)
    // Let the highlighter load in the component.
    sync(() => write(line(0)))
    for (let i = 0; i < 50 && !host.querySelector("[class^='code-']"); i++) {
      await frame()
    }
    expect(host.querySelector("[class^='code-']")).not.toBeNull()

    let index = 1
    const marks = [1000, 3000]
    for (const upTo of marks) {
      // Grow to the mark, a line at a time, unmeasured.
      const lines: string[] = []
      while (index < upTo - 100) lines.push(line(index++))
      sync(() => write(lines.join("")))
      await frame()
      // Then measure a hundred lines, each arriving in two pieces.
      const samples: number[] = []
      for (let step = 0; step < 100; step++) {
        const text = line(index++)
        const half = Math.floor(text.length / 2)
        samples.push(time(() => sync(() => write(text.slice(0, half)))))
        samples.push(time(() => sync(() => write(text.slice(half)))))
      }
      report(`code-block ${language} chunk, ~${upTo} lines`, samples)
      await frame()
    }
  })
}

const plainControl: { write?: (text: string) => void } = {}

/** As a process preview: plain lines, no highlighting. */
function Plain({ wrap }: { wrap: boolean }) {
  const [output, setOutput] = useState(
    Array.from({ length: 3500 }, (_, index) => `line ${index} of output`).join(
      "\n"
    )
  )
  useLayoutEffect(() => {
    plainControl.write = (text) => setOutput((current) => current + text)
  }, [])
  const { ref } = useFollowEnd<HTMLPreElement>()
  return (
    <CodeBlock className="h-[600px]">
      <CodeBlockContent ref={ref} wrap={wrap} className="min-h-0 flex-1">
        {output.split("\n").map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

for (const wrap of [false, true]) {
  test(`code-block: append to 3500 plain lines${wrap ? ", wrapped" : ""}`, async () => {
    render(<Plain wrap={wrap} />)
    for (let i = 0; i < 5; i++) await frame()
    const samples = []
    for (let step = 0; step < 20; step++) {
      samples.push(
        await measureFrames(() =>
          sync(() => plainControl.write!(`\nappended line ${step}`))
        )
      )
    }
    reportFrames(
      `code-block append, 3500 plain lines${wrap ? ", wrapped" : ""}`,
      samples
    )
  })
}
