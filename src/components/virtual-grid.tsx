"use client"

import * as React from "react"
import { cn } from "cn"

type VirtualGridActions = {
  /**
   * Scrolls to the item with this key, mounted or not; false if no item
   * has it.
   */
  scrollToKey: (
    key: string,
    options?: { align?: "start" | "center" | "end" | "auto" }
  ) => boolean
  /** Scrolls to the item and focuses it (its first control, or it). */
  focusKey: (key: string) => boolean
  scrollToOffset: (offset: number) => void
}

/**
 * As many columns as fit, down to one that divides 12 (docs/grid.md):
 * tiles of 6, 4 or 3 of a pane's 12 columns, not 5 across or 7. More
 * than 12, as many as fit.
 */
function onTwelve(fit: number) {
  if (fit > 12) return fit
  return [12, 6, 4, 3, 2, 1].find((columns) => columns <= fit)!
}

type VirtualGridProps<Item> = Omit<React.ComponentProps<"div">, "children"> & {
  items: readonly Item[]
  /** A stable key: measured heights, scrolling and focus follow it. */
  getKey: (item: Item, index: number) => string
  renderItem: (item: Item, index: number) => React.ReactNode
  /**
   * `grid`: rows, each as tall as its tallest item. `masonry`: each item
   * in the shortest column, as tall as it is: images of any shape whole.
   */
  layout?: "grid" | "masonry"
  /**
   * The narrowest an item may be: as many columns as fit, stretched; up
   * to 12, as many as divide 12 (2, 3, 4, 6 or 12).
   */
  minItemWidth?: number
  /** Between items, in pixels. */
  gap?: number
  /** Around them, in pixels. */
  padding?: number
  /**
   * An item's height at a width, before it is measured: e.g. an image's
   * from its aspect ratio, plus its caption. By default, square.
   */
  estimateHeight?: (item: Item, width: number) => number
  /**
   * Items as wide as the grid, on a row of their own, e.g. a group's
   * heading; the arrow keys pass them by.
   */
  fullWidth?: (item: Item, index: number) => boolean
  /** Items the arrow keys pass by, e.g. disabled ones; shown as the rest. */
  skip?: ((item: Item, index: number) => boolean) | undefined
  /** How far beyond the view to render items, in pixels. */
  overscan?: number
  /**
   * Called once for each length of `items` when the reader nears its end
   * (`endThreshold` items): e.g. to load the next page.
   */
  onEndReached?: () => void
  endThreshold?: number
  /**
   * The batch the items are: changed, e.g. the first page loaded again,
   * it asks again near the end even at the same length. Heights and the
   * place are kept.
   */
  endKey?: unknown
  /**
   * The item in view as it first lays out, in the middle where it can
   * be: e.g. the one picked in another view before this one.
   */
  initialKey?: string | null | undefined
  actionsRef?: React.Ref<VirtualGridActions>
}

type Rect = { x: number; y: number; width: number; height: number }

/**
 * Items in columns, too many to render all: those near the view, laid out
 * in as many columns as fit, and a space for the rest. Heights are
 * measured (fractions too) and laid out again as they change: a width, a
 * font size, an image loaded. The arrow keys move the focus from item to
 * item, by where they are.
 */
