import { test } from "vitest"

import {
  AgentTurnChanges,
  AgentTurnChangesProvider,
  AgentTurnChangesTrigger,
} from "@/components/agent-turn-changes"

import { render, report, sync, time, unmount } from "./harness"

const diffs = Array.from({ length: 100 }, (_, turn) =>
  Array.from({ length: 4 }, (_, file) =>
    [
      `--- a/turn-${turn}/file-${file}.ts`,
      `+++ b/turn-${turn}/file-${file}.ts`,
      "@@ -1,5 +1,5 @@",
      ...Array.from({ length: 5 }, (_, line) => `-const old${line} = ${line}`),
      ...Array.from(
        { length: 5 },
        (_, line) => `+const next${line} = ${line + 1}`
      ),
    ].join("\n")
  ).join("\n")
)

type Shape = "footer" | "card"

function Turns({ shape }: { shape: Shape }) {
  return (
    <>
      {diffs.map((diff, index) =>
        shape === "card" ? (
          <AgentTurnChanges key={index} diff={diff} />
        ) : (
          <AgentTurnChangesProvider key={index} diff={diff}>
            <AgentTurnChanges />
            <AgentTurnChangesTrigger />
          </AgentTurnChangesProvider>
        )
      )}
    </>
  )
}

for (const shape of ["footer", "card"] as const) {
  test(`100 ${shape} turns mount`, () => {
    const samples = []
    for (let repetition = 0; repetition < 10; repetition++) {
      unmount()
      samples.push(
        time(() => {
          render(<Turns shape={shape} />)
        })
      )
    }
    report(
      shape === "footer" ? "100 footer triggers mount" : "100 cards mount",
      samples
    )
  })
}

test("open one of 100", () => {
  const host = render(<Turns shape="footer" />)
  const triggers = host.querySelectorAll<HTMLButtonElement>(
    "[data-slot=agent-turn-changes-trigger]"
  )
  const samples = []
  const closing = []
  for (const trigger of Array.from(triggers).slice(0, 20)) {
    samples.push(time(() => sync(() => trigger.click())))
    closing.push(time(() => sync(() => trigger.click())))
  }
  report("open one of 100", samples)
  report("close one of 100", closing)
})
