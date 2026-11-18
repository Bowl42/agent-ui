import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { File01Icon } from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VirtualGrid, type VirtualGridActions } from "@/components/virtual-grid"
import { settled } from "@/stories/wait"

type Asset = {
  id: string
  name: string
  /** Width over height; unknown for a document. */
  aspect: number | undefined
}

const shapes = [1, 16 / 9, 3 / 4, 1 / 3, 2, undefined, 4 / 3, 9 / 16]

const assets = (count: number, from = 0): Asset[] =>
  Array.from({ length: count }, (_, at) => {
    const index = from + at
    return {
      id: `asset:${index}`,
      name: `asset-${index}.png`,
      aspect: shapes[index % shapes.length],
    }
  })

const picture = (asset: Asset) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(
      300 * (asset.aspect ?? 1)
    )}" height="300"><rect width="100%" height="100%" fill="hsl(${
      (Number(asset.id.split(":")[1]) * 47) % 360
    } 50% 75%)"/></svg>`
  )}`

// The caption under a picture: its height, with the card's padding.
const caption = 40

/** A card: the picture whole, at its shape; a document's, a fixed box. */
function Card({ asset }: { asset: Asset }) {
  return (
    <button
      type="button"
      data-asset={asset.id}
      className="flex w-full flex-col overflow-hidden rounded-lg border bg-card text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {asset.aspect ? (
        <img
          src={picture(asset)}
          alt=""
          className="w-full object-contain"
          style={{ aspectRatio: asset.aspect }}
        />
      ) : (
        <span className="flex h-24 items-center justify-center bg-muted">
          <HugeiconsIcon
            icon={File01Icon}
            strokeWidth={2}
            className="size-6 text-muted-foreground"
          />
        </span>
      )}
      <span className="truncate p-2 text-sm">{asset.name}</span>
    </button>
  )
}

function Demo({
  layout = "masonry",
  count = 2000,
  pageSize,
  onEndReached,
  initialWidth = 640,
}: {
  layout?: "grid" | "masonry"
  count?: number
  /** The grid's width at first, in pixels. */
  initialWidth?: number
  /** Loads more pages as the reader nears the end. */
  pageSize?: number
  onEndReached?: () => void
}) {
  const [items, setItems] = React.useState(() => assets(pageSize ?? count))
  const [filter, setFilter] = React.useState("")
  const [width, setWidth] = React.useState(initialWidth)
  const [hidden, setHidden] = React.useState(false)
  const grid = React.useRef<VirtualGridActions>(null)
  const shown = items.filter((asset) => asset.name.includes(filter))
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Filter"
          className="w-40"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <Button variant="outline" onClick={() => setWidth(320)}>
          Narrow
        </Button>
        <Button variant="outline" onClick={() => setWidth(640)}>
          Wide
        </Button>
        <Button variant="outline" onClick={() => setHidden(!hidden)}>
          {hidden ? "Show" : "Hide"}
        </Button>
        <Button
          variant="outline"
          onClick={() => grid.current?.focusKey("asset:1500")}
        >
          Go to 1500
        </Button>
      </div>
      <VirtualGrid
        role="list"
        aria-label="Assets"
        data-testid="grid"
        className="h-[28rem] rounded-lg border"
        style={{ width, display: hidden ? "none" : undefined }}
        layout={layout}
        items={shown}
        getKey={(asset) => asset.id}
        minItemWidth={140}
        gap={8}
        padding={8}
        estimateHeight={(asset, width) =>
          asset.aspect ? width / asset.aspect + caption : 96 + caption
        }
        actionsRef={grid}
        onEndReached={() => {
          onEndReached?.()
          if (pageSize)
            setItems((items) => [...items, ...assets(pageSize, items.length)])
        }}
        renderItem={(asset) => (
          <div role="listitem">
            <Card asset={asset} />
          </div>
        )}
      />
    </div>
  )
}

const meta = {
  title: "Components/Virtual Grid",
  component: Demo,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

const grid = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>("[data-slot=virtual-grid]")!
const cells = (canvasElement: HTMLElement) =>
  Array.from(
    canvasElement.querySelectorAll<HTMLElement>("[data-slot=virtual-grid-item]")
  )
const box = (element: Element) => element.getBoundingClientRect()

/** Once the items in view have been measured and laid out where they stay. */
const laidOut = (canvasElement: HTMLElement) =>
  settled(() => [
    grid(canvasElement).scrollTop,
    cells(canvasElement).map((cell) => {
      const { left, top, width, height } = box(cell)
      return [left, top, width, height]
    }),
  ])

/** The items' boxes in view do not overlap. */
async function noOverlap(canvasElement: HTMLElement) {
  const boxes = cells(canvasElement).map(box)
  for (const [at, a] of boxes.entries())
    for (const b of boxes.slice(at + 1)) {
      const apart =
        a.right <= b.left + 0.5 ||
        b.right <= a.left + 0.5 ||
        a.bottom <= b.top + 0.5 ||
        b.bottom <= a.top + 0.5
      await expect(apart).toBe(true)
    }
}

/**
 * Pictures of any shape, whole: each in the shortest column, as tall as
 * its shape. A document, of no known shape, has a box of its own. Few
 * of thousands are rendered.
 */
export const Masonry: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(4))
    await laidOut(canvasElement)
    const rendered = cells(canvasElement)
    await expect(rendered.length).toBeLessThan(100)
    // Four columns of the same width in 640 pixels.
    const lefts = new Set(rendered.map((cell) => Math.round(box(cell).left)))
    await expect(lefts.size).toBe(4)
    const widths = new Set(rendered.map((cell) => Math.round(box(cell).width)))
    await expect(widths.size).toBe(1)
    await noOverlap(canvasElement)
    // A tall picture (1:3) whole: three times as tall as wide.
    const tall = canvasElement.querySelector("[data-asset='asset:3'] img")!
    await expect(box(tall).height / box(tall).width).toBeCloseTo(3, 1)
    // Each starts below the last in its column.
    const byColumn = new Map<number, DOMRect[]>()
    for (const cell of rendered) {
      const rect = box(cell)
      byColumn.set(Math.round(rect.left), [
        ...(byColumn.get(Math.round(rect.left)) ?? []),
        rect,
      ])
    }
    for (const column of byColumn.values()) {
      column.sort((a, b) => a.top - b.top)
      for (const [at, rect] of column.slice(1).entries())
        await expect(rect.top - column[at]!.bottom).toBeCloseTo(8, 0)
    }
  },
}

/**
 * A grid: rows, each as tall as its tallest; the arrow keys go from item
 * to item by where they are, Home and End to the first and last.
 */
export const Grid: Story = {
  args: { layout: "grid", count: 200 },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(4))
    await laidOut(canvasElement)
    await noOverlap(canvasElement)
    const first = cells(canvasElement).slice(0, 4).map(box)
    await expect(new Set(first.map((rect) => Math.round(rect.top))).size).toBe(
      1
    )

    const card = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-asset='asset:${id}']`)!
    card("0").focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(card("1")).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    await expect(card("5")).toHaveFocus()
    await userEvent.keyboard("{ArrowLeft}")
    await expect(card("4")).toHaveFocus()
    await userEvent.keyboard("{ArrowUp}")
    await expect(card("0")).toHaveFocus()
    // Not past the first.
    await userEvent.keyboard("{ArrowUp}")
    await expect(card("0")).toHaveFocus()
    // To the last, far away: scrolled to and rendered, then focused.
    await userEvent.keyboard("{End}")
    await waitFor(() => expect(card("199")).toHaveFocus())
    await expect(box(card("199")).bottom).toBeLessThanOrEqual(
      box(grid(canvasElement)).bottom + 1
    )
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(card("0")).toHaveFocus())
    await expect(grid(canvasElement).scrollTop).toBe(0)
    void canvas
  },
}

