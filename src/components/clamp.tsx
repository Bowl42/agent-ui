"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowUp02Icon } from "@hugeicons/core-free-icons"

type ClampLabels = {
  /** The button that shows it all. */
  more: string
  less: string
  /** Beside the button: how long it is, e.g. "38 lines · 412 words". */
  lines: (lines: number, words: number) => string
  /** The bar at the top while it is open and scrolled past its start. */
  collapse: string
}

const defaultLabels: ClampLabels = {
  more: "Show all",
  less: "Show less",
  lines: (lines, words) =>
    `${lines} ${lines === 1 ? "line" : "lines"} · ${words} ${words === 1 ? "word" : "words"}`,
  collapse: "Collapse",
}

// A character of a script written without spaces: each is a word.
const unspaced = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu
// Else a word is what is between spaces with a letter or digit in it.
const spaced = /[^\s]*[\p{L}\p{N}][^\s]*/gu

/**
 * How many words a text has, as an editor counts them: what is between
 * spaces, and each Chinese or Japanese character. (Not Intl.Segmenter,
 * whose count differs from browser to browser.)
 */
function wordsIn(text: string) {
  const characters = text.match(unspaced)?.length ?? 0
  return characters + (text.replace(unspaced, " ").match(spaced)?.length ?? 0)
}

/** Its line height in pixels. */
function lineHeight(element: HTMLElement) {
  const style = getComputedStyle(element)
  // "normal" is about 1.2 times the font size.
  return parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 || 1
}

/** The nearest ancestor that scrolls up and down, or the page. */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === "auto" || overflowY === "scroll") return node
  }
  return null
}

// A button in the text's own color, so it suits any surface. To a finger,
// 44px tall past its 24px.
const textButton =
  "relative inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none select-none hover:bg-current/10 focus-visible:ring-3 focus-visible:ring-ring/50 touch-target [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:opacity-70"

// The bar's button, on the page's colour: bordered, as an outline
// button (in dark too), 28px tall. To a finger, 44px tall.
const barButton =
  "relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-medium whitespace-nowrap text-foreground transition-colors outline-none select-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 touch-target [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"

/**
 * Content cut to a number of lines, fading out, with a row under it: a
 * button that shows it all, how long it is, and the app's `actions`
 * (copy, open in a reader). Open and scrolled past its start, a bar at
 * the top says whose it is (`title`), how far the reader is and closes
 * it again, keeping its start in view. The row is there only when there
 * is more; all of the content stays in the page, for screen readers,
 * copying and find in the page. A bubbling `revealmatch` event with
 * `detail.range` opens it when the match reaches below the cut.
 */
