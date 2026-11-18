"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowExpand01Icon,
  ArrowUp02Icon,
  ListViewIcon,
} from "@hugeicons/core-free-icons"

import { FloatingButton } from "@/components/floating-button"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type MessageOutlineLabels = {
  /** Over the headings: "On this answer". */
  title: string
  previous: string
  next: string
  /** The button that opens the message in a reader, with `onOpen`. */
  open: string
  /** At the bottom while there is more below: "Jump to end · 4 screens". */
  end: (screens: number) => string
  /** On the narrow outline: which section of how many, "3 / 7". */
  position: (section: number, sections: number) => string
}

const defaultLabels: MessageOutlineLabels = {
  title: "On this answer",
  previous: "Previous section",
  next: "Next section",
  open: "Open in reader",
  end: (screens) =>
    `Jump to end · ${screens} ${screens === 1 ? "screen" : "screens"}`,
  position: (section, sections) => `${section} / ${sections}`,
}

/** A heading of the message, as its outline shows it. */
type OutlineHeading = {
  element: HTMLElement
  text: string
  /** Under another heading: shown further in. */
  sub: boolean
}

/** Where the reader is in a message. */
type OutlineState = {
  headings: OutlineHeading[]
  /** The heading of the section being read, or -1 before the first. */
  active: number
  /** How much of it has come into view, 0 to 1. */
  progress: number
  /** Its height in views of what scrolls it. */
  screens: number
  /** The views still below the view. */
  below: number
  /** Whether there is room for the outline beside it. */
  room: boolean
  /** From its end to the outline beside it: so it ends 28px in from the view's. */
  gap: number
}

const empty: OutlineState = {
  headings: [],
  active: -1,
  progress: 0,
  screens: 0,
  below: 0,
  room: false,
  gap: 0,
}

/** The nearest ancestor that scrolls up and down, or none: the page. */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === "auto" || overflowY === "scroll") return node
  }
  return null
}

/**
 * The outline's width beside a message, the least gap to it, and how far
 * in from the view's end it is, in pixels.
 */
const asideWidth = 192
const asideGap = 32
const asideEnd = 24

function sameState(a: OutlineState, b: OutlineState) {
  return (
    a.active === b.active &&
    a.progress === b.progress &&
    a.screens === b.screens &&
    a.below === b.below &&
    a.room === b.room &&
    a.gap === b.gap &&
    a.headings.length === b.headings.length &&
    a.headings.every(
      (heading, index) =>
        heading.element === b.headings[index]?.element &&
        heading.text === b.headings[index]?.text
    )
  )
}

/**
 * The headings in an element (its Markdown's), the one being read, how
 * far the reader is, and how many views are below, as the element and
 * what scrolls it change. Headings that are not shown (`sr-only`) and
 * footnotes' are left out.
 *
 * It costs nothing to lay out until there are two headings: until then
 * it only watches the element's DOM, and neither finds what scrolls it,
 * measures nor listens. Its scroll is followed only once it is
 * `minScreens` views tall, as nothing else changes as the view scrolls.
 * Its first measure waits for the next frame, so many mounted at once
 * read one layout.
 */
