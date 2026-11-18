import { useLayoutEffect, useState } from "react"
import { test } from "vitest"

import { AgentTurn, type AgentTurnPart } from "@/components/agent-turn"

import {
  measureFrames,
  render,
  report,
  reportFrames,
  sync,
  time,
} from "./harness"

const control: { set?: (parts: AgentTurnPart[]) => void } = {}

function Turn() {
  const [parts, setParts] = useState<AgentTurnPart[]>([])
  useLayoutEffect(() => {
    control.set = setParts
  }, [])
  return <AgentTurn id="perf" status="running" parts={parts} />
}

/** Steps done before the live one: reasoning, tool calls, what it said. */
function history(steps: number): AgentTurnPart[] {
  return Array.from({ length: steps }, (_, index): AgentTurnPart => {
    if (index % 3 === 0)
      return {
        type: "reasoning",
        id: `r${index}`,
        text: "Looking at the next file.",
        status: "done",
      }
    if (index % 3 === 1)
      return {
        type: "tool",
        id: `t${index}`,
        status: "done",
        title: `Ran step ${index}`,
      }
    return { type: "content", id: `c${index}`, content: `Step ${index} done.` }
  })
}

/**
 * A running turn's live step changing: its reasoning streaming in, then a
 * group of reads growing, with the rest of the turn on the page.
 */
for (const steps of [30, 300]) {
  test(`a running turn's live step: ${steps} steps before it`, async () => {
    render(<Turn />)
    const before = history(steps)
    let text = ""
    const samples: number[] = []
    const frames = []
    for (let chunk = 0; chunk < 60; chunk++) {
      text += `Word ${chunk}${chunk % 8 === 7 ? "\n" : " "}`
      const parts: AgentTurnPart[] = [
        ...before,
        { type: "reasoning", id: "live", text, status: "running" },
      ]
      if (chunk % 2) samples.push(time(() => sync(() => control.set!(parts))))
      else
        frames.push(await measureFrames(() => sync(() => control.set!(parts))))
    }
    report(`reasoning chunk, ${steps} steps before`, samples)
    reportFrames(`reasoning chunk, ${steps} steps before`, frames)

    const reads: AgentTurnPart[] = []
    const groupSamples: number[] = []
    for (let call = 0; call < 40; call++) {
      reads.push({
        type: "tool",
        id: `read${call}`,
        kind: "read",
        path: `src/file-${call}.ts`,
        status: "running",
      })
      const parts = [...before, ...reads]
      groupSamples.push(time(() => sync(() => control.set!(parts))))
    }
    report(`group call added, ${steps} steps before`, groupSamples)
  })
}
