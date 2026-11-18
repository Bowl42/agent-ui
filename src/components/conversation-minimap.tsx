"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUp02Icon,
  ArrowDown02Icon,
  Attachment01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useMessageScroller,
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller"

type ConversationMinimapItem = {
  /** The message's messageId on its MessageScrollerItem. */
  id: string
  /** The first non-empty line names the tick. */
  label: string
  /** A full user tick, a shorter app mark, or a failed turn. */
  kind?: "message" | "mark" | "error"
  /**
   * The reply's opening, under the question in its card; else the first
   * paragraph of the reply, read from the conversation while shown.
   */
  reply?: string
  /** Its attachments' names, in its card. */
  attachments?: string[]
  /**
   * Its reply's headings, in order: shorter ticks under its own. Else
   * read from the reply while it is rendered (a conversation's far
   * messages are not, as it scrolls), two or more.
   */
  sections?: string[]
}

/** A heading of a turn's reply: a shorter tick under the turn's. */
type Section = { element: HTMLElement | null; text: string }

type ConversationMinimapLabels = {
  /** The navigation's name: "Conversation map". */
  title: string
  /** "Previous turn". */
  previous: string
  /** "Next turn". */
  next: string
  /** "Failed". */
  failed: string
}

const defaultLabels: ConversationMinimapLabels = {
  title: "Conversation map",
  previous: "Previous turn",
  next: "Next turn",
  failed: "Failed",
}

// The nav’s w-6, its inset of 2, and room beside the column’s content.
const navWidth = 24
const inset = 8
const clearance = 16
// Leave space below the card and above the scroller’s bottom edge.
const gap = 12
const bottomPadding = 48
// Two 26px buttons and eight 8px ticks.
const minimumHeight = 112

