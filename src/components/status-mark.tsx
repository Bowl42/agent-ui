"use client"

import * as React from "react"
import { cn } from "cn"

import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** What a status means to the reader, as its colour and shape say it. */
type StatusTone = "neutral" | "info" | "success" | "warning" | "destructive"

/**
 * Each tone's mark: a dot, but a ring for a warning and a diamond for a
 * danger, told apart by their shape as well as their colour.
 */
const marks: Record<StatusTone, string> = {
  neutral: "size-2 rounded-full bg-muted-foreground",
  info: "size-2 rounded-full bg-info",
  success: "size-2 rounded-full bg-success",
  // grid: mark (a ring, as large as the dots look)
  warning: "size-2.5 rounded-full border-2 border-warning",
  destructive: "size-2 rotate-45 bg-destructive",
}

/**
 * `grey`: the same shapes in the text's greys, what needs the reader
 * (a warning, a danger) in the strongest.
 */
const greyMarks: Record<StatusTone, string> = {
  neutral: "size-2 rounded-full bg-muted-foreground",
  info: "size-2 rounded-full bg-muted-foreground",
  success: "size-2 rounded-full bg-muted-foreground",
  // grid: mark (a ring, as large as the dots look)
  warning: "size-2.5 rounded-full border-2 border-foreground",
  destructive: "size-2 rotate-45 bg-foreground",
}

/**
 * A status as a small mark, e.g. a conversation's, a connection's or a
 * task's: a dot in its tone's colour (a ring for a warning, a diamond for
 * a danger), or a spinner while it is `busy`; `grey` where the page has
 * no colour (a sidebar), its shape alone telling it. Its `label` names it for
 * screen readers, and shows in a tooltip while the pointer is on it or
 * the keyboard on the row it ends; where the status should be read on
 * screen too, use a `Badge`.
 */
function StatusMark({
  tone = "neutral",
  busy = false,
  grey = false,
  label,
  className,
  onPointerEnter,
  onPointerLeave,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  tone?: StatusTone
  /** Still going: a spinner in the text's colour, not a dot. */
  busy?: boolean
  /** In greys, not its tone's colour: told apart by its shape. */
  grey?: boolean
  /** What it is, e.g. "Running", for screen readers and its tooltip. */
  label: string
}) {
  const [open, setOpen] = React.useState(false)
  // Its tooltip only once it is first wanted: a list has many marks.
  const [wanted, setWanted] = React.useState(false)
  const show = (shown: boolean) => {
    if (shown) setWanted(true)
    setOpen(shown)
  }
  const mark = React.useRef<HTMLSpanElement>(null)
  // The row it ends, e.g. a link: its keyboard focus shows the tooltip,
  // as the mark itself is not focusable.
  React.useEffect(() => {
    const row = mark.current?.parentElement?.closest<HTMLElement>(
      "a[href], button, [tabindex]"
    )
    if (!row) return
    const focus = () => {
      if (!row.matches(":focus-visible")) return
      setWanted(true)
      setOpen(true)
    }
    const blur = () => setOpen(false)
    row.addEventListener("focus", focus)
    row.addEventListener("blur", blur)
    return () => {
      row.removeEventListener("focus", focus)
      row.removeEventListener("blur", blur)
    }
  }, [])
  return (
    <span
      ref={mark}
      data-slot="status-mark"
      data-tone={tone}
      data-busy={busy || undefined}
      className={cn(
        "relative flex size-4 shrink-0 items-center justify-center",
        className
      )}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") show(true)
        onPointerEnter?.(event)
      }}
      onPointerLeave={(event) => {
        show(false)
        onPointerLeave?.(event)
      }}
      {...props}
    >
      {busy ? (
        <Spinner
          aria-hidden="true"
          // In the text's colour, its lines 2px (not the theme's 1.5px for
          // icons), so it is seen at a glance in a list of greys. Still
          // where the reader asks for less motion: its shape still says it
          // is going.
          className="text-foreground *:stroke-2 motion-reduce:animate-none"
        />
      ) : (
        <span aria-hidden="true" className={(grey ? greyMarks : marks)[tone]} />
      )}
      <span className="sr-only">{label}</span>
      {wanted && (
        <Tooltip open={open} onOpenChange={setOpen}>
          {/* Where the tooltip points: over the mark. */}
          <TooltipTrigger
            render={<span aria-hidden="true" />}
            className="absolute inset-0"
          />
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}

export { StatusMark, type StatusTone }
