"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity01Icon,
  Alert02Icon,
  AlarmClockIcon,
  ArrowDown01Icon,
  StopCircleIcon,
  TaskDone01Icon,
} from "@hugeicons/core-free-icons"
import { FoldFindText, useFold } from "@/hooks/use-fold"
import { nodeText } from "@/components/search-highlight"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

/**
 * Where an event came from, for its icon and its source's word: a stream
 * the agent watches (a log, a deploy, CI), a task it ran in the
 * background, a wake-up it had set.
 */
type AgentEventKind = "monitor" | "task" | "wake"

/** How what it tells of ended: a task's, e.g. `killed` is "stopped". */
type AgentEventStatus = "done" | "failed" | "stopped"

type AgentEventLabels = {
  /** Its source's word, by kind, where the app gives no `source`. */
  monitor: string
  task: string
  wake: string
  /** After its words, where it failed or was stopped. */
  failed: string
  stopped: string
}

const defaultLabels: AgentEventLabels = {
  monitor: "Monitor",
  task: "Background task",
  wake: "Wake-up",
  failed: "Failed",
  stopped: "Stopped",
}

const kindIcons = {
  monitor: Activity01Icon,
  task: TaskDone01Icon,
  wake: AlarmClockIcon,
}

/** What an event says, as a turn's part takes it too. */
type AgentEventData = {
  kind?: AgentEventKind | undefined
  /** Where it came from, in the app's words; its kind's word without it. */
  source?: React.ReactNode
  /** Before its source; its kind's icon without it. */
  icon?: React.ReactNode
  /** What it said, one line: a stream's line, a task's summary. */
  title: React.ReactNode
  /** When it came, as the app words it ("14:32"), at the line's end. */
  time?: React.ReactNode
  status?: AgentEventStatus | undefined
  /** What it cost, e.g. "12 tool uses · 3m 20s": under its details, or at the line's end with none. */
  meta?: React.ReactNode
  /**
   * The rest of it, e.g. a task's report as the app renders its
   * Markdown: the line opens to show it, closed at first.
   */
  details?: React.ReactNode
}

/**
 * What came to the agent from outside, not said by the reader or by the
 * agent: a line of a stream it watches, a background task's end, a
 * wake-up. A light grey pill of one line at the conversation's start
 * edge (its icon, its source, what it said, when), apart from what the
 * agent says and from the reader's bubbles; one with `details` opens,
 * its report under it. A failed or stopped one says so after its words,
 * an alert or a stop before it, by weight and shade, not a colour. In
 * an `AgentTurn` as a part (`type: "event"`), or between turns.
 */
