"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  ListViewIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import {
  MessageOutlineNav,
  type MessageOutlineLabels,
  useMessageOutline,
} from "@/components/message-outline"
import { textRanges } from "@/components/search-highlight"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ViewerFind } from "@/components/viewer"
import { useIsMobile } from "@/hooks/use-mobile"

type MessageReaderLabels = MessageOutlineLabels & {
  search: string
  /** Where the match shown is: "2 of 6". */
  matches: (match: number, matches: number) => string
  noMatches: string
  previousMatch: string
  nextMatch: string
  close: string
  /** On a phone, the button that goes back to the conversation. */
  back: string
  /** On a phone, the button that shows the outline. */
  outline: string
}

const defaultLabels: Omit<MessageReaderLabels, keyof MessageOutlineLabels> = {
  search: "Search in message",
  matches: (match, matches) => `${match} of ${matches}`,
  noMatches: "No results",
  previousMatch: "Previous match",
  nextMatch: "Next match",
  close: "Close",
  back: "Back",
  outline: "Outline",
}

/** The CSS highlights the matches are drawn with. */
const matchHighlight = "message-reader-match"
const currentHighlight = "message-reader-current"

const supportsHighlights = () =>
  typeof CSS !== "undefined" && "highlights" in CSS

/**
 * A message to read on its own, over the conversation: its title and
 * what it is (`description`: "Assistant · 2,140 words · 9 min"), a
 * search of its text alone (Ctrl or ⌘ F; Enter for the next match,
 * Shift+Enter the one before), the app's `actions` (copy, branch), its
 * outline beside it and how far the reader is along the top, and its
 * text at a reading size. On a phone it is the whole screen: back,
 * title, the text, and a bar with the outline, search, how far and the
 * actions. Escape closes it, back where it was opened.
 */
