"use client"

import * as React from "react"
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual"
import { cn } from "cn"

type VirtualListActions = {
  /**
   * Scrolls to the item with this key, mounted or not; false if no item
   * has it.
   */
  scrollToKey: (
    key: string,
    options?: { align?: "start" | "center" | "end" | "auto" }
  ) => boolean
  scrollToOffset: (offset: number) => void
}

type VirtualListProps<Item> = Omit<React.ComponentProps<"div">, "children"> & {
  items: readonly Item[]
  /** A stable key: measured heights and scrolling follow it. */
  getKey: (item: Item, index: number) => string
  renderItem: (item: Item, index: number) => React.ReactNode
  /** An item's height before it has been measured, in pixels. */
  estimateSize?: number
  /** How many items to render beyond each edge of the view. */
  overscan?: number
  actionsRef?: React.Ref<VirtualListActions>
}

function VirtualList<Item>({
  items,
  getKey,
  renderItem,
  estimateSize = 40,
  overscan = 8,
  actionsRef,
  className,
  ref,
  ...props
}: VirtualListProps<Item>) {
  // TanStack Virtual changes its instance in place, which the React
  // Compiler's memoization would not see.
  "use no memo"
  const viewport = React.useRef<HTMLDivElement | null>(null)
  // The latest getKey, so that one written inline does not change the item
  // keys on every render: the virtualizer lays out every item again when
  // they change, on each scroll.
  const latestGetKey = React.useRef(getKey)
  React.useLayoutEffect(() => {
    latestGetKey.current = getKey
  })
  const getItemKey = React.useCallback(
    (index: number) => {
      const item = items[index]
      return item === undefined ? index : latestGetKey.current(item, index)
    },
    [items]
  )
  // The list's own padding (its `className`'s), above and below its
  // items, which the virtualizer does not see: scrolled to from below, an
  // item is past the padding too, not under it. Read as it scrolls.
  const padding = React.useRef(0)
  // eslint-disable-next-line react-hooks/incompatible-library -- see "use no memo"
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => viewport.current,
    getItemKey,
    estimateSize: () => estimateSize,
    overscan,
    measureElement,
    scrollPaddingEnd: padding.current,
  })

  React.useImperativeHandle(
    actionsRef,
    () => ({
      scrollToKey: (key, options) => {
        const index = items.findIndex(
          (item, at) => latestGetKey.current(item, at) === key
        )
        if (index < 0) return false
        const element = viewport.current
        if (element) {
          const style = getComputedStyle(element)
          padding.current =
            parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
          virtualizer.options.scrollPaddingEnd = padding.current
        }
        virtualizer.scrollToIndex(index, { align: options?.align ?? "auto" })
        return true
      },
      scrollToOffset: (offset) => virtualizer.scrollToOffset(offset),
    }),
    [items, virtualizer]
  )

  const rows = virtualizer.getVirtualItems()

  return (
    <div
      data-slot="virtual-list"
      ref={(element) => {
        viewport.current = element
        if (typeof ref === "function") return ref(element)
        if (ref) ref.current = element
      }}
      className={cn("overflow-y-auto overscroll-contain", className)}
      {...props}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{ transform: `translateY(${rows[0]?.start ?? 0}px)` }}
        >
          {rows.map((row) => (
            <div
              key={row.key}
              data-slot="virtual-list-item"
              data-index={row.index}
              ref={virtualizer.measureElement}
            >
              {renderItem(items[row.index] as Item, row.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * An item's height, or the last one while it is hidden (an ancestor with
 * `display: none`): a hidden item is not 0 high, and taking 0 would lose
 * every height measured so far.
 */
function measureElement(
  element: Element,
  entry: ResizeObserverEntry | undefined,
  instance: Virtualizer<HTMLDivElement, Element>
) {
  const index = instance.indexFromElement(element)
  if (element.getClientRects().length === 0) {
    return (
      instance.measurementsCache[index]?.size ??
      instance.options.estimateSize(index)
    )
  }
  // Not rounded: the items are laid out one after another, so rounded
  // heights would add up to an error of pixels.
  const box = entry?.borderBoxSize[0]
  return box ? box.blockSize : element.getBoundingClientRect().height
}

export { VirtualList, type VirtualListActions, type VirtualListProps }
