import { useLayoutEffect, useState } from "react"
import { test } from "vitest"
import { page } from "vitest/browser"

import { FolderPicker } from "@/components/folder-picker"
import type { ViewerFile } from "@/components/files-viewer"
import {
  render,
  sync,
  frame,
  report,
  timeWithFrames,
  memory,
  measureFrames,
  reportFrames,
} from "./harness"

const folder: ViewerFile = {
  id: "~",
  name: "~",
  directory: true,
  children: Array.from({ length: 5000 }, (_, index) => ({
    id: `~/folder-${index}`,
    name: `folder-${index}`,
    directory: true,
    children: Array.from({ length: 20 }, (_, child) => ({
      id: `~/folder-${index}/child-${child}`,
      name: `child-${child}`,
      directory: true,
      children: [],
    })),
  })),
}
const control: {
  open?: (value: boolean) => void
  select?: (value: string | null) => void
  view?: (value: "columns" | "list") => void
  expand?: (value: ReadonlySet<string>) => void
  folder?: (value: ViewerFile) => void
} = {}
function Demo() {
  const [open, setOpen] = useState(false)
  const [root, setRoot] = useState(folder)
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<"columns" | "list">("columns")
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  useLayoutEffect(() => {
    control.open = setOpen
    control.select = setSelected
    control.view = setView
    control.expand = setExpanded
    control.folder = setRoot
  }, [])
  return (
    <FolderPicker
      open={open}
      onOpenChange={setOpen}
      folder={root}
      selected={selected}
      onSelect={(entry) => setSelected(entry.id)}
      view={view}
      onViewChange={setView}
      expanded={expanded}
      onExpandedChange={setExpanded}
      onChoose={() => {}}
    />
  )
}
test("folder picker: 5000 folders with 20 loaded subfolders each", async () => {
  render(<Demo />)
  await frame()
  const before = await memory()
  const opens: number[] = []
  for (let run = 0; run < 5; run++) {
    opens.push(await timeWithFrames(() => sync(() => control.open!(true))))
    sync(() => control.open!(false))
    for (let count = 0; count < 12; count++) await frame()
  }
  report("folder picker open columns (5000 folders)", opens)
  sync(() => control.open!(true))
  await frame()
  const columns: number[] = []
  for (let run = 0; run < 10; run++) {
    columns.push(
      await timeWithFrames(() => sync(() => control.select!(`~/folder-${run}`)))
    )
  }
  report("folder picker select second column", columns)
  sync(() => {
    control.view!("list")
    control.select!(null)
  })
  await frame()
  const list: number[] = []
  for (let run = 0; run < 10; run++) {
    list.push(
      await timeWithFrames(() =>
        sync(() => {
          control.select!(`~/folder-${run}`)
          control.expand!(new Set([`~/folder-${run}`]))
        })
      )
    )
  }
  report("folder picker expand list folder", list)
  // A folder's content back from the app: a new tree, one folder changed.
  sync(() => control.view!("columns"))
  await frame()
  const loads: number[] = []
  for (let run = 0; run < 10; run++) {
    const id = `~/folder-${run}`
    sync(() => control.select!(id))
    await frame()
    const next: ViewerFile = {
      ...folder,
      children: folder.children!.map((child) =>
        child.id === id
          ? {
              ...child,
              children: [
                ...child.children!,
                { id: `${id}/new`, name: "new", directory: true, children: [] },
              ],
            }
          : child
      ),
    }
    loads.push(await timeWithFrames(() => sync(() => control.folder!(next))))
  }
  report("folder picker a folder loaded (new tree)", loads)
  const after = await memory()
  console.log(
    `PERF folder picker heap: ${Math.round(before.heap / 1e6)}MB → ${Math.round(after.heap / 1e6)}MB; DOM nodes ${before.nodes} → ${after.nodes}`
  )
})

test("folder picker open a prefetched folder", async () => {
  render(<Demo />)
  sync(() => control.open!(true))
  await frame()
  const samples: number[] = []
  for (let run = 0; run < 10; run++)
    samples.push(
      await timeWithFrames(() => sync(() => control.select!(`~/folder-${run}`)))
    )
  report("folder picker open a prefetched folder", samples)
})

