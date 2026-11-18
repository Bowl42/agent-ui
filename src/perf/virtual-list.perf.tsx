import { useLayoutEffect, useState } from "react"
import { expect, test } from "vitest"

import { VirtualList } from "@/components/virtual-list"

import { frame, render, report, time, sync } from "./harness"

type Row = { id: string; name: string }
const rows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `row:${index}`,
    name: `row ${index}`,
  }))

const control: { append?: () => void } = {}
const append = () => control.append!()

/** As an app writes it: getKey and renderItem inline. */
function List({ initial }: { initial: Row[] }) {
  const [items, setItems] = useState(initial)
  useLayoutEffect(() => {
    control.append = () =>
      setItems((list) => [...list, { id: `row:${list.length}`, name: "new" }])
  }, [])
  return (
    <VirtualList
      items={items}
      getKey={(row) => row.id}
      estimateSize={32}
      className="h-[600px]"
      renderItem={(row) => <div className="h-8 px-2">{row.name}</div>}
    />
  )
}

const list = (host: HTMLElement) =>
  host.querySelector<HTMLElement>("[data-slot=virtual-list]")!

for (const count of [10_000, 100_000]) {
  test(`virtual-list: scroll ${count} items`, async () => {
    const host = render(<List initial={rows(count)} />)
    const element = list(host)
    await frame()
    const samples: number[] = []
    for (let step = 1; step <= 200; step++) {
      samples.push(
        time(() =>
          sync(() => {
            element.scrollTop = step * 97
            element.dispatchEvent(new Event("scroll"))
          })
        )
      )
    }
    report(`virtual-list scroll step, ${count} items`, samples)
    expect(element.textContent).toContain("row ")
  })

  test(`virtual-list: append to ${count} items`, async () => {
    render(<List initial={rows(count)} />)
    await frame()
    const samples: number[] = []
    for (let step = 0; step < 50; step++) {
      samples.push(time(() => sync(() => append())))
    }
    report(`virtual-list append, ${count} items`, samples)
  })
}
