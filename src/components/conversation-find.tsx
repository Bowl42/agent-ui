"use client"

import * as React from "react"
import { cn } from "cn"

import { FoldFindable } from "@/hooks/use-fold"
import { textMatches } from "@/components/search-highlight"
import { ViewerFind } from "@/components/viewer"
import {
  useMessageScrollerRelease,
  useMessageScrollerShowAll,
} from "@/components/ui/message-scroller"

type ConversationFindLabels = {
  find: string
  previous: string
  next: string
  close: string
  /** "3 of 12"; past the cap, `more` and "3 of 1000+". */
  count: (current: number, total: number, more: boolean) => string
  none: string
}

const defaultLabels: ConversationFindLabels = {
  find: "Find in conversation",
  previous: "Previous match",
  next: "Next match",
  close: "Close find",
  count: (current, total, more) => `${current} of ${total}${more ? "+" : ""}`,
  none: "No results",
}

const allHighlight = "conversation-find"
const currentHighlight = "conversation-find-current"
const excluded =
  '[data-slot=conversation-find-bar],script,style,template,noscript,textarea,input,[aria-hidden=true],[inert],.sr-only,[hidden]:not([hidden="until-found"])'

function clearHighlights() {
  if (typeof CSS === "undefined" || !CSS.highlights) return
  CSS.highlights.delete(allHighlight)
  CSS.highlights.delete(currentHighlight)
}

// The matches kept, counted and drawn: past it, "1000+". A letter typed
// alone matches everywhere; making and drawing a range for each of a long
// conversation's hundreds of thousands would block typing.
const matchLimit = 1000

/** The matches in order, up to `matchLimit`, and whether there are more. */
function findRanges(root: HTMLElement, query: string) {
  const ranges: Range[] = []
  // Reject whole subtrees, without inspecting layout: skipped content and
  // hidden-until-found panels still supply their DOM text.
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) =>
        node instanceof Element
          ? node.matches(excluded)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_SKIP
          : NodeFilter.FILTER_ACCEPT,
    }
  )
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const match of textMatches((node as Text).data, [query])) {
      const range = document.createRange()
      range.setStart(node, match.start)
      range.setEnd(node, match.end)
      if (ranges.length === matchLimit) return { ranges, more: true }
      ranges.push(range)
    }
  }
  return { ranges, more: false }
}

/**
 * Opens hidden-until-found ancestors with `beforematch`, outermost first.
 * Clipping parts (Clamp, or an app's own) handle the bubbling `revealmatch`
 * event with `detail.range` to expose the match without changing its text.
 */
function revealMatch(range: Range) {
  const start =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement
  const ancestors: Element[] = []
  for (let element = start; element; element = element.parentElement)
    if (element.getAttribute("hidden") === "until-found")
      ancestors.push(element)
  for (const element of ancestors.reverse())
    element.dispatchEvent(new Event("beforematch", { bubbles: true }))
  start?.dispatchEvent(
    new CustomEvent("revealmatch", { bubbles: true, detail: { range } })
  )
}

type Found = { ranges: Range[]; more: boolean; index: number }
const none: Found = { ranges: [], more: false, index: -1 }

// Frames to reveal and scroll to a match in: folds in folds open one a
// frame or two (each fold's text found again in its content).
const maxFrames = 30

type FindContext = {
  open: boolean
  setOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
  total: number
  /** More matches than are counted: "1000+". */
  more: boolean
  current: number
  step: (by: 1 | -1) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}
const ConversationFindContext = React.createContext<FindContext | null>(null)

function useConversationFind() {
  const context = React.useContext(ConversationFindContext)
  if (!context)
    throw new Error("useConversationFind must be used inside ConversationFind")
  return context
}

