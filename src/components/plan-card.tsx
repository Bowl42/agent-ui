"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckListIcon } from "@hugeicons/core-free-icons"

import {
  AgentRequest,
  AgentRequestContent,
  AgentRequestTitle,
} from "@/components/agent-request"
import { Clamp, type ClampLabels } from "@/components/clamp"
import { CopyButton, type CopyButtonLabels } from "@/components/copy-button"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"

type PlanCardStatus = "proposed" | "accepted" | "revising" | "rejected"

type PlanCardLabels = {
  /** Its title when the app gives none: "Proposed plan". */
  title: string
  /** The default choice: "Implement". */
  accept: string
  /** The other: "Revise". */
  revise: string
  /** In the decided row, what came of it: "Implemented". */
  status: Record<Exclude<PlanCardStatus, "proposed">, string>
  /** The copy button's words: "Copy plan". */
  copy: CopyButtonLabels
  /** The fold's words: "Show all", "38 lines · 412 words". */
  clamp: ClampLabels
}

const defaultLabels: Omit<PlanCardLabels, "copy" | "clamp"> & {
  copy: Partial<CopyButtonLabels>
} = {
  title: "Proposed plan",
  accept: "Implement",
  revise: "Revise",
  status: {
    accepted: "Implemented",
    revising: "Revised",
    rejected: "Rejected",
  },
  // Named apart from its code blocks' own copy buttons.
  copy: { copy: "Copy plan" },
}

/** The plan, folded past its `lines`. */
function PlanBody({
  children,
  title,
  lines,
  labels,
  className,
}: {
  children: string
  title: React.ReactNode
  lines: number
  labels: Partial<ClampLabels> | undefined
  className?: string | undefined
}) {
  return (
    <div data-slot="plan-card-content" className={cn("min-w-0", className)}>
      <Clamp lines={lines} title={title} {...(labels && { labels })}>
        <Markdown headingOffset={3} mode="static">
          {children}
        </Markdown>
      </Clamp>
    </div>
  )
}

/** Copy, then the app's own actions. */
function PlanActions({
  children,
  actions,
  labels,
}: {
  children: string
  actions: React.ReactNode
  labels: Partial<CopyButtonLabels> | undefined
}) {
  return (
    <div className="ms-auto flex shrink-0 items-center gap-1">
      <CopyButton
        value={children}
        {...(labels && { labels })}
        size="icon-sm"
        variant="ghost"
      />
      {actions}
    </div>
  )
}

/**
 * A plan the agent proposes, awaiting the reader: flat in the
 * conversation, its title with copy and the app's `actions`, the plan's
 * Markdown folded past `lines` ("Show all"), and the decision across its
 * foot, Revise then Implement (the default). Once decided (`status`), it
 * is agent-request's quiet row: its title, what came of it and the
 * app's `meta` ("Implemented · 12:04"); opened, the plan as it was,
 * without its choices. Focus in the card when it is decided moves to
 * the row, not lost.
 */
