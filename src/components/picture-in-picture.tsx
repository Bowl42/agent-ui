"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowExpand01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** A corner of its place, by the reading direction: start is left in LTR. */
type PictureInPictureCorner =
  "top-start" | "top-end" | "bottom-start" | "bottom-end"

type PictureInPictureLabels = {
  expand: string
  close: string
  /** How to move it by keyboard, read with its name. */
  move: string
}

const defaultLabels: PictureInPictureLabels = {
  expand: "Expand",
  close: "Close",
  move: "Arrow keys move it to another corner.",
}

/** Past this, a press is a drag, not a tap or a click. */
const dragFrom = 4

/** How far ahead a flick is thrown, in ms of its speed. */
const throwAhead = 120

/**
 * Its entry's zoom done: an animation of its transform would hold it
 * where it is, over a drag's.
 */
const entered = (element: HTMLElement) => {
  for (const animation of element.getAnimations())
    if (animation.effect?.getComputedTiming().activeDuration !== Infinity)
      animation.finish()
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * What a press on starts no drag: its own buttons, its badge, and what
 * the app marks `data-no-drag`. Its content's buttons drag it, and are
 * pressed by a tap.
 */
const control =
  "[data-slot=picture-in-picture-bar] button, [data-slot=picture-in-picture-badge], [data-no-drag]"

/**
 * A small window floating in a corner of its place (the nearest
 * positioned ancestor, e.g. the main area): what an agent has open, say,
 * while the conversation goes on. Dragged by any part but its buttons,
 * it lands in the corner it is let go nearest, or thrown towards; a tap
 * is not a drag, so its content can still be pressed. Focused, the arrow
 * keys move it to another corner. Its bar has its title, an "Expand"
 * button (`onExpand`: e.g. into the side panel, the app then not
 * rendering it) and a "Close" button (`onClose`). The app renders it
 * while it shows, and its `badge` (e.g. how many pages, a button that
 * goes through them) on its corner and `attention` (e.g. "Sign in to
 * continue") under its content, a strip it cannot be missed by, read
 * out as it comes. It keeps 16px (`inset`) from its place's edges and
 * the screen's safe areas.
 */
function PictureInPicture({
  title,
  icon,
  badge,
  attention,
  corner: cornerProp,
  defaultCorner = "bottom-end",
  onCornerChange,
  onExpand,
  onClose,
  inset = 16,
  aspectRatio = 16 / 10,
  labels: labelsProp,
  className,
  style,
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  /** Its name, in its bar: e.g. the page's title. */
  title: React.ReactNode
  /** Before its title: e.g. the page's favicon. */
  icon?: React.ReactNode
  /** On its top start corner, the app's: e.g. a count that is a button. */
  badge?: React.ReactNode
  /** Under its content, the app's call for the reader: e.g. to sign in. */
  attention?: React.ReactNode
  corner?: PictureInPictureCorner
  defaultCorner?: PictureInPictureCorner
  onCornerChange?: (corner: PictureInPictureCorner) => void
  /** Its "Expand" button: none without. */
  onExpand?: () => void
  /** Its "Close" button: none without. */
  onClose?: () => void
  /** Its distance from its place's edges, in px. */
  inset?: number
  /** Its content's width to its height. */
  aspectRatio?: number
  labels?: Partial<PictureInPictureLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [own, setOwn] = React.useState(defaultCorner)
  const corner = cornerProp ?? own
  const root = React.useRef<HTMLElement>(null)
  const id = React.useId()
  const describedBy = `${id}-move`
  const labelledBy = `${id}-title`
  const drag = React.useRef<{
    id: number
    x: number
    y: number
    moved: boolean
    time: number
    vx: number
    vy: number
    lastX: number
    lastY: number
  } | null>(null)
  // Where it was seen as it left for another corner: from there to it.
  const from = React.useRef<DOMRect | null>(null)

  /** From where it shows (`rect`) to its place, the transform let go. */
  const settle = React.useCallback((rect: DOMRect) => {
    const element = root.current
    if (!element) return
    entered(element)
    element.style.transition = "none"
    element.style.transform = ""
    const to = element.getBoundingClientRect()
    if (reducedMotion()) {
      element.style.transition = ""
      return
    }
    element.style.transform = `translate(${rect.left - to.left}px, ${rect.top - to.top}px)`
    // Seen there before it goes.
    void element.offsetWidth
    element.style.transition = "transform var(--motion-slide) var(--ease-slide)"
    element.style.transform = ""
    const done = () => {
      element.style.transition = ""
      element.removeEventListener("transitionend", done)
    }
    element.addEventListener("transitionend", done)
  }, [])

  React.useLayoutEffect(() => {
    const rect = from.current
    from.current = null
    if (rect) settle(rect)
  }, [corner, settle])

  const move = (next: PictureInPictureCorner) => {
    const element = root.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (next === corner) {
      settle(rect)
      return
    }
    from.current = rect
    if (cornerProp === undefined) setOwn(next)
    onCornerChange?.(next)
    // Kept where it is, if the app keeps its corner.
    requestAnimationFrame(() => {
      if (from.current) {
        const rect = from.current
        from.current = null
        settle(rect)
      }
    })
  }

  const [vertical, horizontal] = corner.split("-") as [
    "top" | "bottom",
    "start" | "end",
  ]
  const edge = (side: string) =>
    `max(${inset}px, env(safe-area-inset-${side}, 0px))`

  return (
    <section
      ref={root}
      data-slot="picture-in-picture"
      data-corner={corner}
      data-attention={attention ? "" : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      tabIndex={0}
      className={cn(
        // Over what it floats on, as a menu is: raised, on the page's
        // colour (a step lighter in dark).
        "group/pip absolute z-20 flex w-80 cursor-grab touch-none flex-col rounded-xl bg-background text-foreground shadow-float ring-1 ring-foreground/10 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing max-sm:w-48 dark:bg-muted",
        "animate-in motion-pop fade-in-0 zoom-in-95",
        // Calling for the reader: a ring as strong as the text.
        "data-attention:ring-2 data-attention:ring-foreground",
        className
      )}
      style={{
        [vertical]: edge(vertical),
        [horizontal === "start" ? "insetInlineStart" : "insetInlineEnd"]: edge(
          horizontal === "start" ? "left" : "right"
        ),
        ...style,
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        if (event.defaultPrevented || event.button !== 0) return
        const target = event.target as Element
        if (target.closest(control)) return
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          moved: false,
          time: event.timeStamp,
          vx: 0,
          vy: 0,
          lastX: event.clientX,
          lastY: event.clientY,
        }
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event)
        const state = drag.current
        if (!state || state.id !== event.pointerId) return
        const dx = event.clientX - state.x
        const dy = event.clientY - state.y
        if (!state.moved) {
          if (Math.hypot(dx, dy) < dragFrom) return
          state.moved = true
          entered(event.currentTarget)
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // Not the browser's pointer, e.g. a script's event.
          }
          event.currentTarget.dataset.dragging = ""
        }
        // Over a frame at least: events in a burst are not a flick.
        const elapsed = Math.max(16, event.timeStamp - state.time)
        state.vx = (event.clientX - state.lastX) / elapsed
        state.vy = (event.clientY - state.lastY) / elapsed
        state.lastX = event.clientX
        state.lastY = event.clientY
        state.time = event.timeStamp
        const element = event.currentTarget
        element.style.transition = "none"
        element.style.transform = `translate(${dx}px, ${dy}px)`
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event)
        const state = drag.current
        drag.current = null
        if (!state?.moved || state.id !== event.pointerId) return
        const element = event.currentTarget
        delete element.dataset.dragging
        // The click that ends a drag is not one on its content; none
        // comes after a touch's, so none is held for later.
        const swallow = (click: MouseEvent) => {
          click.preventDefault()
          click.stopPropagation()
        }
        element.addEventListener("click", swallow, {
          capture: true,
          once: true,
        })
        setTimeout(() =>
          element.removeEventListener("click", swallow, { capture: true })
        )
        const place = (
          element.offsetParent ?? document.body
        ).getBoundingClientRect()
        const rect = element.getBoundingClientRect()
        // Thrown: where it was going, at most a few px a ms.
        const speed = (v: number) => Math.max(-3, Math.min(3, v))
        const x = rect.left + rect.width / 2 + speed(state.vx) * throwAhead
        const y = rect.top + rect.height / 2 + speed(state.vy) * throwAhead
        const left = x < place.left + place.width / 2
        const rtl = getComputedStyle(element).direction === "rtl"
        move(
          `${y < place.top + place.height / 2 ? "top" : "bottom"}-${
            left !== rtl ? "start" : "end"
          }` as PictureInPictureCorner
        )
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event)
        const state = drag.current
        drag.current = null
        if (!state?.moved) return
        delete event.currentTarget.dataset.dragging
        settle(event.currentTarget.getBoundingClientRect())
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || event.target !== event.currentTarget)
          return
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
        const to = {
          ArrowUp: ["top", horizontal],
          ArrowDown: ["bottom", horizontal],
          ArrowLeft: [vertical, rtl ? "end" : "start"],
          ArrowRight: [vertical, rtl ? "start" : "end"],
        }[event.key]
        if (!to) return
        event.preventDefault()
        move(to.join("-") as PictureInPictureCorner)
      }}
      {...props}
    >
      <span id={describedBy} className="sr-only">
        {labels.move}
      </span>
      {badge && (
        <div
          data-slot="picture-in-picture-badge"
          className="absolute -start-2 -top-2 z-10 cursor-default"
        >
          {badge}
        </div>
      )}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl">
        <div
          data-slot="picture-in-picture-bar"
          className="flex h-9 shrink-0 items-center gap-2 ps-3 pe-1 text-2sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
        >
          {icon}
          <span id={labelledBy} className="min-w-0 flex-1 truncate font-medium">
            {title}
          </span>
          {onExpand && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.expand}
                    className="touch-target relative text-muted-foreground"
                    onClick={onExpand}
                  />
                }
              >
                <HugeiconsIcon icon={ArrowExpand01Icon} strokeWidth={2} />
              </TooltipTrigger>
              <TooltipContent>{labels.expand}</TooltipContent>
            </Tooltip>
          )}
          {onClose && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.close}
                    className="touch-target relative text-muted-foreground"
                    onClick={onClose}
                  />
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </TooltipTrigger>
              <TooltipContent>{labels.close}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div
          data-slot="picture-in-picture-content"
          className="relative min-h-0 overflow-hidden bg-muted dark:bg-background"
          style={{ aspectRatio }}
        >
          {children}
        </div>
        {attention && (
          <div
            data-slot="picture-in-picture-attention"
            role="status"
            className="flex items-center gap-2 bg-foreground px-3 py-2 text-xs text-background [&>svg]:size-4 [&>svg]:shrink-0"
          >
            <HugeiconsIcon
              icon={Alert02Icon}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">{attention}</span>
          </div>
        )}
      </div>
    </section>
  )
}

export {
  PictureInPicture,
  type PictureInPictureCorner,
  type PictureInPictureLabels,
}