function useMessageOutline(
  content: React.RefObject<HTMLElement | null>,
  { minScreens = 0 }: { minScreens?: number } = {}
) {
  const [state, setState] = React.useState(empty)

  React.useEffect(() => {
    const element = content.current
    if (!element) return
    let headings: OutlineHeading[] = []
    let frame = 0
    // Found once there are two headings, kept after.
    let parent: HTMLElement | null | undefined
    let sizes: ResizeObserver | undefined
    let target: HTMLElement | Window | undefined

    const update = (next: OutlineState) =>
      setState((previous) => (sameState(previous, next) ? previous : next))

    const collect = () => {
      const found = [
        ...element.querySelectorAll<HTMLElement>("h1, h2, h3, h4"),
      ].filter(
        (heading) =>
          !heading.closest(".sr-only, [data-footnotes]") &&
          heading.textContent?.trim()
      )
      const top = Math.min(...found.map((heading) => +heading.tagName[1]!))
      headings = found.map((heading) => ({
        element: heading,
        text: heading.textContent!.trim(),
        sub: +heading.tagName[1]! > top,
      }))
    }

    const follow = (scrolls: boolean) => {
      if (scrolls === Boolean(target)) return
      if (scrolls) {
        target = parent ?? window
        target.addEventListener("scroll", schedule, { passive: true })
      } else {
        target!.removeEventListener("scroll", schedule)
        target = undefined
      }
    }

    const arm = (armed: boolean) => {
      if (armed === Boolean(sizes)) return
      if (armed) {
        if (parent === undefined) parent = scrollParent(element)
        sizes = new ResizeObserver(schedule)
        sizes.observe(element)
        if (parent) sizes.observe(parent)
        window.addEventListener("resize", schedule)
      } else {
        cancelAnimationFrame(frame)
        frame = 0
        sizes!.disconnect()
        sizes = undefined
        window.removeEventListener("resize", schedule)
        follow(false)
      }
    }

    const measure = () => {
      frame = 0
      if (!sizes) return
      const box = element.getBoundingClientRect()
      const view = parent?.getBoundingClientRect()
      const viewTop = view ? view.top + parent!.clientTop : 0
      const viewHeight = parent ? parent.clientHeight : window.innerHeight
      const viewRight = view
        ? view.left + parent!.clientLeft + parent!.clientWidth
        : document.documentElement.clientWidth
      const screens = box.height / (viewHeight || 1)
      follow(screens >= minScreens)
      // A section is being read once its heading is in the view's top
      // quarter.
      const line = viewTop + viewHeight / 4
      let active = -1
      headings.forEach((heading, index) => {
        if (heading.element.getBoundingClientRect().top <= line) active = index
      })
      const seen = (viewTop + viewHeight - box.top) / (box.height || 1)
      update({
        headings,
        active,
        progress: Math.round(Math.min(1, Math.max(0, seen)) * 100) / 100,
        screens,
        below: Math.max(
          0,
          Math.ceil((box.bottom - viewTop - viewHeight) / (viewHeight || 1))
        ),
        room: viewRight - box.right >= asideWidth + asideGap + 8,
        // At the view's end, not the message's: where the eye looks for it.
        gap: Math.round(
          Math.max(asideGap, viewRight - box.right - asideEnd - asideWidth)
        ),
      })
    }

    function schedule() {
      frame ||= requestAnimationFrame(measure)
    }

    const refresh = () => {
      collect()
      const armed = headings.length > 1
      arm(armed)
      if (armed) schedule()
      else update({ ...empty, headings })
    }
    refresh()

    // While it streams, headings come and go.
    const mutations = new MutationObserver(refresh)
    mutations.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    return () => {
      mutations.disconnect()
      arm(false)
    }
  }, [content, minScreens])

  return state
}

/** Scrolls to a heading and moves focus to it, for keyboards and readers. */
function goTo(heading: OutlineHeading | undefined) {
  if (!heading) return
  const element = heading.element
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  element.scrollIntoView({
    block: "start",
    behavior: still ? "auto" : "smooth",
  })
  if (!element.hasAttribute("tabindex")) element.tabIndex = -1
  element.focus({ preventScroll: true })
}

function OutlineButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            // 14px arrows in 28px buttons, in the faintest grey till hovered.
            className="size-7 text-subtle-foreground hover:text-foreground [&_svg:not([class*='size-'])]:size-3.5"
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * A message's outline: "On this answer" and how far the reader is, its
 * headings (the one being read marked, those read darker), each
 * scrolling to its section; then buttons to the previous and next
 * section and, with `onOpen`, one that opens it in a reader.
 */
