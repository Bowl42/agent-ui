import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { File01Icon } from "@hugeicons/core-free-icons"
import * as React from "react"
import { expect, userEvent, waitFor } from "storybook/test"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { VirtualList, type VirtualListActions } from "@/components/virtual-list"
import { frames, settled } from "@/stories/wait"

type File = { id: string; name: string; note: string }

// Every seventh file has a long note, so items differ in height.
const files: File[] = Array.from({ length: 10_000 }, (_, index) => ({
  id: `file:${index}`,
  name: `file-${index}.ts`,
  note:
    index % 7 === 0
      ? `Changed in ${index} commits by several people over a long time, so this note wraps onto more than one line.`
      : `${index} lines`,
}))

function Files({
  items,
  actionsRef,
  notes = true,
  className = "h-80",
}: {
  items: File[]
  notes?: boolean
  actionsRef?: React.Ref<VirtualListActions>
  className?: string
}) {
  return (
    <VirtualList
      role="list"
      aria-label="Files"
      // The items are not focusable, so the list is, to scroll by keyboard.
      tabIndex={0}
      items={items}
      getKey={(file) => file.id}
      estimateSize={56}
      actionsRef={actionsRef}
      className={`rounded-lg border ${className}`}
      renderItem={(file, index) => (
        <Item
          role="listitem"
          aria-setsize={items.length}
          aria-posinset={index + 1}
          size="sm"
        >
          <ItemMedia variant="icon">
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{file.name}</ItemTitle>
            {notes ? <ItemDescription>{file.note}</ItemDescription> : null}
          </ItemContent>
        </Item>
      )}
    />
  )
}

function Demo() {
  const list = React.useRef<VirtualListActions>(null)
  const [query, setQuery] = React.useState("")
  const [found, setFound] = React.useState<boolean | null>(null)
  const [hidden, setHidden] = React.useState(false)
  const [notes, setNotes] = React.useState(true)
  const shown = React.useMemo(
    () => files.filter((file) => file.name.includes(query)),
    [query]
  )
  return (
    <div className="flex w-md max-w-full flex-col gap-3">
      <Input
        aria-label="Filter"
        placeholder="Filter"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setFound(list.current?.scrollToKey("file:5000") ?? null)
          }
        >
          Go to file 5000
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setFound(list.current?.scrollToKey("file:missing") ?? null)
          }
        >
          Go to a missing file
        </Button>
        <Button variant="outline" size="sm" onClick={() => setHidden(!hidden)}>
          {hidden ? "Show" : "Hide"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setNotes(!notes)}>
          {notes ? "Hide notes" : "Show notes"}
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {found === false ? "No such file." : ""}
      </p>
      <div hidden={hidden}>
        <Files items={shown} actionsRef={list} notes={notes} />
      </div>
    </div>
  )
}

const meta = {
  title: "Components/VirtualList",
  component: Demo,
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

const list = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>("[data-slot=virtual-list]")!
const rendered = (canvas: HTMLElement) => [
  ...list(canvas).querySelectorAll<HTMLElement>(
    "[data-slot=virtual-list-item]"
  ),
]

/** No two items overlap and none leaves a gap: each starts where the last ends. */
async function laidOut(canvas: HTMLElement) {
  await waitFor(() => {
    const rows = rendered(canvas).map((row) => row.getBoundingClientRect())
    expect(rows.length).toBeGreaterThan(1)
    for (let i = 1; i < rows.length; i++) {
      expect(Math.abs(rows[i]!.top - rows[i - 1]!.bottom)).toBeLessThan(1)
    }
  })
}

/** Which items are in view, by name. */
function inView(canvas: HTMLElement) {
  const view = list(canvas).getBoundingClientRect()
  return rendered(canvas)
    .filter((row) => {
      const box = row.getBoundingClientRect()
      return box.bottom > view.top && box.top < view.bottom
    })
    .map((row) => row.querySelector("[data-slot=item-title]")?.textContent)
}

/**
 * Ten thousand files of different heights; only those near the view are
 * rendered, measured as they render.
 */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await laidOut(canvasElement)
    await expect(rendered(canvasElement).length).toBeLessThan(40)
    await expect(canvas.getByRole("list", { name: "Files" })).toBeVisible()
    const first = canvas.getAllByRole("listitem")[0]!
    await expect(first).toHaveAttribute("aria-setsize", "10000")
    await expect(first).toHaveAttribute("aria-posinset", "1")

    list(canvasElement).scrollTop = 200_000
    await waitFor(() => expect(inView(canvasElement).length).toBeGreaterThan(2))
    await laidOut(canvasElement)
  },
}

/** An item that is not rendered can be scrolled to by its key. */
export const ScrollToKey: Story = {
  play: async ({ canvas, canvasElement }) => {
    await laidOut(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "Go to file 5000" })
    )
    await waitFor(() => expect(inView(canvasElement)).toContain("file-5000.ts"))
    await laidOut(canvasElement)

    await userEvent.click(
      canvas.getByRole("button", { name: "Go to a missing file" })
    )
    await expect(await canvas.findByText("No such file.")).toBeVisible()
  },
}