function AgentEvent({
  kind,
  source,
  icon,
  title,
  time,
  status = "done",
  meta,
  details,
  foldKey,
  defaultOpen = false,
  onOpenChange,
  labels: labelsProp,
  className,
  ...props
}: AgentEventData &
  Omit<React.ComponentProps<"div">, "title"> & {
    /** Its fold's key, for a `FoldProvider` to remember it opened. */
    foldKey?: string | undefined
    defaultOpen?: boolean
    onOpenChange?: ((open: boolean) => void) | undefined
    labels?: Partial<AgentEventLabels> | undefined
  }) {
  const labels = { ...defaultLabels, ...labelsProp }
  const fallbackKey = React.useId()
  const [open, setOpen] = useFold(foldKey ?? fallbackKey, defaultOpen)
  const opens = details !== undefined && details !== null && details !== false
  const hasMeta = meta !== undefined && meta !== null && meta !== false
  const titleRef = React.useRef<HTMLSpanElement>(null)
  const ended = status === "failed" || status === "stopped"
  const line = (
    <>
      <span
        data-slot="agent-event-icon"
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center text-subtle-foreground [&_svg]:size-3.5 max-sm:[&_svg]:size-4"
      >
        {icon ??
          (kind ? (
            <HugeiconsIcon icon={kindIcons[kind]} strokeWidth={2} />
          ) : (
            <HugeiconsIcon icon={Activity01Icon} strokeWidth={2} />
          ))}
      </span>
      <span
        data-slot="agent-event-source"
        // On a phone its icon says it; its words for a screen reader.
        className="shrink-0 font-medium text-foreground max-sm:sr-only"
      >
        {source ?? (kind ? labels[kind] : null)}
      </span>
      <span
        ref={titleRef}
        data-slot="agent-event-title"
        className="min-w-0 truncate"
      >
        {title}
      </span>
      {ended && (
        <span
          data-slot="agent-event-status"
          className="flex shrink-0 items-center gap-1 font-medium text-foreground [&_svg]:size-3.5"
        >
          <HugeiconsIcon
            icon={status === "failed" ? Alert02Icon : StopCircleIcon}
            strokeWidth={2}
            aria-hidden="true"
          />
          {status === "failed" ? labels.failed : labels.stopped}
        </span>
      )}
      {hasMeta && !opens && (
        <span
          data-slot="agent-event-meta"
          className="shrink-0 tabular-nums max-sm:hidden"
        >
          {meta}
        </span>
      )}
      {time !== undefined && time !== null && (
        <span data-slot="agent-event-time" className="shrink-0 tabular-nums">
          {time}
        </span>
      )}
      {opens && (
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          aria-hidden="true"
          data-slot="agent-event-chevron"
          className={cn(
            "size-3.5 shrink-0 text-subtle-foreground transition-transform motion-reduce:transition-none",
            !open && "-rotate-90"
          )}
        />
      )}
    </>
  )
  const lineClass = cn(
    "flex h-7 w-fit min-w-0 items-center gap-2 rounded-full bg-muted px-3 text-start text-muted-foreground max-sm:h-9",
    // grid: track (its icon on a step's icon column, the column's start:
    // the pill out past it by its padding)
    "-ms-3 max-w-[calc(100%+--spacing(3))]"
  )
  return (
    <div
      data-slot="agent-event"
      data-kind={kind}
      data-status={status}
      data-open={(opens && open) || undefined}
      className={cn("flex min-w-0 flex-col text-2sm max-sm:text-md", className)}
      // Cut short, its whole line on hover.
      onPointerEnter={(event) => {
        const words = titleRef.current
        if (words && words.scrollWidth > words.clientWidth)
          event.currentTarget.title = words.textContent ?? ""
        else event.currentTarget.removeAttribute("title")
      }}
      {...props}
    >
      {opens ? (
        <Collapsible
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            onOpenChange?.(next)
          }}
          className="flex min-w-0 flex-col"
        >
          <CollapsibleTrigger
            data-slot="agent-event-line"
            className={cn(
              lineClass,
              "cursor-pointer outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            )}
          >
            {line}
          </CollapsibleTrigger>
          <CollapsibleContent className="min-w-0">
            <div
              data-slot="agent-event-details"
              className="mt-2 max-h-96 min-w-0 scrollbar-thin overflow-y-auto rounded-lg border px-4 py-3 text-sm wrap-break-word text-foreground max-sm:text-base"
            >
              {details}
              {hasMeta && (
                <div
                  data-slot="agent-event-meta"
                  className="mt-2 text-xs text-subtle-foreground tabular-nums max-sm:text-sm"
                >
                  {meta}
                </div>
              )}
            </div>
          </CollapsibleContent>
          {!open && (
            <FoldFindText
              text={() => nodeText(details)}
              onFound={() => {
                setOpen(true)
                onOpenChange?.(true)
              }}
            />
          )}
        </Collapsible>
      ) : (
        <div data-slot="agent-event-line" className={lineClass}>
          {line}
        </div>
      )}
    </div>
  )
}

export {
  AgentEvent,
  type AgentEventData,
  type AgentEventKind,
  type AgentEventLabels,
  type AgentEventStatus,
}
