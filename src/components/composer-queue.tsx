"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowExpand01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDoubleIcon,
  ArrowUpToLineIcon,
  Cancel01Icon,
  Clock01Icon,
  DragDropVerticalIcon,
  File01Icon,
  Image01Icon,
  PencilEdit02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { composerShelf } from "@/components/composer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

/** A file that goes with a queued message. */
type QueuedAttachment = {
  id: string
  name: string
  /** Images show as a thumbnail (`src`) or an image icon. */
  kind?: "image" | "file"
  src?: string
}

/** A message waiting to be sent after the running turn. */
type QueuedMessage = {
  id: string
  /** The message as plain text, as the row shows it. */
  text: string
  attachments?: QueuedAttachment[]
  /** When it was queued, as the app writes it: "2m". */
  time?: string
  /**
   * Before its text, 14px in grey: e.g. what marks a command queued
   * among messages ("Compact conversation").
   */
  icon?: React.ReactNode
  /**
   * `false` where it has no text to edit, e.g. a command: no edit button
   * nor E key on it, only send now and remove. Default `true`.
   */
  editable?: boolean
}

/** A queued message's icon before its text, 14px, in grey. */
function QueueIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span
      data-slot="composer-queue-icon"
      aria-hidden
      className="flex shrink-0 text-muted-foreground [&_svg]:size-3.5"
    >
      {icon}
    </span>
  )
}

const hasIcon = (item: QueuedMessage) =>
  item.icon !== undefined && item.icon !== null && item.icon !== false

type ComposerQueueLabels = {
  queued: (count: number) => string
  /** After `queued`, in grey: when they go, "sent when this turn ends". */
  queuedDetail: string | null
  editing: (position: number) => string
  /** After `editing`, in grey: how to leave the edit. */
  editingDetail: string
  paused: string
  more: (count: number) => string
  less: string
  clear: string
  clearAll: string
  pause: string
  resume: string
  cancel: string
  save: string
  manage: string
  move: (position: number) => string
  edit: string
  sendNow: string
  sendNext: string
  remove: string
  moveToTop: string
  moveToBottom: string
  sending: string
  justQueued: string
  files: (count: number) => string
  /** A message's images, in the manager: "2 images". */
  images: (count: number) => string
  /** What screen readers hear. */
  announceQueued: (text: string) => string
  announceMoved: (position: number, count: number) => string
  announceRemoved: (count: number) => string
  title: string
  messages: (count: number) => string
  filter: string
  selected: (count: number) => string
  /** At the selection bar's end, in grey: how to clear it. */
  clearSelection: string
  select: (position: number) => string
  shown: (shown: number, count: number) => string
  empty: string
  close: string
  keys: {
    move: string
    reorder: string
    select: string
    edit: string
    remove: string
    sendNow: string
  }
}

const defaultLabels: ComposerQueueLabels = {
  queued: (count) => `${count} queued`,
  queuedDetail: null,
  editing: (position) => `Editing queued message ${position}`,
  editingDetail: "Esc puts it back",
  paused: "Queue paused",
  more: (count) => `${count} more`,
  less: "Show less",
  clear: "Clear",
  clearAll: "Clear all",
  pause: "Pause",
  resume: "Resume",
  cancel: "Cancel",
  save: "Save",
  manage: "Manage queue",
  move: (position) => `Move message ${position}`,
  edit: "Edit",
  sendNow: "Send now",
  sendNext: "Send next",
  remove: "Remove",
  moveToTop: "Move to top",
  moveToBottom: "Move to bottom",
  sending: "Sending…",
  justQueued: "Queued",
  files: (count) => (count === 1 ? "1 file" : `${count} files`),
  images: (count) => (count === 1 ? "1 image" : `${count} images`),
  announceQueued: (text) => `Queued: ${text}`,
  announceMoved: (position, count) =>
    `Moved to position ${position} of ${count}`,
  announceRemoved: (count) =>
    count === 1 ? "Removed from the queue" : `Removed ${count} from the queue`,
  title: "Queue",
  messages: (count) => (count === 1 ? "1 message" : `${count} messages`),
  filter: "Filter",
  selected: (count) => `${count} selected`,
  clearSelection: "Esc to clear",
  select: (position) => `Select message ${position}`,
  shown: (shown, count) => `${shown} of ${count}`,
  empty: "No messages match",
  close: "Close",
  keys: {
    move: "move",
    reorder: "reorder",
    select: "select",
    edit: "edit",
    remove: "remove",
    sendNow: "send now",
  },
}

type ComposerQueueProps = {
  /** The queue, in the order it is sent. The app owns it. */
  items: QueuedMessage[]
  /** The message being edited in the composer, shown struck through. */
  editing?: string | null
  /** Whether the first message is being sent. */
  sending?: boolean
  /** Whether the queue waits instead of sending when a turn ends. */
  paused?: boolean
  /** Why it is paused: "the last turn stopped with an error". */
  pausedReason?: string
  /**
   * What runs now, for the manager: "Running · the next one is sent when
   * this turn ends".
   */
  status?: React.ReactNode
  /** After `status`, in grey: how long the turn has run, "1m 12s in". */
  statusDetail?: React.ReactNode
  /** More messages than this show only the first and how many more. */
  collapseAfter?: number
  /** The new order, every message's id. */
  onReorder?: (ids: string[]) => void
  /** Puts a message back in the composer to edit. */
  onEdit?: (id: string) => void
  /** Leaves the message being edited as it was. */
  onCancelEdit?: () => void
  /** Changes a message's text in place, from the manager. */
  onSaveEdit?: (id: string, text: string) => void
  /** Stops the running turn and sends this message now. */
  onSendNow?: (id: string) => void
  onRemove?: (ids: string[]) => void
  onClear?: () => void
  onPause?: () => void
  onResume?: () => void
  labels?: Partial<ComposerQueueLabels>
  className?: string
}