function MessageReader({
  open,
  onOpenChange,
  title,
  description,
  actions,
  menu,
  labels: labelsProp,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Icon buttons for the message, e.g. a `CopyButton`. */
  actions?: React.ReactNode
  /**
   * At the header's end, before close: a ⋯ button with what else can be
   * done, e.g. a `DropdownMenu`. On a phone, opposite back.
   */
  menu?: React.ReactNode
  labels?: Partial<MessageReaderLabels>
  className?: string
  /** The message, e.g. its `Markdown`. */
  children: React.ReactNode
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const phone = useIsMobile()
  // The content, once mounted in the dialog: the outline and the search
  // read it.
  const [content, setContent] = React.useState<HTMLDivElement | null>(null)
  const contentRef = React.useMemo(() => ({ current: content }), [content])
  const outline = useMessageOutline(contentRef)
  const search = React.useRef<HTMLInputElement>(null)
  const [searching, setSearching] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [ranges, setRanges] = React.useState<Range[]>([])
  const [match, setMatch] = React.useState(0)

  // The matches, found again as the query or the text changes.
  React.useEffect(() => {
    if (!content) return
    const find = () => {
      setRanges(textRanges(content, query))
      setMatch(0)
    }
    find()
    const observer = new MutationObserver(find)
    observer.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    return () => observer.disconnect()
  }, [content, query])

  // Drawn as highlights, so the text's own elements are left as they are.
  React.useEffect(() => {
    if (!supportsHighlights()) return
    const current = ranges[match]
    CSS.highlights.set(
      matchHighlight,
      new Highlight(...ranges.filter((range) => range !== current))
    )
    if (current) CSS.highlights.set(currentHighlight, new Highlight(current))
    else CSS.highlights.delete(currentHighlight)
    return () => {
      CSS.highlights.delete(matchHighlight)
      CSS.highlights.delete(currentHighlight)
    }
  }, [ranges, match])

  // The match shown is brought into view, a third of the way down.
  React.useEffect(() => {
    const range = ranges[match]
    const scroller = content?.closest<HTMLElement>(
      "[data-slot=message-reader-scroller]"
    )
    if (!range || !scroller) return
    const top =
      range.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    if (top < 0 || top > scroller.clientHeight - 48)
      scroller.scrollTop += top - scroller.clientHeight / 3
  }, [ranges, match, content])

  const step = (by: number) => {
    if (ranges.length === 0) return
    setMatch((match + by + ranges.length) % ranges.length)
  }

  const searchField = (
    <ViewerFind
      ref={search}
      type="search"
      variant="inline"
      className={phone ? "w-full" : "w-56"}
      value={query}
      onValueChange={setQuery}
      status={
        ranges.length
          ? labels.matches(match + 1, ranges.length)
          : labels.noMatches
      }
      onStep={step}
      canStep={ranges.length > 0}
      label={labels.search}
      previousLabel={labels.previousMatch}
      nextLabel={labels.nextMatch}
    />
  )

  const nav = (
    <MessageOutlineNav
      outline={outline}
      {...(labelsProp ? { labels: labelsProp } : {})}
    />
  )
  const percent = `${Math.round(outline.progress * 100)}%`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="message-reader"
        size={phone ? "default" : "full"}
        sheet={false}
        showCloseButton={false}
        onKeyDown={(event) => {
          // Its own search, not the page's.
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === "f"
          ) {
            event.preventDefault()
            setSearching(true)
            requestAnimationFrame(() => search.current?.select())
          }
        }}
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          phone
            ? "top-0 left-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none ring-0"
            : // Over the whole window, but for a margin round it.
              "rounded-2xl shadow-2xl",
          className
        )}
      >
        <style>{`::highlight(${matchHighlight}) { background-color: var(--mark); color: inherit; } ::highlight(${currentHighlight}) { background-color: var(--mark-current); color: inherit; }`}</style>
        {/* How far the reader is, along the top. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-0.5">
          <div
            className="h-full bg-foreground transition-[width]"
            style={{ width: percent }}
          />
        </div>
        {phone ? (
          <div className="grid h-14 shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center border-b px-1">
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="size-11"
                  aria-label={labels.back}
                />
              }
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </DialogClose>
            <div className="flex min-w-0 flex-col items-center text-center">
              <DialogTitle className="max-w-full truncate text-sm font-semibold">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="max-w-full truncate text-xs">
                  {description}
                </DialogDescription>
              )}
            </div>
            {menu && (
              // As big as back, for a finger.
              <div className="flex justify-center *:size-11">{menu}</div>
            )}
          </div>
        ) : (
          <div className="flex h-14 shrink-0 items-center gap-2 border-b ps-6 pe-3">
            <DialogTitle className="min-w-0 truncate text-sm font-semibold">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="min-w-0 truncate text-xs">
                {description}
              </DialogDescription>
            )}
            <div className="ms-auto flex shrink-0 items-center gap-0.5">
              <div className="me-2">{searchField}</div>
              {actions}
              {menu}
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.close}
                  />
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </DialogClose>
            </div>
          </div>
        )}
        {phone && searching && (
          <div className="shrink-0 border-b px-4 py-2">{searchField}</div>
        )}
        {/* Its outline beside the text where the dialog, not the window,
            is wide enough for both. */}
        <div className="@container/reader flex min-h-0 flex-1">
          {!phone && outline.headings.length > 1 && (
            <div
              data-slot="message-reader-outline"
              className="hidden w-60 shrink-0 px-6 py-6 @3xl/reader:block"
            >
              {nav}
            </div>
          )}
          <div
            data-slot="message-reader-scroller"
            // Scrolled by the keyboard too, when the text has nothing
            // focusable in it (WCAG 2.1.1).
            tabIndex={0}
            className={cn(
              "min-w-0 flex-1 overflow-y-auto outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
              // Beside the outline, nearer it.
              phone
                ? "p-4"
                : outline.headings.length > 1
                  ? "px-8 py-8 @3xl/reader:ps-2 @3xl/reader:pe-12"
                  : "p-8"
            )}
          >
            <div
              ref={setContent}
              data-slot="message-reader-content"
              // Its text 640px at most, larger and further apart than in
              // the conversation, an answer's (Markdown's) included; its
              // section headings a size above the text.
              className={cn(
                "mx-auto max-w-160",
                phone
                  ? "text-base/6 [&_[data-slot=markdown]]:leading-6"
                  : "text-md/6 [&_[data-slot=markdown]]:leading-6 [&_[data-streamdown=heading-2]]:text-lg/7"
              )}
            >
              {children}
            </div>
          </div>
        </div>
        {phone && (
          <div className="flex h-13 shrink-0 items-center justify-around border-t px-2">
            <Popover>
              <PopoverTrigger
                disabled={outline.headings.length < 2}
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="size-11"
                    aria-label={labels.outline}
                  />
                }
              >
                <HugeiconsIcon icon={ListViewIcon} strokeWidth={2} />
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-auto p-3">
                {nav}
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon-lg"
              // Pressed while the search shows.
              className="size-11 aria-pressed:bg-muted"
              aria-label={labels.search}
              aria-pressed={searching}
              onClick={() => {
                setSearching(!searching)
                if (!searching)
                  requestAnimationFrame(() => search.current?.focus())
              }}
            >
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {percent}
            </span>
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { MessageReader, type MessageReaderLabels }