function TypingDemo() {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <FolderPicker
      open
      onOpenChange={() => {}}
      folder={folder}
      selected={selected}
      onSelect={(entry) => setSelected(entry.id)}
      onNavigate={(path) => {
        if (path === "~" || folder.children!.some((entry) => entry.id === path))
          setSelected(path)
      }}
      onChoose={() => {}}
    />
  )
}
test("folder picker keystroke selects and completes (5000 folders)", async () => {
  render(<TypingDemo />)
  await frame()
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Path"]'
  )!
  input.focus()
  const type = (text: string) =>
    sync(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call(input, text)
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
  type("~/")
  for (let count = 0; count < 3; count++) await frame()
  const shown = (name: string) =>
    new Promise<void>((resolve) => {
      const check = () =>
        input.value === `~/${name}` &&
        Array.from(document.querySelectorAll('[aria-selected="true"]')).some(
          (entry) => entry.textContent === name
        )
          ? resolve()
          : requestAnimationFrame(check)
      check()
    })
  const times: number[] = []
  const totals: Awaited<ReturnType<typeof measureFrames>>[] = []
  for (let run = 0; run < 10; run++) {
    const name = `folder-${run * 7 + 1}`
    let timed: Promise<number>
    totals.push(
      await measureFrames(
        () => {
          timed = timeWithFrames(() => type(`~/${name}`))
        },
        async () => {
          await shown(name)
          times.push(await timed)
          await frame()
          await frame()
        }
      )
    )
  }
  report("folder picker keystroke selects and completes (5000 folders)", times)
  reportFrames(
    "folder picker keystroke selects and completes (5000 folders)",
    totals
  )
})

test("folder picker keystroke filters the column (5000 folders)", async () => {
  render(<TypingDemo />)
  await frame()
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Path"]'
  )!
  input.focus()
  const type = (text: string) =>
    sync(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call(input, text)
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
  type("~/")
  await frame()
  const times: number[] = []
  const totals: Awaited<ReturnType<typeof measureFrames>>[] = []
  for (const prefix of [
    "folder-1",
    "folder-12",
    "folder-123",
    "folder-1234",
    "folder-123",
    "folder-12",
    "folder-1",
    "folder-12",
    "folder-123",
    "folder-1234",
  ]) {
    const matching = folder
      .children!.filter((file) => file.name.startsWith(prefix))
      .sort((a, b) =>
        new Intl.Collator(undefined, { numeric: true }).compare(a.name, b.name)
      )
    const first = matching[0]!
    let timed: Promise<number>
    totals.push(
      await measureFrames(
        () => {
          timed = timeWithFrames(() => type(`~/${prefix}`))
        },
        async () => {
          await new Promise<void>((resolve) => {
            const check = () => {
              const column = document.querySelector(
                '[role="listbox"][aria-label="~"]'
              )
              const rows = Array.from(
                column?.querySelectorAll('[role="option"]') ?? []
              )
              if (
                input.value === first.id &&
                rows.length > 0 &&
                rows.every((row) => row.textContent?.startsWith(prefix)) &&
                rows.some(
                  (row) =>
                    row.textContent === first.name &&
                    row.getAttribute("aria-selected") === "true"
                ) &&
                document.body.textContent?.includes(
                  `${matching.length} of 5000 items`
                )
              )
                resolve()
              else requestAnimationFrame(check)
            }
            check()
          })
          times.push(await timed)
          await frame()
          await frame()
        }
      )
    )
  }
  report("folder picker keystroke filters the column (5000 folders)", times)
  reportFrames(
    "folder picker keystroke filters the column (5000 folders)",
    totals
  )
})