/** `visible`, reordered, put back in `all` in the places they held. */
function applyOrder(all: string[], visible: string[]) {
  const shown = new Set(visible)
  let next = 0
  return all.map((id) => (shown.has(id) ? visible[next++]! : id))
}

function moveIn<T>(list: T[], from: number, to: number) {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

type DragState = {
  id: string
  from: number
  to: number
  dy: number
  tops: number[]
  heights: number[]
}

/**
 * Reordering by dragging a handle (mouse, pen or finger): the row follows
 * the pointer, the others make room, and a dashed slot shows where it
 * lands.
 */
function useDragReorder(
  ids: string[],
  onReorder: ((ids: string[]) => void) | undefined
) {
  const list = React.useRef<HTMLOListElement>(null)
  const start = React.useRef<{
    id: string
    y: number
    tops: number[]
    heights: number[]
  } | null>(null)
  const [drag, setDrag] = React.useState<DragState | null>(null)

  const handleProps = (id: string) => ({
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      if (event.button !== 0 || !onReorder || !list.current) return
      const rows = Array.from(
        list.current.querySelectorAll<HTMLElement>(":scope > [data-queue-id]")
      )
      start.current = {
        id,
        y: event.clientY,
        tops: rows.map((row) => row.offsetTop),
        heights: rows.map((row) => row.offsetHeight),
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // A pointer the browser no longer has, e.g. a synthetic one.
      }
    },
    onPointerMove(event: React.PointerEvent<HTMLElement>) {
      const origin = start.current
      if (!origin || origin.id !== id) return
      const from = ids.indexOf(id)
      const { tops, heights } = origin
      const last = tops.length - 1
      // Within the list.
      const dy = Math.min(
        Math.max(event.clientY - origin.y, tops[0]! - tops[from]!),
        tops[last]! + heights[last]! - heights[from]! - tops[from]!
      )
      if (!drag && Math.abs(dy) < 4) return
      const center = tops[from]! + heights[from]! / 2 + dy
      let to = 0
      for (let index = 0; index < tops.length; index++) {
        if (index === from) continue
        if (center > tops[index]! + heights[index]! / 2) to++
      }
      setDrag({ id, from, to, dy, tops, heights })
    },
    onPointerUp() {
      start.current = null
      if (drag && drag.to !== drag.from) {
        onReorder?.(moveIn(ids, drag.from, drag.to))
      }
      setDrag(null)
    },
    onPointerCancel() {
      start.current = null
      setDrag(null)
    },
  })

  const rowStyle = (index: number): React.CSSProperties | undefined => {
    if (!drag) return undefined
    const { from, to, dy, heights } = drag
    if (index === from) return { transform: `translateY(${dy}px)` }
    if (from < index && index <= to)
      return { transform: `translateY(${-heights[from]!}px)` }
    if (to <= index && index < from)
      return { transform: `translateY(${heights[from]!}px)` }
    return undefined
  }

  const slot = drag
    ? {
        top:
          drag.to > drag.from
            ? drag.tops[drag.to]! +
              drag.heights[drag.to]! -
              drag.heights[drag.from]!
            : drag.tops[drag.to]!,
        height: drag.heights[drag.from]!,
      }
    : null

  return { list, drag, handleProps, rowStyle, slot }
}

/** Keeps focus on what had it when a reorder moves it in the page. */
function useKeepFocus(key: string) {
  const pending = React.useRef<HTMLElement | null>(null)
  React.useLayoutEffect(() => {
    const element = pending.current
    pending.current = null
    if (element?.isConnected && document.activeElement !== element) {
      element.focus({ preventScroll: true })
    }
  }, [key])
  return () => {
    pending.current = document.activeElement as HTMLElement | null
  }
}

function useAnnouncer() {
  const [message, setMessage] = React.useState("")
  // The same words again are still news: alternate a trailing space.
  const announce = React.useCallback(
    (text: string) =>
      setMessage((previous) =>
        previous === text ? `${text}${String.fromCharCode(160)}` : text
      ),
    []
  )
  const region = (
    <div role="status" className="sr-only">
      {message}
    </div>
  )
  return [announce, region] as const
}

function QueueIndex({
  position,
  next,
  className,
}: {
  position: number
  next?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-slot="composer-queue-index"
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-xs text-2xs text-subtle-foreground tabular-nums ring-1 ring-border ring-inset",
        next && "bg-foreground text-background ring-0",
        className
      )}
    >
      {position}
    </span>
  )
}

function QueueThumbs({ attachments }: { attachments: QueuedAttachment[] }) {
  return (
    <span aria-hidden className="flex shrink-0 gap-1">
      {attachments.slice(0, 2).map((attachment) => (
        <span
          key={attachment.id}
          data-slot="composer-queue-thumb"
          className="grid size-5 place-items-center overflow-hidden rounded-xs bg-background text-muted-foreground ring-1 ring-border ring-inset [&_svg]:size-3"
        >
          {attachment.kind === "image" && attachment.src ? (
            <img
              src={attachment.src}
              alt=""
              className="size-full object-cover"
            />
          ) : attachment.kind === "image" ? (
            <HugeiconsIcon icon={Image01Icon} strokeWidth={2} />
          ) : (
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          )}
        </span>
      ))}
    </span>
  )
}