function VirtualGrid<Item>({
  items,
  getKey,
  renderItem,
  layout = "grid",
  minItemWidth = 160,
  gap = 8,
  padding = 0,
  estimateHeight,
  fullWidth,
  skip,
  overscan = 400,
  onEndReached,
  endThreshold = 20,
  endKey,
  initialKey,
  actionsRef,
  className,
  onKeyDown,
  onScroll,
  ref,
  ...props
}: VirtualGridProps<Item>) {
  const viewport = React.useRef<HTMLDivElement | null>(null)
  const [view, setView] = React.useState({ width: 0, height: 0 })
  const [scrollTop, setScrollTop] = React.useState(0)
  // Heights measured, by key; a version to lay out again when one changes.
  const [heights] = React.useState(() => new Map<string, number>())
  const [version, setVersion] = React.useState(0)
  const pendingFocus = React.useRef<string | null>(null)

  const available = Math.max(0, view.width - padding * 2)
  const columns = onTwelve(
    Math.max(1, Math.floor((available + gap) / (minItemWidth + gap)))
  )
  const itemWidth = Math.max(0, (available - gap * (columns - 1)) / columns)

  const keys = items.map((item, index) => getKey(item, index))
  const estimate = (index: number) =>
    estimateHeight?.(items[index]!, itemWidth) ?? itemWidth
  const sizeOf = (index: number) => heights.get(keys[index]!) ?? estimate(index)

  // Where each item goes. Its top never comes before the one's before it:
  // the shortest column's bottom only grows; rows go down.
  const rects: Rect[] = []
  let total = padding
  let tallest = 0
  if (view.width > 0) {
    // An item as wide as the grid, e.g. a group's heading: below all.
    const full = (index: number) => fullWidth?.(items[index]!, index) ?? false
    const wide = (index: number, y: number) => {
      const height =
        heights.get(keys[index]!) ??
        estimateHeight?.(items[index]!, available) ??
        32
      rects.push({ x: padding, y, width: available, height })
      tallest = Math.max(tallest, height)
      return y + height + gap
    }
    if (layout === "masonry") {
      const bottoms = new Array<number>(columns).fill(padding)
      for (let index = 0; index < items.length; index++) {
        if (full(index)) {
          bottoms.fill(wide(index, Math.max(...bottoms)))
          continue
        }
        let column = 0
        for (let at = 1; at < columns; at++)
          if (bottoms[at]! < bottoms[column]!) column = at
        const height = sizeOf(index)
        rects.push({
          x: padding + column * (itemWidth + gap),
          y: bottoms[column]!,
          width: itemWidth,
          height,
        })
        bottoms[column] = bottoms[column]! + height + gap
        tallest = Math.max(tallest, height)
      }
      total =
        (items.length > 0 ? Math.max(...bottoms) - gap : padding) + padding
    } else {
      let top = padding
      let index = 0
      while (index < items.length) {
        if (full(index)) {
          top = wide(index, top)
          index++
          continue
        }
        // A row: up to the columns, or the next wide item.
        let last = index
        while (last < items.length && last - index < columns && !full(last))
          last++
        let height = 0
        for (let at = index; at < last; at++)
          height = Math.max(height, sizeOf(at))
        for (let at = index; at < last; at++)
          rects.push({
            x: padding + (at - index) * (itemWidth + gap),
            y: top,
            width: itemWidth,
            height,
          })
        top += height + gap
        tallest = Math.max(tallest, height)
        index = last
      }
      total = (items.length > 0 ? top - gap : padding) + padding
    }
  }
  void version

  // The items near the view: by their tops, which only grow.
  const top = scrollTop - overscan
  const bottom = scrollTop + view.height + overscan
  let first = lowerBound(rects, top - tallest)
  while (first < rects.length && rects[first]!.y + rects[first]!.height < top)
    first++
  const shown: number[] = []
  for (let index = first; index < rects.length; index++) {
    const rect = rects[index]!
    if (rect.y > bottom) break
    if (rect.y + rect.height >= top) shown.push(index)
  }
  const lastShown = shown.at(-1) ?? -1

  // Measures items as they change size; not while hidden (no boxes), so
  // a hidden grid keeps its heights.
  const [observer] = React.useState(() =>
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((entries) => {
          let changed = false
          for (const entry of entries) {
            const element = entry.target as HTMLElement
            if (element.getClientRects().length === 0) continue
            const key = element.dataset.key!
            const height =
              entry.borderBoxSize[0]?.blockSize ??
              element.getBoundingClientRect().height
            if (Math.abs((heights.get(key) ?? -1) - height) > 0.01) {
              heights.set(key, height)
              changed = true
            }
          }
          if (changed) setVersion((version) => version + 1)
        })
  )
  React.useEffect(() => () => observer?.disconnect(), [observer])

  // The view's size; none while hidden, so the layout is kept.
  React.useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () => {
      if (element.getClientRects().length === 0) return
      setView((view) => {
        const next = {
          width: element.clientWidth,
          height: element.clientHeight,
        }
        return view.width === next.width && view.height === next.height
          ? view
          : next
      })
      setScrollTop(element.scrollTop)
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(element)
    return () => resize.disconnect()
  }, [])

  // Shorter, e.g. filtered, it is scrolled no further than its end.
  React.useLayoutEffect(() => {
    const element = viewport.current
    if (!element || element.getClientRects().length === 0) return
    setScrollTop(element.scrollTop)
  }, [total])

  // Asked for this length of this batch already.
  const ask = React.useRef<{ length: number; key: unknown }>(null)
  const endReached = React.useEffectEvent(() => onEndReached?.())
  React.useEffect(() => {
    if (lastShown < 0 || items.length - 1 - lastShown > endThreshold) return
    if (
      ask.current?.length === items.length &&
      Object.is(ask.current.key, endKey)
    )
      return
    ask.current = { length: items.length, key: endKey }
    endReached()
  }, [lastShown, items.length, endThreshold, endKey])

  function scrollTo(index: number, align: "start" | "center" | "end" | "auto") {
    const element = viewport.current
    const rect = rects[index]
    if (!element || !rect) return
    const height = element.clientHeight
    const start = rect.y - padding
    const end = rect.y + rect.height + padding - height
    const target =
      align === "start"
        ? start
        : align === "end"
          ? end
          : align === "center"
            ? rect.y + rect.height / 2 - height / 2
            : element.scrollTop > start
              ? start
              : element.scrollTop < end
                ? end
                : element.scrollTop
    element.scrollTop = Math.max(0, target)
    setScrollTop(element.scrollTop)
  }

  function focus(key: string) {
    const index = keys.indexOf(key)
    if (index < 0) return false
    pendingFocus.current = key
    scrollTo(index, "auto")
    setVersion((version) => version + 1)
    return true
  }

  // Focuses an item asked for once it is rendered.
  React.useLayoutEffect(() => {
    const key = pendingFocus.current
    if (key === null) return
    const cell = Array.from(
      viewport.current?.querySelectorAll<HTMLElement>(
        "[data-slot=virtual-grid-item]"
      ) ?? []
    ).find((cell) => cell.dataset.key === key)
    if (!cell) return
    pendingFocus.current = null
    // Its first control; or, where only one item is in the tab order
    // (the others tabIndex -1), its focusable element.
    const control =
      cell.querySelector<HTMLElement>(focusable) ??
      cell.querySelector<HTMLElement>("[tabindex]")
    ;(control ?? cell).focus({ preventScroll: true })
  })

  // Its first layout, once it has a width: `initialKey` brought into view.
  const laidOut = React.useRef(false)
  React.useLayoutEffect(() => {
    if (laidOut.current || view.width === 0) return
    laidOut.current = true
    const index = initialKey == null ? -1 : keys.indexOf(initialKey)
    if (index >= 0) scrollTo(index, "center")
  })

  React.useImperativeHandle(actionsRef, () => ({
    scrollToKey: (key, options) => {
      const index = keys.indexOf(key)
      if (index < 0) return false
      scrollTo(index, options?.align ?? "auto")
      return true
    },
    focusKey: focus,
    scrollToOffset: (offset) => {
      const element = viewport.current
      if (!element) return
      element.scrollTop = offset
      setScrollTop(element.scrollTop)
    },
  }))

  /** The item the arrow key goes to from `index`, by where they are. */
  function next(index: number, key: string, rtl: boolean) {
    const rect = rects[index]!
    // Not to a wide item: a heading is not one to pick.
    const navigable = rects
      .map((_, at) => at)
      .filter(
        (at) =>
          !(fullWidth?.(items[at]!, at) ?? false) &&
          !(skip?.(items[at]!, at) ?? false)
      )
    if (key === "Home") return navigable[0] ?? -1
    if (key === "End") return navigable.at(-1) ?? -1
    const place = navigable.indexOf(index)
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const step = (key === "ArrowRight") !== rtl ? 1 : -1
      return navigable[place + step] ?? -1
    }
    const down = key === "ArrowDown"
    if (layout === "masonry") {
      // The next in its column, up or down.
      const column = (each: Rect) => Math.abs(each.x - rect.x) < 0.5
      const order = down
        ? navigable.slice(place + 1)
        : navigable.slice(0, place).reverse()
      return order.find((at) => column(rects[at]!)) ?? -1
    }
    // A grid: the nearest in the next row, past any heading.
    const order = down
      ? navigable.slice(place + 1)
      : navigable.slice(0, place).reverse()
    const row = order.find((at) => rects[at]!.y !== rect.y)
    if (row === undefined) return -1
    const y = rects[row]!.y
    let best = row
    for (const at of order) {
      if (rects[at]!.y !== y) continue
      if (Math.abs(rects[at]!.x - rect.x) < Math.abs(rects[best]!.x - rect.x))
        best = at
    }
    return best
  }

  return (
    <div
      data-slot="virtual-grid"
      data-layout={layout}
      ref={(element) => {
        viewport.current = element
        if (typeof ref === "function") return ref(element)
        if (ref) ref.current = element
      }}
      className={cn("overflow-y-auto overscroll-contain", className)}
      onScroll={(event) => {
        onScroll?.(event)
        const element = event.currentTarget
        if (element.getClientRects().length === 0) return
        setScrollTop(element.scrollTop)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (
          ![
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(event.key) ||
          event.altKey ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey
        )
          return
        const target = event.target as HTMLElement
        // Not where the key is the control's: a text field, a slider.
        if (
          target.closest(
            "input, textarea, select, [contenteditable=true], [role=slider]"
          )
        )
          return
        const cell = target.closest<HTMLElement>(
          "[data-slot=virtual-grid-item]"
        )
        if (!cell || !event.currentTarget.contains(cell)) return
        const index = keys.indexOf(cell.dataset.key!)
        if (index < 0) return
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
        const to = next(index, event.key, rtl)
        if (to < 0 || to >= items.length || to === index) return
        event.preventDefault()
        focus(keys[to]!)
      }}
      {...props}
    >
      <div className="relative w-full" style={{ height: total }}>
        {shown.map((index) => {
          const rect = rects[index]!
          const key = keys[index]!
          return (
            <div
              key={key}
              data-slot="virtual-grid-item"
              data-index={index}
              data-key={key}
              ref={(element) => {
                if (!element || !observer) return
                observer.observe(element)
                return () => observer.unobserve(element)
              }}
              className="absolute start-0 top-0 outline-none"
              style={{
                width: rect.width,
                // Its row's height in a grid; its own in masonry.
                ...(layout === "grid" ? { minHeight: rect.height } : {}),
                transform: `translate(${rect.x}px, ${rect.y}px)`,
              }}
            >
              {renderItem(items[index]!, index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const focusable =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

/** The first rect whose top is at `target` or below. */
function lowerBound(rects: Rect[], target: number) {
  let low = 0
  let high = rects.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (rects[middle]!.y < target) low = middle + 1
    else high = middle
  }
  return low
}

export { VirtualGrid, type VirtualGridActions, type VirtualGridProps }