function PlanCard({
  title: titleProp,
  children,
  status = "proposed",
  actions,
  onAccept,
  onRevise,
  meta,
  lines = 12,
  icon = <HugeiconsIcon icon={CheckListIcon} strokeWidth={2} />,
  open,
  defaultOpen,
  onOpenChange,
  labels: labelsProp,
  className,
  ref,
  onFocusCapture,
  onBlurCapture,
  ...props
}: Omit<React.ComponentProps<"section">, "title" | "children"> & {
  /** The plan's title, e.g. its first heading; else `labels.title`. */
  title?: React.ReactNode
  /** The plan, Markdown; copy copies it. */
  children: string
  /** "proposed" until the reader decides; then a quiet row. */
  status?: PlanCardStatus
  /** After copy, the app's own: "Save to file". */
  actions?: React.ReactNode
  /** The reader chose to implement it; without it, no Implement. */
  onAccept?: () => void
  /** The reader wants changes (e.g. focus the composer); without it, no Revise. */
  onRevise?: () => void
  /** Once decided, after what came of it: "12:04", "by you". */
  meta?: React.ReactNode
  /** The lines shown before "Show all". */
  lines?: number
  /** Beside its title and first in its row: a checklist by default. */
  icon?: React.ReactNode
  /** Whether the decided row shows the plan; e.g. from `useFold`. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  labels?: Partial<Omit<PlanCardLabels, "status" | "copy" | "clamp">> & {
    status?: Partial<PlanCardLabels["status"]>
    copy?: Partial<CopyButtonLabels>
    clamp?: Partial<ClampLabels>
  }
}): React.JSX.Element {
  const labels = {
    ...defaultLabels,
    ...labelsProp,
    status: { ...defaultLabels.status, ...labelsProp?.status },
    copy: { ...defaultLabels.copy, ...labelsProp?.copy },
  }
  const title = titleProp ?? labels.title
  const titleId = React.useId()
  const root = React.useRef<HTMLElement | null>(null)
  const focused = React.useRef(false)
  const previous = React.useRef(status)
  React.useImperativeHandle(ref, () => root.current!)
  React.useLayoutEffect(() => {
    // Its button, focused when it was decided, is gone: focus is on the
    // page (or still in it), not somewhere the reader moved it.
    const active = document.activeElement
    if (
      previous.current === "proposed" &&
      status !== "proposed" &&
      focused.current &&
      (!active || active === document.body || root.current?.contains(active))
    ) {
      root.current
        ?.querySelector<HTMLButtonElement>("[data-slot=agent-request-row]")
        ?.focus()
    }
    previous.current = status
  }, [status])

  const shared = {
    ...props,
    "data-slot": "plan-card",
    "data-status": status,
    ref: (node: HTMLElement | null) => {
      root.current = node
    },
    onFocusCapture: (event: React.FocusEvent<HTMLElement>) => {
      focused.current = true
      onFocusCapture?.(event)
    },
    onBlurCapture: (event: React.FocusEvent<HTMLElement>) => {
      // Without a related target (the button removed), it stays inside.
      focused.current =
        !event.relatedTarget ||
        event.currentTarget.contains(event.relatedTarget)
      onBlurCapture?.(event)
    },
  }
  const body = (
    <PlanBody
      title={title}
      lines={lines}
      labels={labelsProp?.clamp}
      className={status === "proposed" ? "pb-3" : undefined}
    >
      {children}
    </PlanBody>
  )
  const controls = (
    <PlanActions actions={actions} labels={labels.copy}>
      {children}
    </PlanActions>
  )

  if (status !== "proposed")
    return (
      <div {...shared} className={cn("min-w-0", className)}>
        <AgentRequest
          icon={icon}
          decision={{
            summary: title,
            meta: (
              <>
                {labels.status[status]}
                {meta != null && <> · {meta}</>}
              </>
            ),
          }}
          {...(open !== undefined && { open })}
          {...(defaultOpen !== undefined && { defaultOpen })}
          {...(onOpenChange !== undefined && { onOpenChange })}
        >
          <AgentRequestTitle className="flex min-w-0 items-center gap-1">
            <span className="min-w-0 truncate">{title}</span>
            {controls}
          </AgentRequestTitle>
          <AgentRequestContent>{body}</AgentRequestContent>
        </AgentRequest>
      </div>
    )

  return (
    <section
      {...shared}
      aria-labelledby={titleId}
      className={cn(
        "@container/plan-card w-full min-w-0 overflow-hidden rounded-xl border bg-background px-3 text-sm dark:bg-card",
        className
      )}
    >
      <div
        data-slot="plan-card-header"
        className="flex h-10 min-w-0 items-center gap-2"
      >
        <span
          aria-hidden="true"
          className="shrink-0 text-foreground [&_svg]:size-4"
        >
          {icon}
        </span>
        <h3 id={titleId} className="min-w-0 truncate font-medium">
          {title}
        </h3>
        {controls}
      </div>
      {body}
      {(onAccept || onRevise) && (
        <div
          data-slot="plan-card-footer"
          className="-mx-3 flex min-w-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/50 px-3 py-2 @max-md/plan-card:border-t-0 @max-md/plan-card:bg-transparent @max-md/plan-card:pt-0 @max-md/plan-card:pb-3 dark:bg-background dark:@max-md/plan-card:bg-transparent @max-md/plan-card:[&>button]:h-11 @max-md/plan-card:[&>button]:flex-1 @max-md/plan-card:[&>button]:rounded-xl @max-md/plan-card:[&>button]:text-md pointer-coarse:[&>button]:h-11 @max-md/plan-card:[&>button:last-child]:order-first @max-md/plan-card:[&>button:last-child]:basis-full"
        >
          {onRevise && (
            <Button size="sm" variant="ghost" onClick={onRevise}>
              {labels.revise}
            </Button>
          )}
          {onAccept && (
            <Button size="sm" onClick={onAccept}>
              {labels.accept}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

export { PlanCard, type PlanCardLabels, type PlanCardStatus }