/**
 * A row's drag handle: a bare 14px glyph in the faintest grey, so the
 * index and text sit close; its target reaches past it, 30 by 28 (and a
 * finger's 38 by 44).
 */
const queueHandle =
  // grid: mark
  "relative grid h-5 w-3.5 shrink-0 cursor-grab touch-none place-items-center rounded-xs text-subtle-foreground outline-none after:absolute after:-inset-x-2 after:-inset-y-1 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-default disabled:opacity-50 pointer-coarse:after:-inset-3 [&_svg]:size-3.5"

/** A text area as tall as its text, as the text it replaces. */
function fitText(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return
  textarea.style.height = "auto"
  textarea.style.height = `${textarea.scrollHeight}px`
}

/** An action: 26px, 40px to a finger; a row's icons are 14px. */
function IconAction({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            className={cn(
              "size-7 text-muted-foreground pointer-coarse:size-10",
              className
            )}
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

/** A move by the keyboard: Alt (Option) with an arrow. */
function arrowMove(event: React.KeyboardEvent) {
  if (!event.altKey || event.metaKey || event.ctrlKey) return 0
  if (event.key === "ArrowUp") return -1
  if (event.key === "ArrowDown") return 1
  return 0
}

/**
 * The messages queued while a turn runs, on a shelf above the composer:
 * sent in order, one each time a turn ends. Each can be edited (back in
 * the composer), sent now (stopping the running turn), removed or moved,
 * by dragging or with Alt+ArrowUp and Alt+ArrowDown. Past `collapseAfter`
 * it shows the first and how many more, and opens a manager for them all.
 * The app owns the queue: the shelf shows `items` and asks for changes.
 */
function ComposerQueue({
  items,
  editing = null,
  sending = false,
  paused = false,
  pausedReason,
  status,
  statusDetail,
  collapseAfter = 3,
  onReorder,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onSendNow,
  onRemove,
  onClear,
  onPause,
  onResume,
  labels: labelsProp,
  className,
}: ComposerQueueProps) {
  const labels = {
    ...defaultLabels,
    ...labelsProp,
    keys: { ...defaultLabels.keys, ...labelsProp?.keys },
  }
  const ids = items.map((item) => item.id)
  const order = ids.join("\n")
  const [expanded, setExpanded] = React.useState(false)
  const [managing, setManaging] = React.useState(false)
  const phone = useIsMobile()
  const [announce, region] = useAnnouncer()
  const keepFocus = useKeepFocus(order)
  const headerId = React.useId()
  const textId = React.useId()

  // A message that has just come in is marked for a moment, and read out.
  const seen = React.useRef<Set<string> | null>(null)
  const [fresh, setFresh] = React.useState<string | null>(null)
  React.useEffect(() => {
    const previous = seen.current
    seen.current = new Set(order ? order.split("\n") : [])
    if (!previous) return
    const added = items.filter((item) => !previous.has(item.id))
    if (added.length !== 1) return
    setFresh(added[0]!.id)
    announce(labels.announceQueued(added[0]!.text))
    // Only when the order changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])
  React.useEffect(() => {
    if (fresh === null) return
    const timer = setTimeout(() => setFresh(null), 2000)
    return () => clearTimeout(timer)
  }, [fresh])

  const collapsible = items.length > collapseAfter
  const shown = collapsible && !expanded ? items.slice(0, 1) : items
  const { list, drag, handleProps, rowStyle, slot } = useDragReorder(
    shown.map((item) => item.id),
    onReorder &&
      ((visible) => {
        onReorder(applyOrder(ids, visible))
      })
  )

  const move = (id: string, delta: number) => {
    const visible = shown.map((item) => item.id)
    const from = visible.indexOf(id)
    const to = from + delta
    if (!onReorder || to < 0 || to >= visible.length) return
    keepFocus()
    onReorder(applyOrder(ids, moveIn(visible, from, to)))
    announce(labels.announceMoved(ids.indexOf(visible[to]!) + 1, ids.length))
  }

  // To the top, past the one being sent if there is one.
  const top = sending ? 1 : 0
  const toTop = (id: string) => {
    if (!onReorder) return
    const rest = ids.filter((each) => each !== id)
    keepFocus()
    onReorder([...rest.slice(0, top), id, ...rest.slice(top)])
    announce(labels.announceMoved(top + 1, ids.length))
  }

  const remove = (removed: string[]) => {
    onRemove?.(removed)
    announce(labels.announceRemoved(removed.length))
  }

  // Before a row goes, focus on it moves to the next one's handle (or the
  // previous one's), rather than being lost with it.
  const leave = (id: string) => {
    const index = shown.findIndex((item) => item.id === id)
    const next = shown[index + 1] ?? shown[index - 1]
    if (!next || !list.current?.contains(document.activeElement)) return
    list.current
      .querySelector<HTMLElement>(
        `[data-queue-id="${CSS.escape(next.id)}"] [data-slot=composer-queue-handle]`
      )
      ?.focus()
  }

  if (items.length === 0) return null
  const editingIndex = editing === null ? -1 : ids.indexOf(editing)

  const dialog = (
    <ComposerQueueDialog
      open={managing}
      onOpenChange={setManaging}
      items={items}
      sending={sending}
      paused={paused}
      pausedReason={pausedReason}
      status={status}
      statusDetail={statusDetail}
      labels={labels}
      onReorder={onReorder}
      onEdit={
        onEdit &&
        ((id) => {
          setManaging(false)
          onEdit(id)
        })
      }
      onSaveEdit={onSaveEdit}
      onSendNow={onSendNow}
      onRemove={onRemove && remove}
      onPause={onPause}
      onResume={onResume}
      announce={announce}
    />
  )

  // On a phone, one row over the composer: the next message and how many
  // more; pressed, the whole queue, full screen. Edited, the shelf.
  if (phone && editingIndex < 0) {
    const first = items[0]!
    return (
      <section
        data-slot="composer-queue"
        data-composer-shelf=""
        data-collapsed=""
        aria-labelledby={headerId}
        className={cn(
          composerShelf,
          "px-0 pt-0 pb-4 [&:has(+[data-composer-shelf])]:pb-0",
          className
        )}
      >
        <span id={headerId} className="sr-only">
          {paused
            ? [labels.paused, pausedReason].filter(Boolean).join(" · ")
            : labels.queued(items.length)}
        </span>
        <button
          type="button"
          data-slot="composer-queue-summary"
          aria-haspopup="dialog"
          onClick={() => setManaging(true)}
          className="flex h-9 w-full items-center gap-2 rounded-t-xl px-3 text-start text-2sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:size-3.5 [&>svg]:shrink-0"
        >
          {sending ? (
            <Spinner aria-label={labels.sending} />
          ) : paused ? (
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden />
          ) : (
            <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} aria-hidden />
          )}
          {hasIcon(first) && <QueueIcon icon={first.icon} />}
          <span className="min-w-0 flex-1 truncate text-foreground">
            {first.text}
          </span>
          {items.length > 1 ? (
            <span className="tabular-nums">+{items.length - 1}</span>
          ) : null}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} aria-hidden />
        </button>
        {region}
        {dialog}
      </section>
    )
  }

  return (
    <section
      data-slot="composer-queue"
      data-composer-shelf=""
      aria-labelledby={headerId}
      className={cn(composerShelf, "text-sm", className)}
    >
      <div
        data-slot="composer-queue-header"
        className="flex min-h-7 items-center gap-1 ps-2 pe-1 text-xs text-muted-foreground [&>svg]:size-3 [&>svg]:shrink-0 [&>svg]:text-subtle-foreground"
      >
        {editingIndex >= 0 ? (
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} aria-hidden />
        ) : paused ? (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden />
        ) : (
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} aria-hidden />
        )}
        <span className="min-w-0 truncate text-subtle-foreground">
          <span id={headerId}>
            {editingIndex >= 0
              ? labels.editing(editingIndex + 1)
              : paused
                ? [labels.paused, pausedReason].filter(Boolean).join(" · ")
                : labels.queued(items.length)}
          </span>
          {/* How to leave the edit, or when they go; not part of the
              shelf's name. */}
          {editingIndex >= 0
            ? labels.editingDetail && ` · ${labels.editingDetail}`
            : !paused && labels.queuedDetail && ` · ${labels.queuedDetail}`}
        </span>
        <span className="ms-auto flex shrink-0 items-center gap-0.5">
          {editingIndex >= 0 && onCancelEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onCancelEdit}
            >
              {labels.cancel}
            </Button>
          ) : paused ? (
            <>
              {onClear && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  // Dark, as a button's words are; not the header's grey.
                  className="text-foreground"
                  onClick={onClear}
                >
                  {labels.clear}
                </Button>
              )}
              {onResume && (
                <Button type="button" size="xs" onClick={onResume}>
                  {labels.resume}
                </Button>
              )}
            </>
          ) : collapsible || onReorder ? (
            // Past a few, Clear all; the manager wherever they can be
            // moved, to find how.
            <>
              {collapsible && onClear && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  // Dark, as a button's words are; not the header's grey.
                  className="text-foreground"
                  onClick={onClear}
                >
                  {labels.clearAll}
                </Button>
              )}
              <IconAction
                label={labels.manage}
                aria-haspopup="dialog"
                onClick={() => setManaging(true)}
              >
                <HugeiconsIcon icon={ArrowExpand01Icon} strokeWidth={2} />
              </IconAction>
            </>
          ) : null}
        </span>
      </div>
      <ol
        ref={list}
        data-slot="composer-queue-list"
        className={cn(
          "relative flex flex-col",
          expanded && "max-h-60 overflow-y-auto"
        )}
      >
        {shown.map((item, index) => {
          const isSending = sending && index === 0
          const isEditing = item.id === editing
          const lifted = drag?.id === item.id
          const files = item.attachments ?? []
          return (
            <li
              key={item.id}
              data-queue-id={item.id}
              data-slot="composer-queue-item"
              data-sending={isSending || undefined}
              data-editing={isEditing || undefined}
              data-fresh={fresh === item.id || undefined}
              data-dragging={lifted || undefined}
              style={rowStyle(index)}
              onKeyDown={(event) => {
                const delta = arrowMove(event)
                if (!delta) return
                event.preventDefault()
                move(item.id, delta)
              }}
              className={cn(
                // The one going out in the text's colour.
                "group/queue-item relative flex h-8 items-center gap-2 rounded-md ps-2 pe-1 text-2sm text-muted-foreground data-sending:text-foreground pointer-coarse:h-11",
                drag && !lifted && "transition-transform motion-fade",
                "ring-border focus-within:bg-background focus-within:ring-1 hover:bg-background hover:ring-1 data-fresh:bg-background data-fresh:ring-1 dark:focus-within:bg-muted dark:hover:bg-muted dark:data-fresh:bg-muted",
                // Lifted: 8px aside, over its neighbours.
                lifted &&
                  "z-10 translate-x-2 bg-background shadow-lg ring-1 dark:bg-muted",
                isEditing && "opacity-40"
              )}
            >
              {isSending ? (
                // grid: mark (as wide as a handle)
                <span className="grid h-5 w-3.5 shrink-0 place-items-center text-muted-foreground">
                  <Spinner className="size-3.5" aria-label={labels.sending} />
                </span>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        data-slot="composer-queue-handle"
                        aria-label={labels.move(index + 1)}
                        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                        disabled={!onReorder || isEditing}
                        className={cn(
                          queueHandle,
                          lifted && "hover:text-subtle-foreground"
                        )}
                        {...handleProps(item.id)}
                      />
                    }
                  >
                    <HugeiconsIcon
                      icon={DragDropVerticalIcon}
                      strokeWidth={2}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {labels.keys.reorder} <Kbd>⌥↑</Kbd> <Kbd>⌥↓</Kbd>
                  </TooltipContent>
                </Tooltip>
              )}
              <QueueIndex position={index + 1} />
              {files.length > 0 && <QueueThumbs attachments={files} />}
              {hasIcon(item) && <QueueIcon icon={item.icon} />}
              <span
                id={`${textId}-${item.id}`}
                className={cn(
                  "min-w-0 flex-1 truncate",
                  isEditing && "line-through decoration-muted-foreground"
                )}
              >
                {item.text}
              </span>
              {(isSending || fresh === item.id || files.length > 0) && (
                <span
                  className={cn(
                    "shrink-0 pe-2 text-xs whitespace-nowrap text-muted-foreground",
                    fresh === item.id && !isSending && "text-2xs"
                  )}
                >
                  {isSending
                    ? labels.sending
                    : fresh === item.id
                      ? labels.justQueued
                      : labels.files(files.length)}
                </span>
              )}
              {!isSending && !isEditing && !lifted && (
                <span
                  data-slot="composer-queue-actions"
                  className="absolute end-1 top-1/2 flex -translate-y-1/2 rounded-md bg-inherit opacity-0 group-focus-within/queue-item:opacity-100 group-hover/queue-item:opacity-100 pointer-coarse:static pointer-coarse:translate-y-0 pointer-coarse:opacity-100"
                >
                  {onEdit && item.editable !== false && (
                    <IconAction
                      label={labels.edit}
                      aria-describedby={`${textId}-${item.id}`}
                      onClick={() => onEdit(item.id)}
                    >
                      <HugeiconsIcon
                        icon={PencilEdit02Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                    </IconAction>
                  )}
                  {onReorder && index > top && (
                    <IconAction
                      label={labels.moveToTop}
                      aria-describedby={`${textId}-${item.id}`}
                      onClick={() => toTop(item.id)}
                    >
                      <HugeiconsIcon
                        icon={ArrowUpToLineIcon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                    </IconAction>
                  )}
                  {onSendNow && (
                    <IconAction
                      label={labels.sendNow}
                      aria-describedby={`${textId}-${item.id}`}
                      onClick={() => {
                        leave(item.id)
                        onSendNow(item.id)
                      }}
                    >
                      <HugeiconsIcon
                        icon={ArrowUpDoubleIcon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                    </IconAction>
                  )}
                  {onRemove && (
                    <IconAction
                      label={labels.remove}
                      aria-describedby={`${textId}-${item.id}`}
                      onClick={() => {
                        leave(item.id)
                        remove([item.id])
                      }}
                    >
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                    </IconAction>
                  )}
                </span>
              )}
            </li>
          )
        })}
        {slot && (
          <div
            aria-hidden
            data-slot="composer-queue-slot"
            className="pointer-events-none absolute inset-x-0.5 rounded-lg border border-dashed border-muted-foreground/50"
            style={{ top: slot.top, height: slot.height }}
          />
        )}
      </ol>
      {collapsible && (
        <button
          type="button"
          data-slot="composer-queue-more"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-10 [&_svg]:size-3"
        >
          {expanded ? (
            <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
          ) : (
            <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
          )}
          {expanded ? labels.less : labels.more(items.length - 1)}
        </button>
      )}
      {region}
      {dialog}
    </section>
  )
}

