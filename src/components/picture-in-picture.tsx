"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowExpand01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  MinusSignIcon,
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

/** Its two forms: a card with a preview, or a pill of one line. */
type PictureInPictureForm = "card" | "pill"

/** One thing it can show: a page, a terminal… */
type PictureInPictureItem = {
  id: string
  /** Its name: e.g. a page's title, a terminal's command. */
  title: string
  /** Before its name: e.g. a favicon, a terminal's icon. */
  icon?: React.ReactNode
  /** The card's: e.g. a page's frame, a terminal's last lines. */
  preview?: React.ReactNode
  /** The pill's one line; its title without. E.g. a terminal's last. */
  line?: React.ReactNode
  /** Beside the pill's line: e.g. "Running · 12s". */
  status?: React.ReactNode
  /** The reader is called for: e.g. "Sign in to continue". */
  attention?: React.ReactNode
  /** The form it opens in: a card with a preview, else a pill. */
  form?: PictureInPictureForm
}

type PictureInPictureLabels = {
  expand: string
  close: string
  /** A card's button that makes it a pill. */
  minimize: string
  /** A pill's line, that makes it a card. */
  restore: string
  /** Back to what the agent is on, after the reader went elsewhere. */
  follow: string
  /** Its tab while tucked into the side, read with its title. */
  untuck: string
  /** A dot's name: "2 of 3: Pricing". */
  item: (index: number, count: number, title: string) => string
  /** How to move it by keyboard, read with its name. */
  keys: (many: boolean) => string
}

const defaultLabels: PictureInPictureLabels = {
  expand: "Expand",
  close: "Close",
  minimize: "Minimize",
  restore: "Show the preview",
  follow: "Follow",
  untuck: "Bring back",
  item: (index, count, title) => `${index} of ${count}: ${title}`,
  keys: (many) =>
    many
      ? "Left and right arrows go through what is open. Shift and the arrow keys move it to another corner, or tuck it into the side."
      : "Shift and the arrow keys move it to another corner, or tuck it into the side.",
}

/** Past this, a press is a drag, not a tap or a click: a finger's wider. */
const dragFrom = { mouse: 4, touch: 10 }

/** What shows of it tucked into the side: its tab, in px. */
const tab = 24

/** How far ahead a flick is thrown, in ms of its speed. */
const throwAhead = 120

/** At most this many dots; past it, "2/12". */
const maxDots = 7
// Under a finger each dot is 28px wide, so no two take one tap: as many
// as a phone's card has room for beside Follow.
const maxCoarseDots = 4

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

/** A theme's `--motion-*` in ms, as it reaches an element. */
const motion = (element: Element, name: string) => {
  const value = getComputedStyle(element).getPropertyValue(name).trim()
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000) || 0
}

/** Its box as laid out (no transform) and its corners' radius. */
const boxOf = (element: HTMLElement) => {
  const width = element.offsetWidth
  const height = element.offsetHeight
  const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0
  return { width, height, radius: Math.min(radius, width / 2, height / 2) }
}

/**
 * What a press on starts no drag: its own buttons, and what the app
 * marks `data-no-drag`. Its preview's buttons drag it, and are pressed
 * by a tap.
 */
const control = "[data-pip-control], [data-no-drag]"