function MessageOutlineNav({
  outline,
  onOpen,
  onNavigate,
  labels: labelsProp,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  outline: OutlineState
  onOpen?: () => void
  /** After a heading is chosen, e.g. to close the popover it is in. */
  onNavigate?: () => void
  labels?: Partial<MessageOutlineLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const { headings, active } = outline
  const go = (index: number) => {
    goTo(headings[index])
    onNavigate?.()
  }
  return (
    <nav
      data-slot="message-outline-nav"
      aria-label={labels.title}
      className={cn("flex w-48 flex-col text-2sm", className)}
      {...props}
    >
      <div className="flex h-7 items-center justify-between text-2xs font-medium text-subtle-foreground">
        <span aria-hidden="true">{labels.title}</span>
        <span className="tabular-nums">
          {Math.round(outline.progress * 100)}%
        </span>
      </div>
      <ol>
        {headings.map((heading, index) => (
          <li key={index}>
            <button
              type="button"
              aria-current={index === active ? "location" : undefined}
              data-read={index < active || undefined}
              data-sub={heading.sub || undefined}
              onClick={() => go(index)}
              className="relative flex h-7 w-full cursor-pointer items-center border-s ps-3 text-start text-subtle-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=location]:border-foreground aria-[current=location]:font-medium aria-[current=location]:text-foreground aria-[current=location]:before:absolute aria-[current=location]:before:inset-y-0 aria-[current=location]:before:-start-px aria-[current=location]:before:w-0.5 aria-[current=location]:before:bg-foreground data-read:text-muted-foreground data-sub:ps-6"
            >
              <span className="truncate">{heading.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="-ms-2 mt-3 flex gap-0.5">
        <OutlineButton
          label={labels.previous}
          disabled={active <= 0}
          onClick={() => go(active - 1)}
        >
          <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} />
        </OutlineButton>
        <OutlineButton
          label={labels.next}
          disabled={active >= headings.length - 1}
          onClick={() => go(active + 1)}
        >
          <HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={2} />
        </OutlineButton>
        {onOpen && (
          <OutlineButton label={labels.open} onClick={onOpen}>
            <HugeiconsIcon icon={ArrowExpand01Icon} strokeWidth={2} />
          </OutlineButton>
        )}
      </div>
    </nav>
  )
}

/**
 * A long message with its outline. Once it is `minScreens` views tall
 * (3) and has two headings or more, the outline is beside it where there
 * is room (`MessageOutlineNav`, sticking to the top) and otherwise a
 * button sticking to the top that says the section being read and
 * opens it; while more than a view of it is below, a button at the
 * bottom jumps to its end. `side` makes it one or the other; `pill`
 * false, where there is no room beside it, it shows none (e.g. a
 * ConversationMinimap beside the conversation has its sections).
 */
function MessageOutline({
  minScreens = 3,
  side = "auto",
  pill = true,
  onOpen,
  labels: labelsProp,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  minScreens?: number
  /** Beside it ("aside"), over it ("pill"), or where it fits. */
  side?: "auto" | "aside" | "pill"
  /** Where it does not fit beside it ("auto"): the pill over it, or none. */
  pill?: boolean
  /** Opens the message in a reader, e.g. a `MessageReader`. */
  onOpen?: () => void
  labels?: Partial<MessageOutlineLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const content = React.useRef<HTMLDivElement>(null)
  const outline = useMessageOutline(content, { minScreens })
  const [open, setOpen] = React.useState(false)
  const shown = outline.screens >= minScreens && outline.headings.length > 1
  const aside = side === "aside" || (side === "auto" && outline.room)
  const current = outline.headings[Math.max(0, outline.active)]
  const nav = (
    <MessageOutlineNav
      outline={outline}
      labels={labels}
      {...(onOpen ? { onOpen } : {})}
      onNavigate={() => setOpen(false)}
    />
  )

  return (
    <div
      data-slot="message-outline"
      className={cn("relative min-w-0", className)}
      {...props}
    >
      {shown && !aside && (pill || side === "pill") && (
        // On a band of the page's colour, fading out under it, so the
        // text scrolling past doesn't show round the button.
        <div
          data-slot="message-outline-band"
          className="sticky top-0 z-10 mb-1 flex bg-background py-2 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-linear-to-b after:from-background after:to-transparent"
        >
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <FloatingButton
                  data-slot="message-outline-trigger"
                  // Not round as a jump button: a 32px tab of the section,
                  // its text at the 13px of secondary text.
                  className="h-8 max-w-full gap-2 rounded-lg ps-3 pe-2 text-2sm font-normal"
                />
              }
            >
              <HugeiconsIcon
                icon={ListViewIcon}
                strokeWidth={2}
                className="text-muted-foreground"
              />
              <span className="sr-only">{labels.title}: </span>
              <span className="truncate">{current?.text}</span>
              <span className="text-2xs text-muted-foreground tabular-nums">
                {labels.position(
                  Math.max(0, outline.active) + 1,
                  outline.headings.length
                )}
              </span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                strokeWidth={2}
                className="text-muted-foreground"
              />
            </PopoverTrigger>
            {/* Named as its list, while it closes too. */}
            <PopoverContent
              align="start"
              aria-label={labels.title}
              className="w-auto p-3"
            >
              {nav}
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div ref={content} data-slot="message-outline-content">
        {children}
      </div>
      {shown && aside && (
        <div
          className="absolute inset-y-0 w-48"
          style={{ insetInlineStart: `calc(100% + ${outline.gap}px)` }}
        >
          <div className="sticky top-6">{nav}</div>
        </div>
      )}
      {shown && outline.below > 0 && (
        // As tall as nothing, at its end: it sticks to the bottom of the
        // view while the end is below it.
        <div className="pointer-events-none sticky bottom-4 z-10 flex h-0 justify-center">
          <FloatingButton
            data-slot="message-outline-end"
            onClick={() => {
              const element = content.current
              if (!element) return
              const still = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
              ).matches
              element.scrollIntoView({
                block: "end",
                behavior: still ? "auto" : "smooth",
              })
            }}
            className="pointer-events-auto absolute bottom-0 text-muted-foreground"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
            {labels.end(outline.below)}
          </FloatingButton>
        </div>
      )}
    </div>
  )
}

export {
  MessageOutline,
  MessageOutlineNav,
  useMessageOutline,
  type MessageOutlineLabels,
  type OutlineHeading,
  type OutlineState,
}