/**
 * Every queued message, to search, select, edit in place, move and
 * remove; opened from the shelf.
 */
function ComposerQueueDialog({
  open,
  onOpenChange,
  items,
  sending,
  paused,
  pausedReason,
  status,
  statusDetail,
  labels,
  onReorder,
  onEdit,
  onSaveEdit,
  onSendNow,
  onRemove,
  onPause,
  onResume,
  announce,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: QueuedMessage[]
  sending: boolean
  paused: boolean
  pausedReason: string | undefined
  status: React.ReactNode
  statusDetail: React.ReactNode
  labels: ComposerQueueLabels
  onReorder: ((ids: string[]) => void) | undefined
  onEdit: ((id: string) => void) | undefined
  onSaveEdit: ((id: string, text: string) => void) | undefined
  onSendNow: ((id: string) => void) | undefined
  onRemove: ((ids: string[]) => void) | undefined
  onPause: (() => void) | undefined
  onResume: (() => void) | undefined
  announce: (text: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])
  const [editing, setEditing] = React.useState<{
    id: string
    text: string
  } | null>(null)
  const filter = React.useRef<HTMLInputElement>(null)
  const toolbar = React.useRef<HTMLDivElement>(null)
  const ids = items.map((item) => item.id)
  const order = ids.join("\n")
  const keepFocus = useKeepFocus(order)
  const textId = React.useId()

  const needle = query.trim().toLowerCase()
  const shown = needle
    ? items.filter((item) => item.text.toLowerCase().includes(needle))
    : items
  const visible = shown.map((item) => item.id)
  const chosen = selected.filter((id) => ids.includes(id))
  const { list, drag, handleProps, rowStyle, slot } = useDragReorder(
    visible,
    onReorder && ((next) => onReorder(applyOrder(ids, next)))
  )

  const reorder = (next: string[]) => {
    keepFocus()
    onReorder?.(next)
  }
  const move = (id: string, delta: number) => {
    const from = visible.indexOf(id)
    const to = from + delta
    if (!onReorder || to < 0 || to >= visible.length) return
    const next = applyOrder(ids, moveIn(visible, from, to))
    reorder(next)
    announce(labels.announceMoved(next.indexOf(id) + 1, ids.length))
  }
  const toEnd = (top: boolean) => {
    const rest = ids.filter((id) => !chosen.includes(id))
    const picked = ids.filter((id) => chosen.includes(id))
    reorder(top ? [...picked, ...rest] : [...rest, ...picked])
  }
  const remove = (removed: string[]) => {
    onRemove?.(removed)
    setSelected((current) => current.filter((id) => !removed.includes(id)))
  }
  const startEdit = (item: QueuedMessage) => {
    if (item.editable === false) return
    if (onSaveEdit) setEditing({ id: item.id, text: item.text })
    else onEdit?.(item.id)
  }
  const saveEdit = () => {
    if (!editing) return
    const { id, text } = editing
    // Focus moves to the row before its editor goes: lost with it, it
    // would go to the dialog.
    focusRow(id)
    setEditing(null)
    if (text.trim()) onSaveEdit?.(id, text)
  }
  const cancelEdit = () => {
    if (!editing) return
    const { id } = editing
    focusRow(id)
    setEditing(null)
  }

  const focusRow = (id: string | undefined) => {
    if (!id) return
    list.current
      ?.querySelector<HTMLElement>(
        `[data-queue-id="${CSS.escape(id)}"] [data-slot=checkbox]`
      )
      ?.focus()
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLOListElement>) {
    const target = event.target as HTMLElement
    if (target.closest("textarea")) return
    const id = target.closest<HTMLElement>("[data-queue-id]")?.dataset.queueId
    if (!id) return
    const index = visible.indexOf(id)
    const item = shown[index]!
    const delta = arrowMove(event)
    if (delta) {
      event.preventDefault()
      move(id, delta)
      return
    }
    if (event.altKey) return
    const mod = event.metaKey || event.ctrlKey
    if (!mod && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault()
      focusRow(visible[index + (event.key === "ArrowDown" ? 1 : -1)])
    } else if (mod && event.key === "Enter" && onSendNow) {
      event.preventDefault()
      onSendNow(id)
    } else if (
      !mod &&
      (event.key === "e" || event.key === "E") &&
      (onSaveEdit || onEdit) &&
      item.editable !== false
    ) {
      event.preventDefault()
      startEdit(item)
    } else if (
      !mod &&
      (event.key === "Delete" || event.key === "Backspace") &&
      onRemove
    ) {
      event.preventDefault()
      const removed = chosen.includes(id) ? chosen : [id]
      const after = visible.filter((other) => !removed.includes(other))
      // Focus goes to the row that takes its place.
      focusRow(after[Math.min(index, after.length - 1)])
      remove(removed)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        // Escape leaves an edit, then a selection, before the dialog.
        if (!next && details.reason === "escape-key") {
          if (editing) {
            cancelEdit()
            return
          }
          if (chosen.length > 0) {
            // Focus in the bar that goes moves to the list first: lost
            // with the bar, it would go to the dialog.
            if (toolbar.current?.contains(document.activeElement)) {
              focusRow(visible.find((id) => chosen.includes(id)))
            }
            setSelected([])
            return
          }
        }
        if (!next) {
          setEditing(null)
          setSelected([])
          setQuery("")
        }
        onOpenChange(next)
      }}
    >
      <DialogContent
        data-slot="composer-queue-dialog"
        showCloseButton={false}
        size="wide"
        className="gap-0 overflow-hidden rounded-2xl p-0 shadow-xl ring-0 max-sm:rounded-none"
        onKeyDown={(event) => {
          const target = event.target as HTMLElement
          if (
            event.key === "/" &&
            !target.closest("input, textarea, [contenteditable]")
          ) {
            event.preventDefault()
            filter.current?.focus()
          }
        }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-1">
          <DialogTitle className="text-md font-semibold">
            {labels.title}
          </DialogTitle>
          <span className="text-2sm text-subtle-foreground">
            {labels.messages(items.length)}
          </span>
          <div className="ms-auto flex items-center gap-1">
            <InputGroup
              // A light field: a hairline on a grey fill; focused, the
              // hairline darkens, without the 3px ring, as it has the
              // focus whenever the dialog opens.
              className="w-56 border-border bg-muted/50 has-[[data-slot=input-group-control]:focus-visible]:ring-0 max-sm:w-36 dark:bg-muted/50"
            >
              <InputGroupInput
                ref={filter}
                type="search"
                aria-label={labels.filter}
                aria-keyshortcuts="/"
                placeholder={labels.filter}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end" aria-hidden>
                <Kbd>/</Kbd>
              </InputGroupAddon>
            </InputGroup>
            {paused
              ? onResume && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onResume}
                  >
                    {labels.resume}
                  </Button>
                )
              : onPause && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onPause}
                  >
                    {labels.pause}
                  </Button>
                )}
            <IconAction
              label={labels.close}
              size="icon-sm"
              onClick={() => onOpenChange(false)}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </IconAction>
          </div>
        </div>
        <DialogDescription
          render={<div />}
          className="flex min-h-7 items-center gap-2 px-4 pb-3 text-2sm"
        >
          {paused ? (
            <>
              <HugeiconsIcon
                icon={Alert02Icon}
                strokeWidth={2}
                aria-hidden
                className="size-3.5 shrink-0"
              />
              {[labels.paused, pausedReason].filter(Boolean).join(" · ")}
            </>
          ) : (
            <>
              {status}
              {statusDetail ? (
                // A space's width from the status, not the dot's gap.
                <span className="-ms-1 text-subtle-foreground">
                  · {statusDetail}
                </span>
              ) : null}
            </>
          )}
        </DialogDescription>
        {chosen.length > 0 && (
          <div
            ref={toolbar}
            role="toolbar"
            aria-label={labels.selected(chosen.length)}
            data-slot="composer-queue-selection"
            className="flex min-h-11 flex-wrap items-center gap-1 border-t bg-muted/50 py-2 ps-4 pe-3 text-2sm"
          >
            <span className="me-2 font-medium">
              {labels.selected(chosen.length)}
            </span>
            {onReorder && onSendNow && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  const first = ids.find((id) => chosen.includes(id))!
                  toEnd(true)
                  onSendNow(first)
                }}
              >
                <HugeiconsIcon icon={ArrowUpDoubleIcon} strokeWidth={2} />
                {labels.sendNext}
              </Button>
            )}
            {onReorder && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => toEnd(true)}
                >
                  {labels.moveToTop}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => toEnd(false)}
                >
                  {labels.moveToBottom}
                </Button>
              </>
            )}
            {onRemove && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  const after = visible.filter((id) => !chosen.includes(id))
                  const first = visible.findIndex((id) => chosen.includes(id))
                  // The bar goes with the selection: focus moves to the
                  // list first.
                  focusRow(after[Math.min(first, after.length - 1)])
                  remove(chosen)
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                {labels.remove}
              </Button>
            )}
            {labels.clearSelection ? (
              <span className="ms-auto text-xs text-muted-foreground">
                {labels.clearSelection}
              </span>
            ) : null}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto border-t px-1 py-2">
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {labels.empty}
            </p>
          ) : null}
          <ol
            ref={list}
            aria-label={labels.title}
            data-slot="composer-queue-dialog-list"
            className="relative flex flex-col"
            onKeyDown={handleListKeyDown}
          >
            {shown.map((item, index) => {
              const position = ids.indexOf(item.id) + 1
              const isSelected = chosen.includes(item.id)
              const isEditing = editing?.id === item.id
              const isSending = sending && position === 1
              const lifted = drag?.id === item.id
              const files = item.attachments ?? []
              const images = files.filter((file) => file.kind === "image")
              const others = files.filter((file) => file.kind !== "image")
              return (
                <li
                  key={item.id}
                  data-queue-id={item.id}
                  data-slot="composer-queue-dialog-item"
                  data-selected={isSelected || undefined}
                  style={rowStyle(index)}
                  className={cn(
                    "group/queue-item relative flex items-start gap-2 rounded-lg px-3 py-2",
                    drag && !lifted && "transition-transform motion-fade",
                    "hover:bg-muted/50 data-selected:bg-muted/60",
                    "has-[[data-slot=checkbox]:focus-visible]:ring-1 has-[[data-slot=checkbox]:focus-visible]:ring-ring",
                    isEditing && "bg-background shadow-float",
                    lifted && "z-10 bg-background shadow-lg ring-1 ring-border"
                  )}
                >
                  <span className="flex h-5 items-center">
                    <Checkbox
                      checked={isSelected}
                      aria-label={labels.select(position)}
                      aria-describedby={`${textId}-${item.id}`}
                      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown E Delete Meta+Enter"
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id)
                        )
                      }
                    />
                  </span>
                  {isSending ? (
                    // grid: mark (as wide as a handle)
                    <span className="grid h-5 w-3.5 shrink-0 place-items-center text-muted-foreground">
                      <Spinner
                        className="size-3.5"
                        aria-label={labels.sending}
                      />
                    </span>
                  ) : (
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden
                      data-slot="composer-queue-handle"
                      disabled={!onReorder || isEditing}
                      className={queueHandle}
                      {...handleProps(item.id)}
                    >
                      <HugeiconsIcon
                        icon={DragDropVerticalIcon}
                        strokeWidth={2}
                      />
                    </button>
                  )}
                  <QueueIndex
                    position={position}
                    next={position === 1}
                    className="mt-px size-5 text-2xs"
                  />
                  {/* At least as tall as the actions: rows 40px apart. */}
                  <div className="min-h-6 min-w-0 flex-1">
                    {isEditing ? (
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          saveEdit()
                        }}
                      >
                        {/* Edited where it is: the text keeps its place
                            and look, with a caret; no field around it. */}
                        <textarea
                          autoFocus
                          rows={1}
                          ref={fitText}
                          // The caret at the end, to add to it.
                          onFocus={(event) => {
                            const end = event.currentTarget.value.length
                            event.currentTarget.setSelectionRange(end, end)
                          }}
                          aria-label={labels.edit}
                          value={editing.text}
                          onChange={(event) => {
                            fitText(event.currentTarget)
                            setEditing({
                              id: item.id,
                              text: event.currentTarget.value,
                            })
                          }}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault()
                              saveEdit()
                            }
                          }}
                          className="block w-full resize-none overflow-hidden bg-transparent p-0 text-2sm leading-5 break-words outline-none"
                        />
                        {/* 28px, as the design draws them here. */}
                        <div className="flex justify-end gap-1 *:h-7">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={cancelEdit}
                          >
                            {labels.cancel}
                            <Kbd
                              aria-hidden
                              className="h-auto min-w-0 bg-transparent px-0 text-2xs text-muted-foreground"
                            >
                              Esc
                            </Kbd>
                          </Button>
                          <Button type="submit" size="xs">
                            {labels.save}
                            <Kbd
                              aria-hidden
                              className="h-auto min-w-0 bg-transparent px-0 text-2xs text-primary-foreground/70"
                            >
                              ↵
                            </Kbd>
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex min-w-0 items-start gap-1">
                          {hasIcon(item) && (
                            // On the text's first line.
                            <span className="flex h-5 items-center">
                              <QueueIcon icon={item.icon} />
                            </span>
                          )}
                          <div
                            id={`${textId}-${item.id}`}
                            className="min-w-0 text-2sm leading-5 break-words"
                          >
                            {item.text}
                          </div>
                        </div>
                        {files.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground [&_svg]:size-3">
                            {images.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <HugeiconsIcon
                                  icon={Image01Icon}
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                {images.length === 1
                                  ? images[0]!.name
                                  : labels.images(images.length)}
                              </span>
                            )}
                            {others.map((file) => (
                              <span
                                key={file.id}
                                className="inline-flex items-center gap-1"
                              >
                                <HugeiconsIcon
                                  icon={File01Icon}
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                {file.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <span className="-my-0.5 flex shrink-0 items-center gap-1">
                      {!isSending && (
                        <span className="flex opacity-0 group-focus-within/queue-item:opacity-100 group-hover/queue-item:opacity-100 pointer-coarse:opacity-100">
                          {(onSaveEdit || onEdit) &&
                            item.editable !== false && (
                              <IconAction
                                label={labels.edit}
                                aria-describedby={`${textId}-${item.id}`}
                                onClick={() => startEdit(item)}
                              >
                                <HugeiconsIcon
                                  icon={PencilEdit02Icon}
                                  strokeWidth={2}
                                  className="size-3.5"
                                />
                              </IconAction>
                            )}
                          {onSendNow && (
                            <IconAction
                              label={labels.sendNow}
                              aria-describedby={`${textId}-${item.id}`}
                              onClick={() => {
                                focusRow(
                                  visible[index + 1] ?? visible[index - 1]
                                )
                                onSendNow(item.id)
                              }}
                            >
                              <HugeiconsIcon
                                icon={ArrowUpDoubleIcon}
                                strokeWidth={2}
                                className="size-3.5"
                              />
                            </IconAction>
                          )}
                          {onRemove && (
                            <IconAction
                              label={labels.remove}
                              aria-describedby={`${textId}-${item.id}`}
                              onClick={() => {
                                focusRow(
                                  visible[index + 1] ?? visible[index - 1]
                                )
                                remove([item.id])
                              }}
                            >
                              <HugeiconsIcon
                                icon={Cancel01Icon}
                                strokeWidth={2}
                                className="size-3.5"
                              />
                            </IconAction>
                          )}
                        </span>
                      )}
                      {isSending ? (
                        <span className="text-xs text-muted-foreground">
                          {labels.sending}
                        </span>
                      ) : item.time ? (
                        <span className="w-8 text-end text-xs text-muted-foreground tabular-nums">
                          {item.time}
                        </span>
                      ) : null}
                    </span>
                  )}
                </li>
              )
            })}
            {slot && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 rounded-lg border border-dashed border-muted-foreground/50"
                style={{ top: slot.top, height: slot.height }}
              />
            )}
          </ol>
        </div>
        <div
          aria-hidden
          data-slot="composer-queue-keys"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-3 text-xs text-muted-foreground max-sm:hidden"
        >
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> {labels.keys.move}
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>⌥↑</Kbd>
            <Kbd>⌥↓</Kbd> {labels.keys.reorder}
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>space</Kbd> {labels.keys.select}
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>E</Kbd> {labels.keys.edit}
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>⌫</Kbd> {labels.keys.remove}
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>⌘↵</Kbd> {labels.keys.sendNow}
          </span>
          <span className="ms-auto tabular-nums">
            {labels.shown(shown.length, items.length)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export {
  ComposerQueue,
  type ComposerQueueLabels,
  type ComposerQueueProps,
  type QueuedAttachment,
  type QueuedMessage,
}