/**
 * Items are measured again when they change height: when their content
 * changes, or the font size (sizes are in rem).
 */
export const Remeasures: Story = {
  play: async ({ canvas, canvasElement }) => {
    const height = () =>
      rendered(canvasElement)[0]!.getBoundingClientRect().height
    await laidOut(canvasElement)
    const before = height()
    await userEvent.click(canvas.getByRole("button", { name: "Hide notes" }))
    await waitFor(() => expect(height()).toBeLessThan(before))
    await laidOut(canvasElement)

    const root = document.documentElement
    const small = height()
    root.style.fontSize = "20px"
    try {
      await waitFor(() => expect(height()).toBeGreaterThan(small))
      await laidOut(canvasElement)
    } finally {
      root.style.fontSize = ""
    }
  },
}

/** Hiding the list and showing it again keeps its heights and its place. */
export const HiddenThenShown: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Go to file 5000" })
    )
    await waitFor(() => expect(inView(canvasElement)).toContain("file-5000.ts"))
    await laidOut(canvasElement)
    const seen = inView(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Hide" }))
    await waitFor(() => expect(list(canvasElement)).not.toBeVisible())
    await userEvent.click(canvas.getByRole("button", { name: "Show" }))
    await waitFor(() => expect(inView(canvasElement)).toEqual(seen))
    await laidOut(canvasElement)
  },
}

/** When a filter removes items the view stays on items, not empty space. */
export const Filtered: Story = {
  play: async ({ canvas, canvasElement }) => {
    await laidOut(canvasElement)
    // Measuring the last items can make the list longer: scroll until
    // it is at the end.
    await waitFor(() => {
      list(canvasElement).scrollTop = list(canvasElement).scrollHeight
      expect(inView(canvasElement)).toContain("file-9999.ts")
    })

    await userEvent.type(canvas.getByRole("textbox", { name: "Filter" }), "99")
    await waitFor(() =>
      expect(inView(canvasElement).every((name) => name?.includes("99"))).toBe(
        true
      )
    )
    await waitFor(() => expect(inView(canvasElement).length).toBeGreaterThan(2))
    await laidOut(canvasElement)
    const view = list(canvasElement)
    await expect(view.scrollTop).toBeLessThanOrEqual(
      view.scrollHeight - view.clientHeight
    )
  },
}

const tiles = Array.from({ length: 500 }, (_, index) => `row:${index}`)

/** Rows 41.488px high at a root font size of 20.5714px: 41 rounded. */
function Tiles({ actionsRef }: { actionsRef: React.Ref<VirtualListActions> }) {
  return (
    <VirtualList
      role="list"
      aria-label="Rows"
      tabIndex={0}
      items={tiles}
      getKey={(row) => row}
      estimateSize={40}
      actionsRef={actionsRef}
      className="h-96 rounded-lg border px-2 pb-3"
      renderItem={(row) => (
        <div role="listitem" className="h-[2.0168rem] border-b p-2 text-sm">
          {row}
        </div>
      )}
    />
  )
}

/**
 * Heights that are not whole pixels add up exactly: an item scrolled to is
 * wholly in view, not cut off by the sum of rounded heights.
 */
export const FractionalHeights: Story = {
  render: function Render() {
    const list = React.useRef<VirtualListActions>(null)
    return (
      <div className="flex w-md max-w-full flex-col gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => list.current?.scrollToKey("row:480")}
        >
          Go to row 480
        </Button>
        <Tiles actionsRef={list} />
      </div>
    )
  },
  play: async ({ canvas, canvasElement }) => {
    const root = document.documentElement
    root.style.fontSize = "20.5714px"
    try {
      await laidOut(canvasElement)
      // Scroll through, so that the rows on the way are measured.
      for (let top = 0; top < 22_000; top += 300) {
        list(canvasElement).scrollTop = top
        await frames()
      }
      list(canvasElement).scrollTop = 0
      await userEvent.click(
        canvas.getByRole("button", { name: "Go to row 480" })
      )
      await waitFor(() => expect(canvas.getByText("row:480")).toBeVisible())
      // Once it has settled: it scrolls again as it measures.
      await settled(() => [
        list(canvasElement).scrollTop,
        canvas.getByText("row:480").getBoundingClientRect().top,
      ])
      {
        // Inside the borders, without rounding (clientHeight is rounded).
        const element = list(canvasElement)
        const box = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const top = box.top + parseFloat(style.borderTopWidth)
        const bottom = box.bottom - parseFloat(style.borderBottomWidth)
        const item = canvas.getByText("row:480").getBoundingClientRect()
        await expect(item.top).toBeGreaterThanOrEqual(top - 0.5)
        await expect(item.bottom).toBeLessThanOrEqual(bottom + 0.5)
        // At one edge, where it was scrolled to, within the pixel the
        // scroll position snaps to.
        await expect(
          Math.min(Math.abs(item.top - top), Math.abs(item.bottom - bottom))
        ).toBeLessThanOrEqual(1)
      }
    } finally {
      root.style.fontSize = ""
    }
  },
}