/** DOM text find over mounted messages, including findable folds. */
function ConversationFind({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
  onKeyDown,
  ref,
  ...props
}: React.ComponentProps<"div"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [localOpen, setLocalOpen] = React.useState(defaultOpen)
  const open = openProp ?? localOpen
  const [query, setQuery] = React.useState("")
  const [navigation, navigate] = React.useReducer(
    (value: number) => value + 1,
    0
  )
  const [found, setFound] = React.useState<Found>(none)
  // The match being revealed from a closed fold's text: the element the
  // fold's text was in, and which match in it it is. Its content takes
  // the text's place, the range with it; the same match is found there.
  const revealing = React.useRef<{ container: Element; occurrence: number }>(
    null
  )
  const root = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const restore = React.useRef<Element | null>(null)
  const wasOpen = React.useRef(false)
  const scrollFrame = React.useRef(0)
  const release = useMessageScrollerRelease()
  // A windowed conversation's messages all mounted, so all are searched.
  useMessageScrollerShowAll(open)
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setLocalOpen(next)
    onOpenChange?.(next)
  }

  React.useEffect(() => {
    if (open) {
      if (!wasOpen.current) restore.current = document.activeElement
      const frame = requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true })
        inputRef.current?.select()
      })
      wasOpen.current = true
      return () => cancelAnimationFrame(frame)
    }
    if (!open && wasOpen.current) {
      wasOpen.current = false
      clearHighlights()
      const target = restore.current?.isConnected
        ? restore.current
        : root.current?.querySelector<HTMLElement>(
            "[data-slot=message-scroller-viewport]"
          )
      if (target instanceof HTMLElement) target.focus({ preventScroll: true })
    }
    return undefined
  }, [open])

  React.useEffect(() => {
    const element = root.current
    if (!open || !query.trim() || !element) {
      setFound(none)
      return
    }
    const find = (mutation: boolean) => {
      const { ranges, more } = findRanges(element, query.trim())
      if (!mutation) revealing.current = null
      setFound((previous) => {
        // Query changes start at 0, avoiding layout reads over skipped messages.
        let index = mutation ? Math.min(previous.index, ranges.length - 1) : 0
        const old = previous.ranges[previous.index]
        const shown = revealing.current
        if (mutation && old && old.startContainer.isConnected) {
          const after = ranges.findIndex(
            (range) =>
              range.compareBoundaryPoints(Range.START_TO_START, old) >= 0
          )
          if (after >= 0) index = after
        } else if (mutation && shown?.container.isConnected) {
          const inside = ranges.filter((range) =>
            shown.container.contains(range.startContainer)
          )
          const match = inside[Math.min(shown.occurrence, inside.length - 1)]
          if (match) index = ranges.indexOf(match)
        }
        return { ranges, more, index: ranges.length ? Math.max(0, index) : -1 }
      })
    }
    find(false)
    // The first match after typing is gone to; a re-find after the
    // conversation changed (a streamed answer) moves no view.
    navigate()
    let frame = 0
    const observer = new MutationObserver((records) => {
      // Our count and input are not conversation text; observing them would
      // feed the search's own rendering back into another search.
      if (
        records.every((record) =>
          (record.target instanceof Element
            ? record.target
            : record.target.parentElement
          )?.closest("[data-slot=conversation-find-bar]")
        )
      )
        return
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          find(true)
        })
    })
    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [open, query])

  const { ranges, index } = found
  // The matches as found last, for the scroll below to follow as the
  // DOM changes under it (a revealed code fold turning into its lines).
  const latest = React.useRef(found)
  React.useLayoutEffect(() => {
    latest.current = found
  }, [found])
  React.useEffect(() => {
    if (!open) return
    if (
      typeof CSS !== "undefined" &&
      CSS.highlights &&
      typeof Highlight !== "undefined"
    ) {
      // Added one by one: spread, a thousand arguments may overflow the stack.
      const all = new Highlight()
      ranges.forEach((range, each) => {
        if (each !== index) all.add(range)
      })
      CSS.highlights.set(allHighlight, all)
      const current = ranges[index]
      if (current) CSS.highlights.set(currentHighlight, new Highlight(current))
      else CSS.highlights.delete(currentHighlight)
    }
    return clearHighlights
  }, [open, ranges, index])

  React.useEffect(() => {
    cancelAnimationFrame(scrollFrame.current)
    if (!open) return
    release()
    let frames = 0
    let last: DOMRect | undefined
    // Only when the reader goes to a match (typing, Enter, the buttons):
    // a re-find as the conversation changes does not pull the view.
    const scroll = () => {
      const range = latest.current.ranges[latest.current.index]
      if (!range || !range.startContainer.isConnected) {
        if (++frames < maxFrames)
          scrollFrame.current = requestAnimationFrame(scroll)
        return
      }
      // A clipping part inside a revealed panel can only measure its cut
      // after that panel has rendered. Retry its reveal before measuring.
      const hidden = range.startContainer.parentElement?.closest(
        '[hidden="until-found"]'
      )
      if (hidden?.parentElement) {
        const container = hidden.parentElement
        revealing.current = {
          container,
          occurrence: latest.current.ranges
            .filter((each) => container.contains(each.startContainer))
            .indexOf(range),
        }
      }
      revealMatch(range)
      let inside = true
      for (
        let element = range.startContainer.parentElement;
        element && element !== root.current;
        element = element.parentElement
      ) {
        const style = getComputedStyle(element)
        const vertical =
          /^(auto|scroll)$/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight
        const horizontal =
          /^(auto|scroll)$/.test(style.overflowX) &&
          element.scrollWidth > element.clientWidth
        if (!vertical && !horizontal) continue
        const rect = range.getBoundingClientRect()
        const box = element.getBoundingClientRect()
        if (vertical && (rect.top < box.top + 48 || rect.bottom > box.bottom)) {
          element.scrollBy({
            top: rect.top - box.top - Math.max(48, element.clientHeight / 3),
            behavior: "instant",
          })
          inside = false
        }
        if (horizontal && (rect.left < box.left || rect.right > box.right)) {
          element.scrollBy({
            left:
              rect.left < box.left
                ? rect.left - box.left
                : rect.right - box.right,
            behavior: "instant",
          })
          inside = false
        }
      }
      const rect = range.getBoundingClientRect()
      const stable =
        last &&
        rect.top === last.top &&
        rect.left === last.left &&
        rect.height === last.height
      last = rect
      if (++frames < maxFrames && !(inside && stable && rect.height > 0))
        scrollFrame.current = requestAnimationFrame(scroll)
    }
    // Revealed in the frame, not here: a fold may open synchronously
    // (flushSync), which React refuses inside an effect.
    scrollFrame.current = requestAnimationFrame(scroll)
    return () => cancelAnimationFrame(scrollFrame.current)
  }, [open, release, navigation])

  return (
    <ConversationFindContext
      value={{
        open,
        setOpen,
        query,
        setQuery,
        total: ranges.length,
        more: found.more,
        current: index,
        inputRef,
        step: (by) => {
          revealing.current = null
          navigate()
          setFound((previous) =>
            previous.ranges.length
              ? {
                  ...previous,
                  index:
                    (previous.index + by + previous.ranges.length) %
                    previous.ranges.length,
                }
              : previous
          )
        },
      }}
    >
      <div
        {...props}
        ref={(node) => {
          root.current = node
          if (typeof ref === "function") return ref(node)
          if (ref) ref.current = node
        }}
        data-slot="conversation-find"
        className={cn("contents", className)}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (
            event.defaultPrevented ||
            event.nativeEvent.isComposing ||
            event.altKey ||
            event.shiftKey ||
            !(event.metaKey || event.ctrlKey) ||
            event.key.toLowerCase() !== "f"
          )
            return
          event.preventDefault()
          if (!open) setOpen(true)
          else
            requestAnimationFrame(() => {
              inputRef.current?.focus({ preventScroll: true })
              inputRef.current?.select()
            })
        }}
      >
        <style
          href="agentui-conversation-find"
          precedence="default"
        >{`::highlight(conversation-find){background-color:var(--mark);color:inherit}::highlight(conversation-find-current){background-color:var(--mark-current);color:inherit}`}</style>
        <FoldFindable value={open}>{children}</FoldFindable>
      </div>
    </ConversationFindContext>
  )
}

function ConversationFindBar({
  labels: labelsProp,
  className,
}: {
  labels?: Partial<ConversationFindLabels>
  className?: string
}) {
  const {
    open,
    setOpen,
    query,
    setQuery,
    total,
    more,
    current: index,
    inputRef,
    step,
  } = useConversationFind()
  const labels = { ...defaultLabels, ...labelsProp }
  if (!open) return null
  return (
    <div data-slot="conversation-find-bar">
      <ViewerFind
        ref={inputRef}
        type="search"
        variant="floating"
        className={className}
        value={query}
        onValueChange={setQuery}
        status={total ? labels.count(index + 1, total, more) : labels.none}
        onStep={step}
        canStep={total > 0}
        onClose={() => setOpen(false)}
        label={labels.find}
        previousLabel={labels.previous}
        nextLabel={labels.next}
        closeLabel={labels.close}
      />
    </div>
  )
}

export {
  ConversationFind,
  ConversationFindBar,
  useConversationFind,
  revealMatch,
  type ConversationFindLabels,
}