function PipButton({
  label,
  icon,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string
  icon: typeof Cancel01Icon
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            data-pip-control=""
            className={cn(
              "touch-target relative text-muted-foreground hover:text-foreground",
              className
            )}
            {...props}
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * A small window in a corner of its place (the nearest positioned
 * ancestor, e.g. the main area) that shows what an agent is on while the
 * conversation goes on: of its `items` (pages, terminals…), the one it
 * is on (`active`), following it as it goes from one to another. Its dots
 * (or "2/12") say how many there are; a swipe across its preview, a
 * sideways scroll, the left and right arrows or a dot go through them,
 * and it then stays where the reader went, a "Follow" button taking it
 * back. Each is a card (its title, its `preview`) or a pill of one line
 * (its icon, its `line`, its `status`), as it says (`form`) or as the
 * reader made it; a terminal is best a pill of its last line. Dragged by
 * any part but its buttons, it lands in the corner it is let go nearest
 * or thrown towards; let go half past a side, it tucks into it, its tab
 * bringing it out. Shift and the arrow keys move and tuck it too. A call for
 * the reader (`attention`) is a strip in the text's colour with a ring,
 * read out, the window nudged once. "Expand" (`onExpand`, e.g. into the
 * side panel) and "Close" (`onClose`) are the app's; `onShownChange`
 * says which it shows, e.g. to stream that one's frames only.
 */
function PictureInPicture({
  items,
  active,
  following: followingProp,
  defaultFollowing = true,
  onFollowingChange,
  onShownChange,
  open = true,
  corner: cornerProp,
  defaultCorner = "bottom-end",
  onCornerChange,
  tucked: tuckedProp,
  defaultTucked = false,
  onTuckedChange,
  onExpand,
  onClose,
  inset = 16,
  aspectRatio = 16 / 10,
  labels: labelsProp,
  className,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"section">, "title" | "children"> & {
  items: readonly PictureInPictureItem[]
  /**
   * False, it fades and shrinks out, then is gone; true again, it comes
   * back as it first came. Rendered only while shown, it goes at once.
   */
  open?: boolean
  /** The id of the one the agent is on, which it follows. */
  active?: string | undefined
  /** Whether it shows the one the agent is on; else the reader's pick. */
  following?: boolean
  defaultFollowing?: boolean
  onFollowingChange?: (following: boolean) => void
  /** The id of the one it shows, as it changes. */
  onShownChange?: (id: string) => void
  corner?: PictureInPictureCorner
  defaultCorner?: PictureInPictureCorner
  onCornerChange?: (corner: PictureInPictureCorner) => void
  /**
   * Tucked into the side of its corner, only its tab showing: let go half
   * past the side, or Shift and the arrow out; its tab, or a drag back,
   * brings it back.
   */
  tucked?: boolean
  defaultTucked?: boolean
  onTuckedChange?: (tucked: boolean) => void
  /** Its "Expand" button, for the one it shows: none without. */
  onExpand?: (id: string) => void
  /** Its "Close" button: none without. */
  onClose?: () => void
  /** Its distance from its place's edges, in px. */
  inset?: number
  /** A card's preview's width to its height. */
  aspectRatio?: number
  labels?: Partial<PictureInPictureLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [ownCorner, setOwnCorner] = React.useState(defaultCorner)
  const [ownTucked, setOwnTucked] = React.useState(defaultTucked)
  const tucked = (tuckedProp ?? ownTucked) && open
  const corner = cornerProp ?? ownCorner
  const [ownFollowing, setOwnFollowing] = React.useState(defaultFollowing)
  const following = followingProp ?? ownFollowing
  const [picked, setPicked] = React.useState<string>()
  const [forms, setForms] = React.useState<
    Record<string, PictureInPictureForm>
  >({})
  // Which way the last turn went, for its slide: 1 on, -1 back.
  const [turned, setTurned] = React.useState(0)
  const root = React.useRef<HTMLElement>(null)
  const preview = React.useRef<HTMLDivElement>(null)
  const id = React.useId()
  // Out of the page once its way out is over.
  const [gone, setGone] = React.useState(!open)
  if (open && gone) setGone(false)

  const agents = items.find((item) => item.id === active) ?? items[0]
  const pickedItem = items.find((item) => item.id === picked)
  const shown = (!following && pickedItem) || agents
  const index = shown ? items.indexOf(shown) : -1
  const many = items.length > 1
  const form: PictureInPictureForm =
    shown?.preview === undefined
      ? "pill"
      : (forms[shown.id] ?? shown.form ?? "card")
  const away = !following && agents !== undefined && shown !== agents

  // Closed: gone once its way out (motion-pop's) is over.
  React.useEffect(() => {
    const element = root.current
    if (open) return
    let current = true
    Promise.all(
      (element?.getAnimations() ?? []).map((animation) => animation.finished)
    )
      .catch(() => {})
      .then(() => {
        if (current) setGone(true)
      })
    return () => {
      current = false
    }
  }, [open])

  // From one form to the other, its box changes size from where it was
  // (its corner kept), what it shows clipped to it meanwhile.
  const present = shown !== undefined && !gone
  const last = React.useRef<
    (ReturnType<typeof boxOf> & { form: PictureInPictureForm }) | null
  >(null)
  const resizing = React.useRef<Animation | null>(null)
  React.useLayoutEffect(() => {
    const element = root.current
    const was = last.current
    if (!element) {
      last.current = null
      return
    }
    // Mid-change, it starts from where that has got to.
    const running = resizing.current
    const from = running ? boxOf(element) : was
    running?.cancel()
    const to = boxOf(element)
    last.current = { form, ...to }
    element.style.setProperty("--pip-width", `${to.width}px`)
    if (!from || !was || was.form === form) return
    const duration = motion(element, "--motion-size")
    if (reducedMotion() || duration === 0) return
    const box = (size: ReturnType<typeof boxOf>) => ({
      width: `${size.width}px`,
      height: `${size.height}px`,
      borderRadius: `${size.radius}px`,
    })
    element.style.overflow = "hidden"
    const change = element.animate([box(from), box(to)], {
      duration,
      easing: getComputedStyle(element).getPropertyValue("--ease-ui").trim(),
    })
    resizing.current = change
    const done = () => {
      if (resizing.current !== change) return
      resizing.current = null
      element.style.overflow = ""
    }
    change.onfinish = done
    change.oncancel = done
  }, [form, present])

  // Its size as it changes otherwise (an attention strip, a longer line),
  // so a change of form starts from it.
  React.useEffect(() => {
    const element = root.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      // Its width, for its place tucked into the side.
      element.style.setProperty("--pip-width", `${element.offsetWidth}px`)
      const was = last.current
      if (was && !resizing.current)
        last.current = { form: was.form, ...boxOf(element) }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [present])

  const setFollowing = (next: boolean) => {
    if (followingProp === undefined) setOwnFollowing(next)
    if (next !== following) onFollowingChange?.(next)
  }

  const shownChanged = React.useEffectEvent((shownId: string) =>
    onShownChange?.(shownId)
  )
  const shownId = shown?.id
  React.useEffect(() => {
    if (shownId !== undefined) shownChanged(shownId)
  }, [shownId])

  /** To the one `step` on (or back), the reader's pick from then. */
  const turn = (step: number) => {
    const next = items[index + step]
    if (!next) return
    setTurned(step > 0 ? 1 : -1)
    setPicked(next.id)
    // On the agent's own again: following it.
    setFollowing(next === agents)
  }

  // Called for the reader: nudged once as it comes.
  const calling = shown?.attention ? shown.id : undefined
  React.useEffect(() => {
    const element = root.current
    if (!calling || !element || reducedMotion()) return
    element.animate([{ scale: 1 }, { scale: 1.04 }, { scale: 1 }], {
      duration: 400,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    })
  }, [calling])

  // A sideways scroll (a trackpad's two fingers) goes through them, a
  // turn a gesture; the page does not go back for it.
  const turnBy = React.useEffectEvent(turn)
  React.useEffect(() => {
    const element = root.current
    if (!element || !many) return
    let sum = 0
    let resting: ReturnType<typeof setTimeout> | undefined
    let spent = false
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      clearTimeout(resting)
      resting = setTimeout(() => {
        sum = 0
        spent = false
      }, 200)
      if (spent) return
      sum += event.deltaX
      if (Math.abs(sum) < 40) return
      spent = true
      const rtl = getComputedStyle(element).direction === "rtl"
      turnBy(sum > 0 !== rtl ? 1 : -1)
    }
    element.addEventListener("wheel", wheel, { passive: false })
    return () => {
      element.removeEventListener("wheel", wheel)
      clearTimeout(resting)
    }
  }, [many])

  const drag = React.useRef<{
    id: number
    x: number
    y: number
    mode: "press" | "move" | "turn"
    /** How far it goes before it is a drag. */
    from: number
    onPreview: boolean
    time: number
    vx: number
    vy: number
    lastX: number
    lastY: number
    /**
     * Until when it catches up with the finger, a swipe across its
     * preview having become a move.
     */
    catchUp: number
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
    element.style.transition =
      "transform var(--motion-slide) var(--ease-slide), scale var(--motion-fade) var(--ease-ui)"
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
  }, [corner, tucked, settle])

  /** To a corner, tucked into its side or not: from where it is. */
  const move = (next: PictureInPictureCorner, tuck = false) => {
    const element = root.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (next === corner && tuck === tucked) {
      settle(rect)
      return
    }
    from.current = rect
    if (next !== corner) {
      if (cornerProp === undefined) setOwnCorner(next)
      onCornerChange?.(next)
    }
    if (tuck !== tucked) {
      if (tuckedProp === undefined) setOwnTucked(tuck)
      onTuckedChange?.(tuck)
    }
    // Kept where it is, if the app keeps its corner.
    requestAnimationFrame(() => {
      if (from.current) {
        const rect = from.current
        from.current = null
        settle(rect)
      }
    })
  }

  /** A preview let go after a swipe: on to the next, or back in place. */
  const letGo = (dx: number, vx: number, rtl: boolean) => {
    const content = preview.current
    const width = content?.offsetWidth ?? 1
    // A quarter of it, or a flick: fast, and more than a nudge.
    const far =
      Math.abs(dx) > width / 4 || (Math.abs(vx) > 0.5 && Math.abs(dx) > 32)
    const step = dx < 0 !== rtl ? 1 : -1
    if (content) {
      content.style.transition = reducedMotion()
        ? ""
        : "transform var(--motion-size) var(--ease-ui)"
      content.style.transform = ""
    }
    if (far && items[index + step]) turn(step)
  }

  if (!shown || gone) return null

  const [vertical, horizontal] = corner.split("-") as [
    "top" | "bottom",
    "start" | "end",
  ]
  const edge = (side: string) =>
    `max(${inset}px, env(safe-area-inset-${side}, 0px))`
  const titleId = `${id}-title`
  const keysId = `${id}-keys`

  // Where it is among several, as a count: past as many dots as fit, and
  // in a pill under a finger (whose dots would crowd its title out).
  const count = (className?: string) => (
    <span
      data-slot="picture-in-picture-count"
      className={cn(
        "px-1 text-xs text-muted-foreground tabular-nums",
        className
      )}
    >
      {index + 1}/{items.length}
    </span>
  )
  const dots = (pill: boolean) =>
    many && (
      <div
        data-slot="picture-in-picture-dots"
        data-pip-control=""
        className="flex items-center"
      >
        {items.length > maxDots
          ? count()
          : items.map((item, at) => (
              <button
                key={item.id}
                type="button"
                aria-label={labels.item(at + 1, items.length, item.title)}
                aria-current={at === index || undefined}
                onClick={() => {
                  if (at !== index) turn(at - index)
                }}
                className={cn(
                  // Under a finger 28px wide and 44px tall, side by side:
                  // its 44px square over its neighbours took their taps.
                  "group/dot touch-target relative grid size-4 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 pointer-coarse:w-7 pointer-coarse:after:w-full",
                  (pill || items.length > maxCoarseDots) &&
                    "pointer-coarse:hidden"
                )}
              >
                <span className="size-2 scale-75 rounded-full bg-muted-foreground/40 transition-[background-color,scale] motion-fade group-hover/dot:bg-muted-foreground group-aria-current/dot:scale-100 group-aria-current/dot:bg-foreground" />
              </button>
            ))}
        {items.length <= maxDots &&
          (pill || items.length > maxCoarseDots) &&
          count("hidden pointer-coarse:inline")}
      </div>
    )

  const follow = away && (
    <button
      type="button"
      data-slot="picture-in-picture-follow"
      data-pip-control=""
      onClick={() => setFollowing(true)}
      className="touch-target relative flex h-6 shrink-0 items-center gap-1 rounded-full bg-foreground px-2 text-xs font-medium text-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className="size-2 scale-75 rounded-full bg-background"
        aria-hidden="true"
      />
      {labels.follow}
    </button>
  )

  const slide =
    turned === 0
      ? undefined
      : turned > 0
        ? "animate-in fade-in-0 slide-in-from-right-4 rtl:slide-in-from-left-4"
        : "animate-in fade-in-0 slide-in-from-left-4 rtl:slide-in-from-right-4"

  return (
    <section
      ref={root}
      data-slot="picture-in-picture"
      data-corner={corner}
      data-form={form}
      data-attention={shown.attention ? "" : undefined}
      data-closed={open ? undefined : ""}
      data-tucked={tucked ? "" : undefined}
      {...(open ? {} : { inert: true, "aria-hidden": true })}
      aria-labelledby={titleId}
      aria-describedby={keysId}
      aria-keyshortcuts={
        many
          ? "ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight"
          : "Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight"
      }
      tabIndex={0}
      className={cn(
        // Over what it floats on, as a menu is: raised, on the page's
        // colour (a step lighter in dark).
        "group/pip absolute z-20 flex cursor-grab touch-none flex-col bg-background text-foreground shadow-float ring-1 ring-foreground/10 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing dark:bg-muted",
        // Its ring fades as it is focused or calls; picked up, it rises a
        // little. Its size changes by the change of form's own animation.
        "transition-[box-shadow,scale] data-[dragging=move]:scale-102",
        open
          ? "animate-in motion-pop fade-in-0 zoom-in-95"
          : "pointer-events-none animate-out motion-pop fade-out-0 zoom-out-95",
        form === "card"
          ? // A phone's width, or its height on its side.
            "w-80 rounded-xl max-sm:w-60 [@media(max-height:30rem)]:w-60"
          : // On a phone no wider than its card: a pill nearly as wide
            // as the screen had no corners to go to.
            "h-10 w-max max-w-96 min-w-40 rounded-full max-sm:max-w-60",
        // Calling for the reader: a ring as strong as the text.
        "data-attention:ring-2 data-attention:ring-foreground",
        className
      )}
      style={{
        [vertical]: edge(vertical),
        [horizontal === "start" ? "insetInlineStart" : "insetInlineEnd"]: tucked
          ? // Past the side but its tab, clear of the safe area.
            `calc(env(safe-area-inset-${horizontal === "start" ? "left" : "right"}, 0px) + ${tab}px - var(--pip-width, 100vw))`
          : edge(horizontal === "start" ? "left" : "right"),
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
          mode: "press",
          from: event.pointerType === "mouse" ? dragFrom.mouse : dragFrom.touch,
          onPreview: many && preview.current?.contains(target) === true,
          time: event.timeStamp,
          vx: 0,
          vy: 0,
          lastX: event.clientX,
          lastY: event.clientY,
          catchUp: 0,
        }
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event)
        const state = drag.current
        if (!state || state.id !== event.pointerId) return
        const dx = event.clientX - state.x
        const dy = event.clientY - state.y
        if (state.mode === "press") {
          if (Math.hypot(dx, dy) < state.from) return
          // Across a preview of several: a turn; else it moves.
          state.mode =
            state.onPreview && Math.abs(dx) > Math.abs(dy) * 1.5
              ? "turn"
              : "move"
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // Not the browser's pointer, e.g. a script's event.
          }
          entered(event.currentTarget)
          event.currentTarget.dataset.dragging = state.mode
        }
        // Over a frame at least: events in a burst are not a flick.
        const elapsed = Math.max(16, event.timeStamp - state.time)
        state.vx = (event.clientX - state.lastX) / elapsed
        state.vy = (event.clientY - state.lastY) / elapsed
        state.lastX = event.clientX
        state.lastY = event.clientY
        state.time = event.timeStamp
        const element = event.currentTarget
        if (state.mode === "turn") {
          const content = preview.current
          const box = element.getBoundingClientRect()
          // Within it, a swipe turns; taken out past its side, it is a
          // move after all, the window catching up with the finger (a
          // phone's preview is most of it: else it could not be dragged
          // to its side to tuck it).
          if (event.clientX >= box.left && event.clientX <= box.right) {
            if (content) {
              content.style.transition = "none"
              content.style.transform = `translateX(${dx}px)`
            }
            return
          }
          if (content) {
            content.style.transition = reducedMotion()
              ? ""
              : "transform var(--motion-size) var(--ease-ui)"
            content.style.transform = ""
          }
          state.mode = "move"
          state.catchUp = reducedMotion() ? 0 : event.timeStamp + 100
          element.dataset.dragging = "move"
        }
        element.style.transition =
          event.timeStamp < state.catchUp
            ? "transform var(--motion-hover) var(--ease-ui), scale var(--motion-fade) var(--ease-ui)"
            : "none"
        element.style.transform = `translate(${dx}px, ${dy}px)`
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event)
        const state = drag.current
        drag.current = null
        if (!state || state.mode === "press" || state.id !== event.pointerId)
          return
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
        const rtl = getComputedStyle(element).direction === "rtl"
        if (state.mode === "turn") {
          letGo(event.clientX - state.x, state.vx, rtl)
          return
        }
        const place = (
          element.offsetParent ?? document.body
        ).getBoundingClientRect()
        const rect = element.getBoundingClientRect()
        // Thrown: where it was going, at most a few px a ms.
        const speed = (v: number) => Math.max(-3, Math.min(3, v))
        const x = rect.left + rect.width / 2 + speed(state.vx) * throwAhead
        const y = rect.top + rect.height / 2 + speed(state.vy) * throwAhead
        const left = x < place.left + place.width / 2
        // Tucked into a side: let go with its middle past it; or thrown
        // out past it from that side, where a finger reaches the screen's
        // edge before its middle does (from the other side, a flick to a
        // corner there is not one out).
        const own = (horizontal === "start") !== rtl ? "left" : "right"
        const middle = rect.left + rect.width / 2
        const tuck =
          middle < place.left ||
          middle > place.right ||
          (own === "left" && x < place.left && state.vx < 0) ||
          (own === "right" && x > place.right && state.vx > 0)
        move(
          `${y < place.top + place.height / 2 ? "top" : "bottom"}-${
            left !== rtl ? "start" : "end"
          }` as PictureInPictureCorner,
          tuck
        )
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event)
        const state = drag.current
        drag.current = null
        if (!state || state.mode === "press") return
        delete event.currentTarget.dataset.dragging
        if (state.mode === "turn") letGo(0, 0, false)
        else settle(event.currentTarget.getBoundingClientRect())
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || event.target !== event.currentTarget)
          return
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
        if (!event.shiftKey) {
          const step = many
            ? { ArrowLeft: -1, ArrowRight: 1 }[event.key]
            : undefined
          if (!step) return
          event.preventDefault()
          turn(rtl ? -step : step)
          return
        }
        const to = {
          ArrowUp: ["top", horizontal],
          ArrowDown: ["bottom", horizontal],
          ArrowLeft: [vertical, rtl ? "end" : "start"],
          ArrowRight: [vertical, rtl ? "start" : "end"],
        }[event.key]
        if (!to) return
        event.preventDefault()
        const next = to.join("-") as PictureInPictureCorner
        const sideways = event.key === "ArrowLeft" || event.key === "ArrowRight"
        // Out past its own side: tucked; back from it: out again, there.
        if (sideways && next === corner) move(corner, true)
        else if (sideways && tucked) move(corner, false)
        else move(next, tucked)
      }}
      {...props}
    >
      <span id={keysId} className="sr-only">
        {labels.keys(many)}
      </span>
      {tucked && (
        // Its edge, in from the side: a tap, or a drag back, brings it out.
        <button
          type="button"
          data-slot="picture-in-picture-tab"
          aria-label={`${labels.untuck}: ${shown.title}`}
          onClick={(event) => {
            // Gone as it comes out: the focus to the window, not the page.
            if (event.currentTarget.contains(document.activeElement))
              root.current?.focus({ preventScroll: true })
            move(corner, false)
          }}
          className={cn(
            "touch-target absolute inset-y-0 z-10 flex w-6 items-center justify-center bg-background text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset dark:bg-muted [&_svg]:size-4",
            horizontal === "end"
              ? "start-0 rounded-s-[inherit]"
              : "end-0 rounded-e-[inherit]",
            // Calling for the reader: in the text's colour, as its strip.
            shown.attention &&
              "bg-foreground text-background hover:text-background"
          )}
        >
          <HugeiconsIcon
            icon={
              shown.attention
                ? Alert02Icon
                : horizontal === "end"
                  ? ArrowLeft01Icon
                  : ArrowRight01Icon
            }
            strokeWidth={2}
            className={shown.attention ? undefined : "rtl:rotate-180"}
          />
        </button>
      )}
      {tucked && shown.attention && (
        <span role="status" className="sr-only">
          {shown.attention}
        </span>
      )}
      {form === "card" ? (
        <div
          key="card"
          inert={tucked}
          className="flex min-h-0 animate-in flex-col overflow-hidden rounded-xl motion-fade fade-in-0"
        >
          <div
            data-slot="picture-in-picture-bar"
            className="flex h-9 shrink-0 items-center gap-2 ps-3 pe-1 text-2sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
          >
            {shown.icon}
            <span id={titleId} className="min-w-0 flex-1 truncate font-medium">
              {shown.title}
            </span>
            <PipButton
              label={labels.minimize}
              icon={MinusSignIcon}
              onClick={() =>
                setForms((all) => ({ ...all, [shown.id]: "pill" }))
              }
            />
            {onExpand && (
              <PipButton
                label={labels.expand}
                icon={ArrowExpand01Icon}
                onClick={() => onExpand(shown.id)}
              />
            )}
            {onClose && (
              <PipButton
                label={labels.close}
                icon={Cancel01Icon}
                onClick={onClose}
              />
            )}
          </div>
          <div
            data-slot="picture-in-picture-content"
            className="relative min-h-0 overflow-hidden bg-muted dark:bg-background"
            style={{ aspectRatio }}
          >
            <div ref={preview} className="size-full">
              <div key={shown.id} className={cn("size-full", slide)}>
                {shown.preview}
              </div>
            </div>
            {(many || follow) && (
              <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 *:pointer-events-auto">
                {many ? (
                  <div className="rounded-full bg-background/90 px-1 py-1 shadow-float dark:bg-muted/90">
                    {dots(false)}
                  </div>
                ) : (
                  <span />
                )}
                {follow}
              </div>
            )}
          </div>
          {shown.attention && (
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
              <span className="min-w-0 flex-1">{shown.attention}</span>
            </div>
          )}
        </div>
      ) : (
        <div
          key="pill"
          inert={tucked}
          data-slot="picture-in-picture-pill"
          className="flex h-10 min-w-0 shrink-0 animate-in items-center gap-2 ps-3 pe-1 text-2sm motion-fade fade-in-0 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
        >
          {shown.attention ? (
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
          ) : (
            shown.icon
          )}
          <span id={titleId} className="sr-only">
            {shown.title}
          </span>
          <button
            type="button"
            data-slot="picture-in-picture-line"
            onClick={() => {
              if (shown.preview !== undefined)
                setForms((all) => ({ ...all, [shown.id]: "card" }))
              else onExpand?.(shown.id)
            }}
            className={cn(
              "min-w-0 flex-1 truncate rounded-sm text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              shown.attention
                ? "font-medium"
                : shown.line !== undefined && "font-mono text-xs"
            )}
          >
            {/* What it does, then what it says: its name holds its text. */}
            <span className="sr-only">
              {shown.preview !== undefined
                ? `${labels.restore}: `
                : onExpand
                  ? `${labels.expand}: `
                  : ""}
            </span>
            <span key={shown.id} className={cn("block truncate", slide)}>
              {shown.attention ?? shown.line ?? shown.title}
            </span>
          </button>
          {shown.status && !shown.attention && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {shown.status}
            </span>
          )}
          {shown.attention && (
            <span role="status" className="sr-only">
              {shown.attention}
            </span>
          )}
          {follow}
          {dots(true)}
          {onClose && (
            <PipButton
              label={labels.close}
              icon={Cancel01Icon}
              onClick={onClose}
              className="rounded-full"
            />
          )}
        </div>
      )}
    </section>
  )
}

/**
 * A terminal's last lines, small, for a card's preview: monospaced, the
 * newest at its foot, as many as fit.
 */
function PictureInPictureLines({
  lines,
  className,
  ...props
}: React.ComponentProps<"div"> & { lines: readonly string[] }) {
  return (
    <div
      data-slot="picture-in-picture-lines"
      className={cn(
        "flex size-full flex-col justify-end overflow-hidden bg-background p-2 font-mono text-2xs/4 whitespace-pre text-foreground",
        className
      )}
      {...props}
    >
      {lines.slice(-24).map((line, at) => (
        <div key={at} className="truncate">
          {line || " "}
        </div>
      ))}
    </div>
  )
}

export {
  PictureInPicture,
  PictureInPictureLines,
  type PictureInPictureCorner,
  type PictureInPictureForm,
  type PictureInPictureItem,
  type PictureInPictureLabels,
}