function TurnButton({
  label,
  side,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string
  side: "inline-start" | "inline-end"
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className="size-6 shrink-0 text-subtle-foreground opacity-0 group-data-awake/conversation-minimap:opacity-100 hover:text-foreground disabled:opacity-0 group-data-awake/conversation-minimap:disabled:opacity-50 motion-safe:transition-opacity"
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The headings of each turn's reply in the conversation: after its
 * message, before the next turn's, not in a message of the reader's.
 */
function headingsOf(
  content: Element,
  elements: (HTMLElement | null)[]
): Section[][] {
  const sections: Section[][] = elements.map(() => [])
  for (const heading of content.querySelectorAll<HTMLElement>("h1, h2, h3")) {
    const text = heading.textContent?.trim()
    if (!text || heading.closest(".sr-only, [data-footnotes]")) continue
    let turn = -1
    elements.forEach((element, index) => {
      if (
        element &&
        element.compareDocumentPosition(heading) &
          Node.DOCUMENT_POSITION_FOLLOWING &&
        !element.contains(heading)
      )
        turn = index
    })
    if (turn >= 0) sections[turn]!.push({ element: heading, text })
  }
  return sections
}

/** A conversation's turns, inside MessageScrollerProvider beside its viewport. */
function ConversationMinimap({
  items,
  onSelect,
  labels: labelsProp,
  side = "end",
  resting = "full",
  className,
  ref,
  style,
  ...props
}: Omit<React.ComponentProps<"nav">, "onSelect"> & {
  items: ConversationMinimapItem[]
  /** The viewport's side it sits at; its cards open towards the content. */
  side?: "start" | "end"
  /**
   * Until the pointer or focus is on it: "full", or "quiet", its ticks
   * short and faint.
   */
  resting?: "full" | "quiet"
  /** After a jump is attempted; false means the message is not rendered. */
  onSelect?: (id: string, scrolled: boolean) => void
  labels?: Partial<ConversationMinimapLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const cardSide = side === "start" ? "inline-end" : "inline-start"
  const nav = React.useRef<HTMLElement>(null)
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([])
  const { scrollToMessage } = useMessageScroller()
  const { start, end } = useMessageScrollerScrollable()
  const hasItems = items.length >= 2
  const [place, setPlace] = React.useState({
    room: true,
    enoughHeight: true,
    top: undefined as number | undefined,
  })
  const shown = (start || end) && place.room && place.enoughHeight
  const [state, setState] = React.useState({
    current: 0,
    inView: [] as boolean[],
    // Each turn's reply's headings, two or more, else none.
    sections: [] as Section[][],
    // The heading of the current turn's reply being read, or -1.
    section: -1,
  })
  // The row the pointer is over, for the ticks near it to grow.
  const [pointed, setPointed] = React.useState<number | null>(null)
  const [focused, setFocused] = React.useState<string | null>(null)
  // The pointer over it, or focus in it: awake, as wide and dark as ever.
  const [hovered, setHovered] = React.useState(false)
  const [focusIn, setFocusIn] = React.useState(false)
  const quiet = resting === "quiet" && !hovered && !focusIn
  const current = Math.min(state.current, Math.max(0, items.length - 1))

  React.useLayoutEffect(() => {
    const root = nav.current?.closest<HTMLElement>(
      "[data-slot=message-scroller]"
    )
    if (!root) return
    const area = nav.current?.closest("[data-slot=conversation-details-area]")
    const observed = new Set<Element>()
    let frame = 0
    const measure = () => {
      frame = 0
      const bounds = root.getBoundingClientRect()
      const column = root.querySelector<HTMLElement>(
        "[data-slot=agent-app-column]"
      )
      // The details card is at the end: a map at the start is beside it.
      const card =
        side === "end"
          ? area?.querySelector<HTMLElement>(
              "[data-slot=conversation-details-card]"
            )
          : null
      for (const element of [column, card]) {
        if (element && !observed.has(element)) {
          observed.add(element)
          sizes.observe(element)
        }
      }
      let room = true
      if (column) {
        const rect = column.getBoundingClientRect()
        const padding = getComputedStyle(column)
        const rtl = getComputedStyle(root).direction === "rtl"
        // The room on the nav's side: the left for start, or end in RTL.
        const margin =
          rtl !== (side === "start")
            ? rect.left + parseFloat(padding.paddingLeft) - bounds.left
            : bounds.right - rect.right + parseFloat(padding.paddingRight)
        room = margin >= inset + navWidth + clearance
      }
      const bottom = card?.getBoundingClientRect().bottom
      const top = bottom === undefined ? undefined : bottom - bounds.top + gap
      const enoughHeight =
        bottom === undefined ||
        bounds.bottom - bottom - gap - bottomPadding >= minimumHeight
      setPlace((previous) =>
        previous.room === room &&
        previous.top === top &&
        previous.enoughHeight === enoughHeight
          ? previous
          : { room, top, enoughHeight }
      )
    }
    const schedule = () => {
      frame ||= requestAnimationFrame(measure)
    }
    const sizes = new ResizeObserver(schedule)
    sizes.observe(root)
    // Find columns added later, even while the nav is hidden.
    const columns = new MutationObserver(schedule)
    columns.observe(root, { childList: true, subtree: true })
    const cards = new MutationObserver(schedule)
    if (area) cards.observe(area, { childList: true })
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      sizes.disconnect()
      columns.disconnect()
      cards.disconnect()
    }
  }, [hasItems, side])

  React.useEffect(() => {
    if (!hasItems || !shown) return
    const viewport = nav.current
      ?.closest("[data-slot=message-scroller]")
      ?.querySelector<HTMLElement>("[data-slot=message-scroller-viewport]")
    const content = viewport?.firstElementChild
    if (!viewport || !content) return
    let frame = 0
    const measure = () => {
      frame = 0
      const top = viewport.getBoundingClientRect().top + viewport.clientTop
      const height = viewport.clientHeight
      const tops = items.map(
        ({ id }) =>
          viewport
            .querySelector<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`)
            ?.getBoundingClientRect().top
      )
      let current = 0
      tops.forEach((position, index) => {
        if (position !== undefined && position - top <= height / 4)
          current = index
      })
      // The headings of each turn's reply: after its message, before the
      // next turn's, not in a message of the reader's.
      const elements = items.map((item) =>
        viewport.querySelector<HTMLElement>(
          `[data-message-id="${CSS.escape(item.id)}"]`
        )
      )
      const found = headingsOf(content, elements)
      // The app's, where it gives them, found in the reply if rendered.
      const sections: Section[][] = items.map((item, index) =>
        item.sections
          ? item.sections.map((text) => ({
              text,
              element:
                found[index]!.find((heading) => heading.text === text)
                  ?.element ?? null,
            }))
          : found[index]!
      )
      for (const [index, list] of sections.entries())
        if (list.length < 2) sections[index] = []
      let section = -1
      sections[current]?.forEach((heading, index) => {
        const box = heading.element?.getBoundingClientRect()
        if (box && box.top - top <= height / 4) section = index
      })
      let nextTop = content.getBoundingClientRect().bottom
      const inView = Array<boolean>(items.length).fill(false)
      for (let index = tops.length - 1; index >= 0; index--) {
        const position = tops[index]
        if (position === undefined) continue
        inView[index] = position - top < height && nextTop - top > 0
        nextTop = position
      }
      setState((previous) =>
        previous.current === current &&
        previous.section === section &&
        previous.inView.length === inView.length &&
        previous.inView.every((value, index) => value === inView[index]) &&
        previous.sections.length === sections.length &&
        previous.sections.every(
          (list, index) =>
            list.length === sections[index]!.length &&
            list.every(
              (heading, at) =>
                heading.element === sections[index]![at]!.element &&
                heading.text === sections[index]![at]!.text
            )
        )
          ? previous
          : { current, inView, sections, section }
      )
    }
    const schedule = () => {
      frame ||= requestAnimationFrame(measure)
    }
    const sizes = new ResizeObserver(schedule)
    sizes.observe(viewport)
    sizes.observe(content)
    // Messages added or removed (earlier ones loaded) without the map's
    // items changing; only the content's own rows, not a streaming answer.
    const mutations = new MutationObserver(schedule)
    mutations.observe(content, { childList: true })
    // A reply's headings, as it streams: one measure a frame at most.
    const headings = new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes, ...record.removedNodes].some(
            (node) =>
              node instanceof HTMLElement &&
              (node.matches("h1, h2, h3") ||
                node.querySelector("h1, h2, h3") !== null)
          )
        )
      )
        schedule()
    })
    headings.observe(content, { childList: true, subtree: true })
    viewport.addEventListener("scroll", schedule, { passive: true })
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      sizes.disconnect()
      mutations.disconnect()
      headings.disconnect()
      viewport.removeEventListener("scroll", schedule)
    }
  }, [items, hasItems, shown])

  const select = (index: number) => {
    const item = items[index]
    if (!item) return
    const scrolled = scrollToMessage(item.id, {
      align: "start",
      behavior: "auto",
    })
    onSelect?.(item.id, scrolled)
  }

  // Its rows, a turn's then its reply's sections, as the keys go.
  const rows = items.flatMap((item, turn) => [
    { key: item.id, turn, section: -1 },
    ...(state.sections[turn] ?? []).map((_, section) => ({
      key: `${item.id}#${section}`,
      turn,
      section,
    })),
  ])
  const currentKey =
    state.section >= 0 && state.sections[current]?.[state.section]
      ? `${items[current]?.id}#${state.section}`
      : items[current]?.id
  const focusedRow = rows.findIndex((row) => row.key === focused)
  const tabRow =
    focusedRow >= 0
      ? focusedRow
      : Math.max(
          0,
          rows.findIndex((row) => row.key === currentKey)
        )

  if (!hasItems) return null

  const firstLine = (label: string) =>
    label
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""

  /** A turn's reply's opening: the app's, else its first paragraph. */
  const replyOf = (turn: number) => {
    const item = items[turn]!
    if (item.reply !== undefined) return item.reply
    const viewport = nav.current
      ?.closest("[data-slot=message-scroller]")
      ?.querySelector<HTMLElement>("[data-slot=message-scroller-viewport]")
    let element = viewport?.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(item.id)}"]`
    )?.nextElementSibling
    const next = items[turn + 1]?.id
    for (; element; element = element.nextElementSibling) {
      if (element.getAttribute("data-message-id") === next) break
      const paragraph = element.querySelector("p, li")?.textContent?.trim()
      if (paragraph) return paragraph
    }
    return undefined
  }

  const tick = (row: (typeof rows)[number], index: number) => {
    const item = items[row.turn]!
    const kind = item.kind ?? "message"
    const sections = state.sections[row.turn] ?? []
    const isSection = row.section >= 0
    const question = firstLine(item.label)
    const name = isSection
      ? sections[row.section]!.text
      : kind === "error"
        ? `${labels.failed}: ${question}`
        : question
    const current = row.key === currentKey
    const turnCurrent = row.turn === state.current
    // Wider as the pointer nears it: 6px over it, 4 and 2 beside.
    const near = pointed === null ? 3 : Math.abs(pointed - index)
    const grow = near === 0 ? 6 : near === 1 ? 4 : near === 2 ? 2 : 0
    const base = isSection
      ? current
        ? 14
        : 10
      : kind === "mark"
        ? 10
        : current || (turnCurrent && !isSection && state.section < 0)
          ? 20
          : 16
    // Quiet: 6px, 10 for the current turn; a heading's 4, 6.
    const rest = isSection
      ? current
        ? 6
        : 4
      : kind === "mark"
        ? 4
        : base === 20
          ? 10
          : 6
    const width = quiet ? rest : Math.min(24, base + grow)
    return (
      <HoverCard>
        <HoverCardTrigger
          delay={100}
          closeDelay={100}
          render={
            <button
              type="button"
              ref={(node) => {
                buttons.current[index] = node
              }}
              aria-label={name}
              aria-current={current ? "location" : undefined}
              data-kind={isSection ? "section" : kind}
              data-in-view={(!isSection && state.inView[row.turn]) || undefined}
              tabIndex={index === tabRow ? 0 : -1}
              onFocus={() => setFocused(row.key)}
              onClick={() => {
                if (!isSection) return select(row.turn)
                const text = sections[row.section]!.text
                const shownHeading = sections[row.section]!.element
                if (shownHeading?.isConnected) {
                  shownHeading.scrollIntoView({ block: "start" })
                  onSelect?.(item.id, true)
                  return
                }
                // Not rendered: to its turn, then to its heading once the
                // reply is.
                const scrolled = scrollToMessage(item.id, {
                  align: "start",
                  behavior: "auto",
                })
                onSelect?.(item.id, scrolled)
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => {
                    const content = nav.current
                      ?.closest("[data-slot=message-scroller]")
                      ?.querySelector<HTMLElement>(
                        "[data-slot=message-scroller-viewport]"
                      )
                    if (!content) return
                    const elements = items.map((each) =>
                      content.querySelector<HTMLElement>(
                        `[data-message-id="${CSS.escape(each.id)}"]`
                      )
                    )
                    const found = headingsOf(content, elements)[row.turn]
                    found
                      ?.find((heading) => heading.text === text)
                      ?.element?.scrollIntoView({ block: "start" })
                  })
                )
              }}
              onKeyDown={(event) => {
                let next: number
                switch (event.key) {
                  case "ArrowUp":
                    next = Math.max(0, index - 1)
                    break
                  case "ArrowDown":
                    next = Math.min(rows.length - 1, index + 1)
                    break
                  case "Home":
                    next = 0
                    break
                  case "End":
                    next = rows.length - 1
                    break
                  default:
                    return
                }
                event.preventDefault()
                event.stopPropagation()
                buttons.current[next]?.focus({ preventScroll: true })
              }}
              className={cn(
                "group/tick flex min-h-0 w-6 shrink cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                // grid: mark
                isSection ? "h-1.5" : "h-2"
              )}
            />
          }
        >
          <span
            aria-hidden="true"
            style={kind === "error" && !isSection ? undefined : { width }}
            className={cn(
              kind === "error" && !isSection
                ? cn(
                    // grid: mark (a status dot)
                    "size-1.5 rotate-45 rounded-none motion-fade motion-safe:transition-colors",
                    quiet ? "bg-muted-foreground/70" : "bg-foreground"
                  )
                : quiet
                  ? cn(
                      "h-0.5 rounded-full bg-muted-foreground/20 motion-fade motion-safe:transition-[width,background-color]",
                      !isSection &&
                        state.inView[row.turn] &&
                        "bg-muted-foreground/40",
                      current && "bg-muted-foreground/70"
                    )
                  : cn(
                      "h-0.5 rounded-full bg-muted-foreground/40 motion-hover group-hover/tick:bg-foreground motion-safe:transition-[width,background-color]",
                      !isSection &&
                        state.inView[row.turn] &&
                        "bg-foreground/70",
                      isSection && turnCurrent && "bg-muted-foreground/70",
                      current && "bg-foreground"
                    )
            )}
          />
        </HoverCardTrigger>
        <HoverCardContent
          side={cardSide}
          align="center"
          sideOffset={8}
          data-slot="conversation-minimap-card"
          className="flex w-72 flex-col gap-1 p-3"
        >
          <p className="line-clamp-2 font-medium">
            {kind === "error" ? `${labels.failed}: ${question}` : question}
          </p>
          <TurnReply read={() => replyOf(row.turn)} />
          {item.attachments && item.attachments.length > 0 && (
            <p className="flex min-w-0 items-center gap-1 text-xs text-subtle-foreground">
              <HugeiconsIcon
                icon={Attachment01Icon}
                strokeWidth={2}
                className="size-3 shrink-0"
              />
              <span className="truncate">{item.attachments.join(", ")}</span>
            </p>
          )}
          {sections.length > 0 && (
            <ol className="mt-1 flex flex-col gap-0.5 border-t pt-2 text-xs text-muted-foreground">
              {sections.map((section, at) => (
                <li
                  key={at}
                  className={cn(
                    "truncate",
                    isSection &&
                      at === row.section &&
                      "font-medium text-foreground"
                  )}
                >
                  {section.text}
                </li>
              ))}
            </ol>
          )}
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <nav
      {...props}
      ref={(node) => {
        nav.current = node
        if (typeof ref === "function") return ref(node)
        if (ref) ref.current = node
      }}
      hidden={!shown}
      style={{ ...style, top: place.top }}
      data-slot="conversation-minimap"
      data-side={side}
      data-awake={hovered || focusIn || undefined}
      data-quiet={quiet || undefined}
      onPointerEnter={(event) => {
        props.onPointerEnter?.(event)
        if (event.pointerType !== "touch") setHovered(true)
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event)
        setHovered(false)
      }}
      onFocus={(event) => {
        props.onFocus?.(event)
        setFocusIn(true)
      }}
      onBlur={(event) => {
        props.onBlur?.(event)
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocusIn(false)
      }}
      aria-label={labels.title}
      className={cn(
        "group/conversation-minimap absolute inset-y-0 z-10 flex w-6 flex-col items-center justify-center pt-12 pb-12 group-data-phone/sidebar-wrapper:hidden pointer-coarse:hidden",
        side === "start" ? "start-2" : "end-2",
        place.top !== undefined && "pt-0",
        className
      )}
    >
      <TurnButton
        label={labels.previous}
        side={cardSide}
        disabled={current <= 0}
        onClick={() => select(current - 1)}
      >
        <HugeiconsIcon
          icon={ArrowUp02Icon}
          strokeWidth={2}
          className="size-3.5"
        />
      </TurnButton>
      <ol
        className="flex min-h-0 flex-col"
        onPointerLeave={() => setPointed(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(null)
        }}
      >
        {items.map((item, turn) => {
          const at = rows.findIndex((row) => row.key === item.id)
          const sections = rows.filter(
            (row) => row.turn === turn && row.section >= 0
          )
          return (
            <li
              key={item.id}
              className="flex min-h-0 shrink flex-col"
              onPointerMove={(event) => {
                const button = (event.target as Element).closest("button")
                const index = buttons.current.indexOf(button)
                if (index >= 0 && index !== pointed) setPointed(index)
              }}
            >
              {tick(rows[at]!, at)}
              {sections.length > 0 && (
                <ol className="flex min-h-0 flex-col">
                  {sections.map((row) => {
                    const index = rows.indexOf(row)
                    return (
                      <li key={row.key} className="flex min-h-0 shrink">
                        {tick(row, index)}
                      </li>
                    )
                  })}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
      <TurnButton
        label={labels.next}
        side={cardSide}
        disabled={current >= items.length - 1}
        onClick={() => select(current + 1)}
      >
        <HugeiconsIcon
          icon={ArrowDown02Icon}
          strokeWidth={2}
          className="size-3.5"
        />
      </TurnButton>
    </nav>
  )
}

/**
 * A reply's opening in a turn's card: two lines of it, read as the card
 * opens, not as the map renders.
 */
function TurnReply({ read }: { read: () => string | undefined }) {
  const [reply] = React.useState(read)
  if (!reply) return null
  return <p className="line-clamp-2 text-xs text-muted-foreground">{reply}</p>
}

export {
  ConversationMinimap,
  type ConversationMinimapItem,
  type ConversationMinimapLabels,
}