/**
 * Columns on the 12-column grid: 782px inside the border and padding
 * fits five of 140px, so four (3 of 12 each), every one as wide.
 */
export const TwelveColumns: Story = {
  args: { layout: "grid", count: 40, initialWidth: 800 },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(4))
    await laidOut(canvasElement)
    const first = cells(canvasElement).map(box)
    const top = Math.round(first[0]!.top)
    const row = first.filter((rect) => Math.round(rect.top) === top)
    await expect(row.length).toBe(4)
    // (782 - 3 × 8) / 4
    for (const rect of row) await expect(rect.width).toBeCloseTo(189.5, 1)
  },
}

/** In masonry, up and down go along the item's column. */
export const MasonryKeys: Story = {
  args: { count: 200 },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(8))
    await laidOut(canvasElement)
    const card = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-asset='asset:${id}']`)!
    card("0").focus()
    const left = Math.round(box(card("0")).left)
    const top = box(card("0")).top
    await userEvent.keyboard("{ArrowDown}")
    const below = document.activeElement as HTMLElement
    await expect(Math.round(box(below).left)).toBe(left)
    await expect(box(below).top).toBeGreaterThan(top)
    await userEvent.keyboard("{ArrowUp}")
    await expect(card("0")).toHaveFocus()
  },
}

/** Narrower or wider, the columns change; a larger font, the heights. */
export const Relayout: Story = {
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(4))
    await laidOut(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Narrow" }))
    await waitFor(() =>
      expect(
        new Set(cells(canvasElement).map((cell) => Math.round(box(cell).left)))
          .size
      ).toBe(2)
    )
    await laidOut(canvasElement)
    await noOverlap(canvasElement)

    const root = document.documentElement
    const caption = () =>
      box(canvasElement.querySelector("[data-asset='asset:0'] span")!).height
    const before = caption()
    root.style.fontSize = "24px"
    try {
      await waitFor(() => expect(caption()).toBeGreaterThan(before))
      await laidOut(canvasElement)
      await noOverlap(canvasElement)
    } finally {
      root.style.fontSize = ""
    }
    await userEvent.click(canvas.getByRole("button", { name: "Wide" }))
    await waitFor(() =>
      expect(
        new Set(cells(canvasElement).map((cell) => Math.round(box(cell).left)))
          .size
      ).toBe(4)
    )
  },
}

/** Pages load as the reader nears the end, once for each. */
export const Pages: Story = {
  args: { pageSize: 60, onEndReached: fn() },
  play: async ({ args, canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(4))
    await laidOut(canvasElement)
    await expect(args.onEndReached).not.toHaveBeenCalled()
    const view = grid(canvasElement)
    view.scrollTop = view.scrollHeight
    await waitFor(() => expect(args.onEndReached).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-asset='asset:61']")
      ).not.toBeNull()
    )
    await laidOut(canvasElement)
    await expect(args.onEndReached).toHaveBeenCalledTimes(1)
  },
}

/**
 * Gone to by its key, far away, and focused; hidden and shown again, the
 * grid is where it was; filtered, it shows items, not empty space.
 */
export const KeysHidingFilters: Story = {
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(4))
    await userEvent.click(canvas.getByRole("button", { name: "Go to 1500" }))
    const card = () =>
      canvasElement.querySelector<HTMLElement>("[data-asset='asset:1500']")
    await waitFor(() => expect(card()).toHaveFocus())
    await laidOut(canvasElement)
    const view = grid(canvasElement)
    // Focused once: the reader goes elsewhere, and it stays there.
    const filter = canvas.getByRole("textbox", { name: "Filter" })
    filter.focus()
    view.scrollTop += 40
    await laidOut(canvasElement)
    await expect(filter).toHaveFocus()
    const top = view.scrollTop
    await expect(top).toBeGreaterThan(1000)
    const seen = cells(canvasElement).map((cell) => cell.dataset.key)

    await userEvent.click(canvas.getByRole("button", { name: "Hide" }))
    await waitFor(() => expect(view).not.toBeVisible())
    await userEvent.click(canvas.getByRole("button", { name: "Show" }))
    await waitFor(() => expect(view).toBeVisible())
    await laidOut(canvasElement)
    await expect(Math.abs(view.scrollTop - top)).toBeLessThan(2)
    await expect(cells(canvasElement).map((cell) => cell.dataset.key)).toEqual(
      seen
    )

    // Scrolled to the end, then filtered to a few.
    view.scrollTop = view.scrollHeight
    await laidOut(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Filter" }), "99")
    await waitFor(() =>
      expect(
        cells(canvasElement).every((cell) => cell.dataset.key?.includes("99"))
      ).toBe(true)
    )
    await laidOut(canvasElement)
    await expect(cells(canvasElement).length).toBeGreaterThan(4)
    const inView = cells(canvasElement).filter((cell) => {
      const rect = box(cell)
      const frame = box(view)
      return rect.bottom > frame.top && rect.top < frame.bottom
    })
    await expect(inView.length).toBeGreaterThan(0)
    void within
  },
}

/** Near the end, it asks once, however the reader scrolls there. */
export const EndOnce: Story = {
  args: { count: 120, onEndReached: fn() },
  play: async ({ args, canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(4))
    await laidOut(canvasElement)
    const view = grid(canvasElement)
    view.scrollTop = view.scrollHeight
    await waitFor(() => expect(args.onEndReached).toHaveBeenCalledTimes(1))
    // Away to the top, and back to the end.
    for (const at of [0, view.scrollHeight, 0, view.scrollHeight]) {
      view.scrollTop = at
      await laidOut(canvasElement)
    }
    await expect(args.onEndReached).toHaveBeenCalledTimes(1)
  },
}

/**
 * The first page loaded again, as many items: with a new `endKey`, it
 * asks again near the end; the place is kept.
 */
export const EndKey: Story = {
  render: function Render(args) {
    const [batch, setBatch] = React.useState(0)
    const [items] = React.useState(() => assets(120))
    return (
      <div className="flex flex-col gap-3">
        <Button variant="outline" onClick={() => setBatch(batch + 1)}>
          Reload
        </Button>
        <VirtualGrid
          data-testid="grid"
          className="h-[28rem] w-[640px] rounded-lg border"
          items={items}
          getKey={(asset) => asset.id}
          minItemWidth={140}
          endKey={batch}
          onEndReached={args.onEndReached}
          renderItem={(asset) => <Card asset={asset} />}
        />
      </div>
    )
  },
  args: { onEndReached: fn() },
  play: async ({ args, canvas, canvasElement }) => {
    await waitFor(() => expect(cells(canvasElement).length).toBeGreaterThan(4))
    await laidOut(canvasElement)
    const view = grid(canvasElement)
    view.scrollTop = view.scrollHeight
    await waitFor(() => expect(args.onEndReached).toHaveBeenCalledTimes(1))
    await laidOut(canvasElement)
    const top = view.scrollTop
    await userEvent.click(canvas.getByRole("button", { name: "Reload" }))
    await waitFor(() => expect(args.onEndReached).toHaveBeenCalledTimes(2))
    await expect(view.scrollTop).toBe(top)
    await laidOut(canvasElement)
    await expect(args.onEndReached).toHaveBeenCalledTimes(2)
  },
}

type Row = { heading: string } | Asset

/**
 * Items as wide as the grid on a row of their own, e.g. groups' headings:
 * each group starts a new row; the arrow keys pass the headings by.
 */
export const Headings: Story = {
  render: function Render() {
    const items: Row[] = [
      { heading: "Today" },
      ...assets(6),
      { heading: "Yesterday" },
      ...assets(5, 6),
    ]
    return (
      <VirtualGrid
        data-testid="grid"
        className="h-[28rem] w-[640px] rounded-lg border"
        layout="grid"
        items={items}
        getKey={(row) => ("heading" in row ? `h:${row.heading}` : row.id)}
        minItemWidth={140}
        gap={8}
        padding={8}
        fullWidth={(row) => "heading" in row}
        estimateHeight={(row, width) => ("heading" in row ? 28 : width)}
        renderItem={(row) =>
          "heading" in row ? (
            <h3 className="px-1 pt-2 text-sm font-medium">{row.heading}</h3>
          ) : (
            <Card asset={row} />
          )
        }
      />
    )
  },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvas.getByText("Yesterday")).toBeVisible())
    await laidOut(canvasElement)
    await noOverlap(canvasElement)
    const heading = canvas
      .getByText("Yesterday")
      .closest<HTMLElement>("[data-slot=virtual-grid-item]")!
    // As wide as the grid, inside its padding.
    await expect(box(heading).width).toBeCloseTo(
      box(grid(canvasElement)).width - 2 - 16,
      0
    )
    const card = (id: number) =>
      canvasElement.querySelector<HTMLElement>(`[data-asset='asset:${id}']`)!
    // A group starts a row: asset 6 at the left, below the heading.
    await expect(Math.round(box(card(6)).left)).toBe(
      Math.round(box(card(0)).left)
    )
    await expect(box(card(6)).top).toBeGreaterThan(box(heading).bottom - 1)

    card(4).focus()
    await userEvent.keyboard("{ArrowDown}")
    // Past the heading, to the nearest in the next row: asset 6 or 7.
    const below = document.activeElement as HTMLElement
    await expect(["asset:6", "asset:7"]).toContain(below.dataset.asset)
    await userEvent.keyboard("{ArrowUp}")
    await expect(document.activeElement).toBe(card(4))
    card(5).focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(card(6)).toHaveFocus()
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(card(0)).toHaveFocus())
    await userEvent.keyboard("{End}")
    await waitFor(() => expect(card(10)).toHaveFocus())
  },
}
