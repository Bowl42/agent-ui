"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons"

type ComparedImage = {
  src: string
  /** What it shows, for those who do not see it. */
  alt: string
}

type ImageComparisonLabels = {
  before: string
  after: string
  /** The line between them, a slider. */
  divider: string
  /** Where the line is, for a screen reader: "40%", from 0 to 100. */
  position: (percent: number) => string
}

// In the reader's language's way: "40%", "40 %", "%40".
const percentFormat = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 0,
})

const defaultLabels: ImageComparisonLabels = {
  before: "Before",
  after: "After",
  divider: "Before and after",
  position: (percent) => percentFormat.format(percent / 100),
}

const clamp = (value: number) => Math.min(100, Math.max(0, value))

// A finger's move sideways less than this may be the start of a scroll.
const slop = 4

/**
 * Two images over each other, e.g. before and after an edit, a line
 * between them dragged to see what changed: the one before on its left,
 * the one after on its right. Each fits the frame at its own shape, not
 * stretched; the line, its grip and the labels are on the images, not on
 * the frame around them. The line is a slider: the arrow keys move it 5%,
 * Home and End to either side. A finger moves it sideways or by a tap;
 * swiped up or down, the page scrolls.
 */
function ImageComparison({
  before,
  after,
  crossOrigin,
  position: positionProp,
  defaultPosition = 50,
  onPositionChange,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  before: ComparedImage
  after: ComparedImage
  crossOrigin?: "anonymous" | "use-credentials" | undefined
  /** Where the line is, from the left, in percent; the app's to keep. */
  position?: number
  defaultPosition?: number
  onPositionChange?: (position: number) => void
  labels?: Partial<ImageComparisonLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [own, setOwn] = React.useState(defaultPosition)
  const position = clamp(positionProp ?? own)
  const set = (next: number) => {
    const value = clamp(next)
    // Kept here too; where the app keeps it, its own shows.
    setOwn(value)
    onPositionChange?.(value)
  }
  // Where a finger went down, until it moves sideways (or lifts).
  const finger = React.useRef<{ x: number; y: number } | null>(null)
  const follow = (event: React.PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    set(((event.clientX - box.left) / box.width) * 100)
  }
  // Each image's width over its height, once loaded, by its address.
  const [ratios, setRatios] = React.useState<Record<string, number>>({})
  const measure = (image: HTMLImageElement | null) => {
    if (!image?.complete) return
    const { naturalWidth: width, naturalHeight: height } = image
    // An SVG with only a viewBox has no shape of its own: the frame's.
    if (!width || !height) return
    const src = image.getAttribute("src")!
    setRatios((ratios) =>
      ratios[src] === width / height
        ? ratios
        : { ...ratios, [src]: width / height }
    )
  }
  const shapes = [ratios[before.src], ratios[after.src]]
  // Where the images are: the box both fit in, each at its own shape (as
  // wide as the wider, as tall as the taller), in the frame's size.
  const stage =
    shapes[0] && shapes[1]
      ? {
          width: `min(100cqw, 100cqh * ${Math.max(shapes[0], shapes[1])})`,
          height: `min(100cqh, 100cqw / ${Math.min(shapes[0], shapes[1])})`,
        }
      : undefined
  const image = "absolute inset-0 size-full rounded-md object-contain"

  return (
    <div
      data-slot="image-comparison"
      className={cn(
        "[container-type:size] relative flex h-full min-h-32 w-full items-center justify-center overflow-hidden p-3 select-none",
        className
      )}
      {...props}
    >
      <div
        data-slot="image-comparison-images"
        className={cn("relative", !stage && "size-full")}
        style={stage}
      >
        <img
          src={after.src}
          alt={after.alt}
          draggable={false}
          {...(crossOrigin ? { crossOrigin } : {})}
          className={image}
          ref={measure}
          onLoad={(event) => measure(event.currentTarget)}
        />
        <img
          src={before.src}
          alt={before.alt}
          draggable={false}
          {...(crossOrigin ? { crossOrigin } : {})}
          className={image}
          ref={measure}
          onLoad={(event) => measure(event.currentTarget)}
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <ComparisonLabel className="left-2">{labels.before}</ComparisonLabel>
        <ComparisonLabel className="right-2">{labels.after}</ComparisonLabel>
        {/* Before is on the left in any language, as the images are. Over
          them, the slider: dragged anywhere, or by keys. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={labels.divider}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          aria-valuetext={labels.position(Math.round(position))}
          data-slot="image-comparison-divider"
          // Over the images, a finger's vertical swipe scrolls the page,
          // as the browser's; a sideways one moves the line.
          className="group/divider absolute inset-0 cursor-col-resize touch-pan-y outline-none"
          onPointerDown={(event) => {
            if (event.button !== 0) return
            if (event.pointerType === "touch") {
              // Not yet: it may be the page's scroll.
              finger.current = { x: event.clientX, y: event.clientY }
              return
            }
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              // Not a pointer of the browser's.
            }
            follow(event)
          }}
          onPointerMove={(event) => {
            if (event.buttons === 0) return
            const from = finger.current
            if (event.pointerType === "touch" && from) {
              const dx = Math.abs(event.clientX - from.x)
              const dy = Math.abs(event.clientY - from.y)
              if (dx < slop || dx <= dy) return
              finger.current = null
            }
            follow(event)
          }}
          onPointerUp={(event) => {
            // A tap puts it there.
            if (finger.current) follow(event)
            finger.current = null
          }}
          onPointerCancel={() => {
            finger.current = null
          }}
          onKeyDown={(event) => {
            const next =
              event.key === "ArrowLeft" || event.key === "ArrowDown"
                ? position - 5
                : event.key === "ArrowRight" || event.key === "ArrowUp"
                  ? position + 5
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 100
                      : undefined
            if (next === undefined) return
            event.preventDefault()
            set(next)
          }}
        >
          {/* The page colour follows the theme; a hairline keeps the
              line distinct from images in either theme. */}
          <span
            aria-hidden="true"
            data-slot="image-comparison-line"
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-background ring-1 ring-foreground/10"
            style={{ left: `${position}%` }}
          >
            {/* A grip, to show it can be dragged; ringed when focused. */}
            <span
              data-slot="image-comparison-handle"
              className="absolute top-1/2 left-1/2 flex size-7 -translate-1/2 items-center justify-center rounded-full bg-background text-muted-foreground shadow-float group-focus-visible/divider:ring-3 group-focus-visible/divider:ring-ring/50"
            >
              <HugeiconsIcon
                icon={DragDropVerticalIcon}
                strokeWidth={2}
                className="size-3.5"
              />
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * "Before", "After", on the images: white on a translucent ink in any
 * theme, as the images are the same in both.
 */
function ComparisonLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="image-comparison-label"
      className={cn(
        "pointer-events-none absolute top-2 rounded-sm bg-neutral-900/60 px-2 text-xs/5 font-medium text-white",
        className
      )}
      {...props}
    />
  )
}

export { ImageComparison, type ComparedImage, type ImageComparisonLabels }
