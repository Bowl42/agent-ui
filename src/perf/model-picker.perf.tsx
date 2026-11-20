import { useLayoutEffect, useState } from "react"
import { expect, test } from "vitest"

import { ModelPicker, type ModelGroup } from "@/components/model-picker"

import {
  frame,
  measureFrames,
  memory,
  render,
  report,
  reportFrames,
  sync,
  timeWithFrames,
} from "./harness"

const groups: ModelGroup[] = Array.from({ length: 10 }, (_, group) => ({
  id: `group-${group}`,
  label: `Group ${group}`,
  models: Array.from({ length: 50 }, (_, model) => ({
    id: `model-${group}-${model}`,
    label: `model-${group}-${model}`,
    detail: "200k · $3",
    ...(model % 3 === 0
      ? {
          efforts: [
            { value: "low", label: "Low" },
            { value: "high", label: "High" },
          ],
          defaultEffort: "low",
        }
      : {}),
  })),
}))
let setOpen: (open: boolean) => void
function Bench() {
  const [open, update] = useState(false)
  useLayoutEffect(() => {
    setOpen = update
  }, [])
  return (
    <ModelPicker
      groups={groups}
      recent={groups[0]!.models.slice(0, 5).map((model) => model.id)}
      value="model-0-0"
      onValueChange={() => {}}
      onEffortChange={() => {}}
      open={open}
      onOpenChange={update}
    />
  )
}
async function settle() {
  for (let i = 0; i < 3; i++) await frame()
}
function input(query: string) {
  const element = document.querySelector<HTMLInputElement>("[cmdk-input]")!
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )!.set!.call(element, query)
  element.dispatchEvent(new Event("input", { bubbles: true }))
}
test("model picker: 10 groups of 50 models", async () => {
  render(<Bench />)
  await settle()
  const opens: number[] = []
  for (let run = 0; run < 5; run++) {
    opens.push(await timeWithFrames(() => sync(() => setOpen(true))))
    expect(document.querySelector("[role=tabpanel]")).toBeTruthy()
    sync(() => setOpen(false))
    await settle()
  }
  report("model picker open", opens)
  sync(() => setOpen(true))
  await settle()
  console.log(`PERF model picker open DOM nodes: ${(await memory()).nodes}`)
  const switches: number[] = []
  for (let run = 1; run <= 5; run++) {
    const tab =
      document.querySelectorAll<HTMLButtonElement>("[role=tab]")[run + 1]!
    switches.push(await timeWithFrames(() => sync(() => tab.click())))
  }
  report("model picker rail switch", switches)
  for (const query of ["e", "model-4", "absent"]) {
    const samples: number[] = []
    for (let run = 0; run < 5; run++) {
      sync(() => input(""))
      await settle()
      samples.push(await timeWithFrames(() => sync(() => input(query)), 2))
    }
    report(`model picker keystroke "${query}"`, samples)
    // The browser's own work too: style, layout and paint of the rows.
    const frames = []
    for (let run = 0; run < 5; run++) {
      sync(() => input(""))
      await settle()
      frames.push(await measureFrames(() => sync(() => input(query))))
    }
    reportFrames(`model picker keystroke "${query}"`, frames)
  }
})