function Clamp({
  lines = 6,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  labels: labelsProp,
  title,
  actions,
  className,
  children,
  onFocusCapture,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  /** The lines shown while it is closed. */
  lines?: number
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Its text, for other languages. */
  labels?: Partial<ClampLabels>
  /** Whose it is, in the bar shown when open and scrolled past its start. */
  title?: React.ReactNode
  /** At the end of its row, e.g. copy and open buttons. */
  actions?: React.ReactNode
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolled
  const root = React.useRef<HTMLDivElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  const id = React.useId()
  // All of its lines, as the reader sees them; 0 until measured.
  const [{ total, long, words }, setMeasured] = React.useState({
    total: 0,
    long: false,
    words: 0,
  })
  // How wide it was when last found longer than `lines`, while it is long.
  const longAt = React.useRef<number | null>(null)
  const clamped = long && !open
  // Until measured, it is cut all the same (without the fade), so a long
  // one never shows whole for a frame: what is below it would jump up as
  // it closed.
  const capped = clamped || (total === 0 && !open)
  // How far the reader is through it while the bar shows, or null.
  const [past, setPast] = React.useState<number | null>(null)
  // How far the bar reaches past its own edges: to those of what scrolls.
  const [edges, setEdges] = React.useState({ start: 0, end: 0 })

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }

  const reveal = React.useEffectEvent((event: Event) => {
    const cut = content.current
    const range = (event as CustomEvent<{ range: Range }>).detail?.range
    if (!clamped || !cut || !range || !cut.contains(range.startContainer))
      return
    const bottom =
      range.getBoundingClientRect().bottom -
      cut.getBoundingClientRect().top +
      cut.scrollTop
    if (bottom > cut.clientHeight + 1) setOpen(true)
  })
  React.useEffect(() => {
    const cut = content.current
    cut?.addEventListener("revealmatch", reveal)
    return () => cut?.removeEventListener("revealmatch", reveal)
  }, [])

  // Closing keeps its start where it was, or brings it into view when
  // closed from the bar, its start scrolled past.
  const close = () => {
    const element = root.current
    setOpen(false)
    if (element && past !== null)
      requestAnimationFrame(() =>
        element.scrollIntoView({ block: "nearest", behavior: "instant" })
      )
  }

  // Read when its size changes, after layout, so many clamps mounting at
  // once force no layout; rendered at once, before the paint.
  React.useEffect(() => {
    const element = content.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth
      // Not laid out (hidden, or skipped off screen by a content-visibility
      // row of a conversation): what it measured stays, so it does not
      // open and close as it scrolls in and out of view.
      if (width === 0) return
      const total = Math.round(element.scrollHeight / lineHeight(element))
      if (total > lines) longAt.current = width
      // Fitting only once wider than where it did not, it stays long: being
      // long may be what widened it (a bubble a little wider when cut), and
      // the two would take turns every frame.
      else if (longAt.current === null || width <= longAt.current)
        longAt.current = null
      const long = longAt.current !== null
      // Counted only where it is said, and when its size changed.
      const words = long ? wordsIn(element.textContent ?? "") : 0
      // Rendered before the paint: its row a frame late, what is below it
      // would jump down.
      flushSync(() =>
        setMeasured((last) =>
          last.total === total && last.long === long && last.words === words
            ? last
            : { total, long, words }
        )
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [lines])

  // While open, whether its start is scrolled past, and how far.
  React.useEffect(() => {
    const element = root.current
    if (!open || !long || !element) {
      setPast(null)
      return
    }
    const parent = scrollParent(element)
    let frame = 0
    const measure = () => {
      frame = 0
      const box = element.getBoundingClientRect()
      const top = parent ? parent.getBoundingClientRect().top : 0
      const height = parent ? parent.clientHeight : window.innerHeight
      // Shown while its start is above the view and its end well below.
      if (box.top >= top || box.bottom < top + 80) return setPast(null)
      const read = (top + height - box.top) / box.height
      setPast(Math.min(1, Math.max(0, read)))
      // Inside its scrollbar, if it has one.
      const left = parent
        ? parent.getBoundingClientRect().left + parent.clientLeft
        : 0
      const right =
        left +
        (parent ? parent.clientWidth : document.documentElement.clientWidth)
      const rtl = getComputedStyle(element).direction === "rtl"
      const start = rtl ? right - box.right : box.left - left
      const end = rtl ? box.left - left : right - box.right
      setEdges((was) =>
        was.start === start && was.end === end ? was : { start, end }
      )
    }
    const schedule = () => {
      frame ||= requestAnimationFrame(measure)
    }
    measure()
    const target: HTMLElement | Window = parent ?? window
    target.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      target.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [open, long])

  return (
    <div
      ref={root}
      data-slot="clamp"
      data-open={open || undefined}
      data-clamped={clamped || undefined}
      className={cn("relative flex min-w-0 flex-col items-stretch", className)}
      // Something focused in the cut-off part is shown (WCAG 2.4.11).
      onFocusCapture={(event) => {
        onFocusCapture?.(event)
        const cut = content.current
        if (!clamped || !cut || !cut.contains(event.target)) return
        // Where it is in the content: focusing it scrolls the cut to it.
        const bottom =
          event.target.getBoundingClientRect().bottom -
          cut.getBoundingClientRect().top +
          cut.scrollTop
        if (bottom > cut.clientHeight + 1) setOpen(true)
      }}
      {...props}
    >
      {past !== null && (
        // As tall as nothing, so it moves nothing as it comes and goes;
        // it sticks to the top of what scrolls while the content passes.
        <div className="sticky top-0 z-10 h-0">
          <div
            data-slot="clamp-bar"
            // Across what scrolls, not the surface it is on (e.g. a
            // bubble): a header of the page, on its colour, with what
            // passes under it blurred.
            className="absolute top-0 flex h-10 items-center gap-2 border-b bg-background/90 ps-4 pe-2 text-xs text-muted-foreground backdrop-blur-md"
            style={{
              insetInlineStart: -edges.start,
              insetInlineEnd: -edges.end,
            }}
          >
            {title && (
              <span className="truncate font-medium text-foreground">
                {title}
              </span>
            )}
            <span className="truncate">
              {title && <span aria-hidden="true">· </span>}
              {labels.lines(total, words)}
            </span>
            <span className="ms-auto flex shrink-0 items-center gap-2">
              <span
                aria-hidden="true"
                data-slot="clamp-progress"
                // grid: mark
                className="h-0.75 w-16 overflow-hidden rounded-full bg-border"
              >
                <span
                  className="block h-full bg-muted-foreground"
                  style={{ width: `${Math.round(past * 100)}%` }}
                />
              </span>
              <button
                type="button"
                aria-expanded
                aria-controls={id}
                onClick={close}
                className={barButton}
              >
                <HugeiconsIcon
                  icon={ArrowUp02Icon}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {labels.collapse}
              </button>
            </span>
          </div>
        </div>
      )}
      <div
        ref={content}
        id={id}
        data-slot="clamp-content"
        style={
          capped
            ? {
                maxHeight: `${lines}lh`,
                overflow: "hidden",
                // It fades out over its last two lines.
                ...(clamped && {
                  maskImage:
                    "linear-gradient(to bottom, black calc(100% - 2lh), transparent)",
                }),
              }
            : undefined
        }
        className="w-full min-w-0"
      >
        {children}
      </div>
      {long && (
        <div
          data-slot="clamp-footer"
          // 24px, its button's height (an action's may be taller).
          className="-ms-2 mt-1 flex min-h-6 min-w-0 items-center gap-1"
        >
          <button
            type="button"
            data-slot="clamp-trigger"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => (open ? close() : setOpen(true))}
            className={textButton}
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              aria-hidden="true"
              className="transition-transform in-aria-expanded:rotate-180 motion-reduce:transition-none"
            />
            {open ? labels.less : labels.more}
          </button>
          {/* Muted where the surface says how (`--clamp-muted`), else a
              step under the text's own colour, which suits any surface. */}
          <span className="truncate text-xs text-[color:var(--clamp-muted,color-mix(in_oklab,currentColor_70%,transparent))]">
            {labels.lines(total, words)}
          </span>
          {actions && (
            <div className="ms-auto -me-2 flex shrink-0 items-center gap-0.5 ps-2">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { Clamp, type ClampLabels }