test("folder picker keystroke filters the phone list (5000 folders)", async () => {
  await page.viewport(390, 844)
  try {
    render(<TypingDemo />)
    await frame()
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Path"]'
    )!
    input.focus()
    const type = (text: string) =>
      sync(() => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        )!.set!.call(input, text)
        input.dispatchEvent(new Event("input", { bubbles: true }))
      })
    type("~/")
    await frame()
    const times: number[] = []
    const totals: Awaited<ReturnType<typeof measureFrames>>[] = []
    for (const prefix of [
      "folder-1",
      "folder-12",
      "folder-123",
      "folder-1234",
      "folder-123",
      "folder-12",
      "folder-1",
      "folder-12",
      "folder-123",
      "folder-1234",
    ]) {
      const matching = folder
        .children!.filter((file) => file.name.startsWith(prefix))
        .sort((a, b) =>
          new Intl.Collator(undefined, { numeric: true }).compare(
            a.name,
            b.name
          )
        )
      const first = matching[0]!
      let timed: Promise<number>
      totals.push(
        await measureFrames(
          () => {
            timed = timeWithFrames(() => type(`~/${prefix}`))
          },
          async () => {
            await new Promise<void>((resolve) => {
              const check = () => {
                const column = document.querySelector(
                  '[role="listbox"][aria-label="~"]'
                )
                const rows = Array.from(
                  column?.querySelectorAll('[role="option"]') ?? []
                )
                if (
                  input.value === first.id &&
                  rows.length > 0 &&
                  rows.every((row) => row.textContent?.startsWith(prefix)) &&
                  rows.some(
                    (row) =>
                      row.textContent === first.name &&
                      row.getAttribute("aria-selected") === "true"
                  ) &&
                  document.body.textContent?.includes(
                    `${matching.length} of 5000 items`
                  )
                )
                  resolve()
                else requestAnimationFrame(check)
              }
              check()
            })
            times.push(await timed)
            await frame()
            await frame()
          }
        )
      )
    }
    report(
      "folder picker keystroke filters the phone list (5000 folders)",
      times
    )
    reportFrames(
      "folder picker keystroke filters the phone list (5000 folders)",
      totals
    )
  } finally {
    await page.viewport(1280, 800)
  }
})

test("folder picker phone goes into a folder (5000 folders)", async () => {
  await page.viewport(390, 844)
  try {
    render(<Demo />)
    sync(() => control.open!(true))
    await frame()
    const times: number[] = []
    const totals: Awaited<ReturnType<typeof measureFrames>>[] = []
    const until = (selector: string) =>
      new Promise<void>((resolve) => {
        const check = () =>
          document.querySelector(selector)
            ? resolve()
            : requestAnimationFrame(check)
        check()
      })
    for (let run = 0; run < 10; run++) {
      const row = `[data-file="~/folder-${run}"]`
      await until(row)
      let timed: Promise<number>
      totals.push(
        await measureFrames(
          () => {
            timed = timeWithFrames(() =>
              document.querySelector<HTMLElement>(row)?.click()
            )
          },
          async () => {
            await until(`[data-file="~/folder-${run}/child-0"]`)
            times.push(await timed)
          }
        )
      )
      const crumb = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "~"
      )
      crumb?.click()
      await until('[data-file="~/folder-0"]')
    }
    report("folder picker phone goes into a folder", times)
    reportFrames("folder picker phone goes into a folder", totals)
  } finally {
    await page.viewport(1280, 800)
  }
})

test("folder picker drag a column's border (5000 folders)", async () => {
  render(<Demo />)
  sync(() => {
    control.open!(true)
    control.select!("~/folder-0")
  })
  await frame()
  const handle = document.querySelector<HTMLElement>(
    "[data-slot=files-column-resize]"
  )!
  const dispatch = (type: string, clientX: number, buttons = 1) => {
    handle.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        buttons,
        pointerId: 1,
        clientX,
        clientY: 100,
      })
    )
  }
  dispatch("pointerdown", 100)
  const times: number[] = []
  const totals: Awaited<ReturnType<typeof measureFrames>>[] = []
  for (let move = 1; move <= 30; move++) {
    let timed: Promise<number>
    totals.push(
      await measureFrames(() => {
        timed = timeWithFrames(() => dispatch("pointermove", 100 + move * 4), 1)
      }, 1)
    )
    times.push(await timed!)
  }
  dispatch("pointerup", 220, 0)
  await frame()
  report("folder picker drag a column's border, per move", times)
  reportFrames("folder picker drag a column's border, per move", totals)
  const commits: number[] = []
  const commitFrames: Awaited<ReturnType<typeof measureFrames>>[] = []
  for (let run = 0; run < 5; run++) {
    dispatch("pointerdown", 100)
    for (let move = 1; move <= 10; move++)
      dispatch("pointermove", 100 + move * (run % 2 ? -4 : 4))
    let timed: Promise<number>
    commitFrames.push(
      await measureFrames(() => {
        timed = timeWithFrames(() => dispatch("pointerup", 140, 0), 1)
      }, 1)
    )
    commits.push(await timed!)
  }
  report("folder picker column resize commit", commits)
  reportFrames("folder picker column resize commit", commitFrames)
})
