"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type AgentRequestDecision = {
  /**
   * What was asked and what came of it, in the app's words: "Allowed
   * git push origin main", or the question and its
   * `AgentRequestAnswer`.
   */
  summary: React.ReactNode
  /**
   * At the row's end: "Once · by you", "Answered". Without it, a chevron
   * after the summary says the row opens.
   */
  meta?: React.ReactNode
}

type AgentRequestLabels = {
  /** The button that folds the card while it asks to its title. */
  collapse: string
  /** The same button, folded: it opens the card again. */
  expand: string
}

const defaultLabels: AgentRequestLabels = {
  collapse: "Collapse",
  expand: "Expand",
}

type Collapse = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  labels: AgentRequestLabels
}

/** The parts of a card that may stand on one row. */
const oneRow = new Set([
  "agent-request-icon",
  "agent-request-title",
  "agent-request-footer",
  "agent-request-toggle",
])

const RequestContext = React.createContext<{
  setTitle: (id: string | undefined) => void
  setDescription: (id: string | undefined) => void
  decided: boolean
} | null>(null)

/**
 * The card: its icon beside its words, its footer across the foot. While
 * it asks, in the composer's place (`ComposerTakeover`) and its frame: as
 * wide, the same radius and soft shadow, so the swap does not jump; it
 * takes focus there. Opened from its decided row, a hairline instead.
 *
 * Of its title and a choice or two alone ("Working in another app",
 * Take over), one row, the choices at its end, no band under it.
 *
 * While it asks, a chevron at its top end folds it to its title (or its
 * header), so it does not hide the conversation over it; its content
 * stays, hidden, with what the reader chose in it.
 */
function Card({
  icon,
  decided,
  collapse,
  className,
  onClick,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode
  decided: boolean
  collapse?: Collapse | undefined
}) {
  // Its title and a choice or two alone: one row, the choices at its end.
  const card = React.useRef<HTMLDivElement>(null)
  const [inline, setInline] = React.useState(false)
  React.useLayoutEffect(() => {
    const parts = [...(card.current?.children ?? [])].map((part) =>
      part.getAttribute("data-slot")
    )
    const footer = card.current?.querySelector(
      ":scope > [data-slot=agent-request-footer]"
    )
    setInline(
      !!footer &&
        footer.childElementCount <= 2 &&
        parts.includes("agent-request-title") &&
        parts.every((part) => part !== null && oneRow.has(part))
    )
  }, [children])
  const collapsed = !inline && (collapse?.collapsed ?? false)
  // Named and described by its title and description, by their ids.
  const [title, setTitle] = React.useState<string>()
  const [description, setDescription] = React.useState<string>()
  const context = React.useMemo(
    () => ({ setTitle, setDescription, decided }),
    [decided]
  )
  return (
    <RequestContext value={context}>
      <div
        ref={card}
        role="group"
        aria-labelledby={title}
        aria-describedby={description}
        data-slot="agent-request-card"
        data-decided={decided || undefined}
        data-collapsed={collapsed || undefined}
        data-inline={inline || undefined}
        tabIndex={decided ? undefined : -1}
        // Folded, its title opens it too, not the chevron alone.
        onClick={(event) => {
          onClick?.(event)
          if (collapsed && !event.defaultPrevented)
            collapse?.setCollapsed(false)
        }}
        className={cn(
          "group/agent-request-card @container/agent-request relative grid w-full min-w-0 gap-x-2 overflow-hidden rounded-xl bg-background px-4 pt-3 pb-3 text-sm shadow-float outline-none dark:bg-card dark:ring-1 dark:ring-border",
          icon ? "grid-cols-icon" : "grid-cols-1",
          // Read, not answered: no shadow, as a step's details.
          "data-decided:border data-decided:shadow-none dark:data-decided:ring-0",
          // Room at the end of its title or header for the chevron.
          collapse &&
            // grid: clear (room for the 36px chevron)
            "[&>[data-slot=agent-request-header]]:pe-9 [&>[data-slot=agent-request-title]]:pe-6",
          // Folded: its title or header alone, on one line.
          // Its title and a choice or two: one row, 44px, the choices
          // at its end on the card, no band; nothing to fold.
          "data-inline:flex data-inline:items-center data-inline:py-2 data-inline:[&>[data-slot=agent-request-title]]:min-w-0 data-inline:[&>[data-slot=agent-request-title]]:flex-1 data-inline:[&>[data-slot=agent-request-title]]:pe-0 data-inline:[&>[data-slot=agent-request-toggle]]:hidden",
          "data-inline:[&>[data-slot=agent-request-footer]]:m-0 data-inline:[&>[data-slot=agent-request-footer]]:shrink-0 data-inline:[&>[data-slot=agent-request-footer]]:flex-nowrap data-inline:[&>[data-slot=agent-request-footer]]:border-0 data-inline:[&>[data-slot=agent-request-footer]]:bg-transparent data-inline:[&>[data-slot=agent-request-footer]]:p-0 dark:data-inline:[&>[data-slot=agent-request-footer]]:bg-transparent data-inline:[&>[data-slot=agent-request-footer]>button]:flex-none data-inline:[&>[data-slot=agent-request-footer]>button]:basis-auto data-inline:[&>[data-slot=agent-request-footer]>button]:rounded-lg data-inline:[&>[data-slot=agent-request-footer]>button]:text-sm pointer-fine:data-inline:[&>[data-slot=agent-request-footer]>button]:h-7",
          "data-collapsed:cursor-pointer data-collapsed:has-[>[data-slot=agent-request-header]]:pb-0 data-collapsed:[&>:not([data-slot=agent-request-icon],[data-slot=agent-request-title],[data-slot=agent-request-header],[data-slot=agent-request-toggle])]:hidden data-collapsed:[&>[data-slot=agent-request-title]]:truncate",
          className
        )}
        {...props}
      >
        {collapse && (
          <button
            type="button"
            data-slot="agent-request-toggle"
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? collapse.labels.expand : collapse.labels.collapse
            }
            onClick={(event) => {
              event.preventDefault()
              collapse.setCollapsed(!collapsed)
            }}
            className="touch-target absolute end-2 top-3 flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-none group-has-[>[data-slot=agent-request-header]]/agent-request-card:top-2 hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className="transition-transform group-data-collapsed/agent-request-card:rotate-180"
            />
          </button>
        )}
        {icon && (
          <span
            aria-hidden="true"
            data-slot="agent-request-icon"
            className="col-start-1 row-start-1 flex h-6 items-center text-foreground [&_svg]:size-4"
          >
            {icon}
          </span>
        )}
        {children}
      </div>
    </RequestContext>
  )
}

/**
 * The agent asks the reader: to allow a tool call, or a question. While
 * it asks, a card in the composer's place (`ComposerTakeover`), its icon
 * beside its title, what it is about under it (`AgentRequestContent`: a
 * command, a `Questionnaire`'s choices) and the reader's choices in its
 * `AgentRequestFooter`; in the conversation, nothing, or a quiet row
 * given `waiting` ("Waiting for you below").
 *
 * Once decided, give it its `decision`: it is one quiet row, as a step,
 * the icon, what was asked and what came of it; opened, the card as it
 * was, to read, without its footer.
 */
function AgentRequest({
  icon,
  decision,
  waiting,
  open,
  defaultOpen,
  onOpenChange,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  collapsible = true,
  labels: labelsProp,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** Beside its title, and first in its decided row: a shield, a "?". */
  icon?: React.ReactNode
  /** Once the reader has answered: the card is a row. */
  decision?: AgentRequestDecision | undefined
  /**
   * In the conversation while the card is in the composer's place: a
   * still row, what is asked and "Waiting for you below"; not its card.
   */
  waiting?: AgentRequestDecision | undefined
  /** Whether a decided request shows its card; e.g. from `useFold`. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * Whether the card, while it asks, is folded to its title; e.g. kept
   * by the app per request. Its chevron folds and opens it.
   */
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /**
   * Whether it has the chevron that folds it; without, a notice of one
   * action in the composer's place (a sign-in, a limit reached), short
   * enough not to fold.
   */
  collapsible?: boolean
  /** Its words, for other languages. */
  labels?: Partial<AgentRequestLabels>
}) {
  const [collapsedState, setCollapsedState] = React.useState(defaultCollapsed)
  const collapsed = collapsedProp ?? collapsedState
  const collapse: Collapse = {
    collapsed,
    setCollapsed: (next) => {
      if (next === collapsed) return
      setCollapsedState(next)
      onCollapsedChange?.(next)
    },
    labels: { ...defaultLabels, ...labelsProp },
  }
  if (!decision && waiting)
    return (
      <div
        data-slot="agent-request"
        data-waiting=""
        className="flex min-w-0 flex-col text-sm"
      >
        <div
          data-slot="agent-request-row"
          className={cn(rowClassName(icon), "text-muted-foreground")}
        >
          <RowParts icon={icon} row={waiting} />
        </div>
      </div>
    )
  if (!decision)
    return (
      <div data-slot="agent-request" className="min-w-0">
        <Card
          icon={icon}
          decided={false}
          collapse={collapsible ? collapse : undefined}
          className={className}
          {...props}
        >
          {children}
        </Card>
      </div>
    )
  return (
    <Collapsible
      data-slot="agent-request"
      data-decided=""
      {...(open !== undefined && { open })}
      {...(defaultOpen !== undefined && { defaultOpen })}
      onOpenChange={(next) => onOpenChange?.(next)}
      className="flex min-w-0 flex-col text-sm"
    >
      <CollapsibleTrigger
        data-slot="agent-request-row"
        className={cn(
          rowClassName(icon),
          "group/agent-request-row cursor-pointer text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <RowParts icon={icon} row={decision} opens />
      </CollapsibleTrigger>
      <CollapsibleContent className="min-w-0">
        <div className="pt-1 pb-2">
          <Card icon={icon} decided className={className} {...props}>
            {children}
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** A row's grid: the icon, the summary, the meta at the end. */
const rowClassName = (icon: React.ReactNode) =>
  cn(
    // 13px, as a turn's steps are (15px on a phone).
    "-mx-2 grid min-h-7 min-w-0 items-center gap-x-2 rounded-md px-2 text-start text-2sm max-sm:text-md pointer-coarse:min-h-10",
    icon ? "grid-cols-icon-end" : "grid-cols-[minmax(0,1fr)_auto]"
  )

function RowParts({
  icon,
  row,
  opens = false,
}: {
  icon: React.ReactNode
  row: AgentRequestDecision
  /** Whether the row opens to the card: without a meta, a chevron says so. */
  opens?: boolean
}) {
  return (
    <>
      {icon && (
        <span aria-hidden="true" className="flex items-center [&_svg]:size-4">
          {icon}
        </span>
      )}
      {opens && row.meta === undefined ? (
        <span className="flex min-w-0 items-center gap-1">
          <span data-slot="agent-request-summary" className="min-w-0 truncate">
            {row.summary}
          </span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            aria-hidden
            className="size-3 shrink-0 text-subtle-foreground transition-transform group-data-panel-open/agent-request-row:rotate-90 motion-reduce:transition-none"
          />
        </span>
      ) : (
        <span data-slot="agent-request-summary" className="min-w-0 truncate">
          {row.summary}
        </span>
      )}
      {row.meta !== undefined ? (
        <span
          data-slot="agent-request-meta"
          className="text-xs text-muted-foreground tabular-nums"
        >
          {row.meta}
        </span>
      ) : (
        <span />
      )}
    </>
  )
}

/** What the agent asks: "Allow the agent to push?". */
function AgentRequestTitle({
  id: idProp,
  className,
  ...props
}: React.ComponentProps<"div">) {
  const generated = React.useId()
  const id = idProp ?? generated
  const setTitle = React.useContext(RequestContext)?.setTitle
  React.useLayoutEffect(() => {
    setTitle?.(id)
    return () => setTitle?.(undefined)
  }, [setTitle, id])
  return (
    <div
      id={id}
      data-slot="agent-request-title"
      className={cn(
        // 16px on a phone, as the conversation's text there.
        "col-start-[-2] leading-6 font-medium text-pretty text-foreground max-sm:text-base",
        className
      )}
      {...props}
    />
  )
}

/**
 * A bar across the card's top, for a request of several parts (a
 * questionnaire): its icon, what it is ("The agent has 4 questions", the
 * card's name), and a note at its end ("Draft kept"). Use it in place of
 * the card's `icon` and `AgentRequestTitle`.
 */
function AgentRequestHeader({
  id: idProp,
  icon,
  note,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode
  /** At its end, in grey. */
  note?: React.ReactNode
}) {
  const generated = React.useId()
  const id = idProp ?? generated
  const setTitle = React.useContext(RequestContext)?.setTitle
  React.useLayoutEffect(() => {
    setTitle?.(id)
    return () => setTitle?.(undefined)
  }, [setTitle, id])
  return (
    <div
      data-slot="agent-request-header"
      className={cn(
        "col-span-full -mx-4 -mt-3 mb-0.5 flex h-10 min-w-0 items-center gap-2 border-b px-4 text-2sm text-muted-foreground group-data-collapsed/agent-request-card:mb-0 group-data-collapsed/agent-request-card:border-b-0 [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    >
      {icon}
      <span id={id} className="min-w-0 truncate font-medium text-foreground">
        {children}
      </span>
      {note ? (
        <span className="ms-auto shrink-0 text-subtle-foreground">{note}</span>
      ) : null}
    </div>
  )
}

/** Why, and what it does: "It pushes main and the tag. This can't be undone." */
function AgentRequestDescription({
  id: idProp,
  className,
  ...props
}: React.ComponentProps<"div">) {
  const generated = React.useId()
  const id = idProp ?? generated
  const setDescription = React.useContext(RequestContext)?.setDescription
  React.useLayoutEffect(() => {
    setDescription?.(id)
    return () => setDescription?.(undefined)
  }, [setDescription, id])
  return (
    <div
      id={id}
      data-slot="agent-request-description"
      className={cn(
        // 13px, as secondary text is; 14px on a phone.
        "col-start-[-2] text-2sm leading-5 text-pretty text-muted-foreground max-sm:text-sm",
        className
      )}
      {...props}
    />
  )
}

/**
 * What it is about, under its words: the command in a `CodeBlock`, a
 * `QuestionnaireItem` with its choices; of several questions, each a
 * `QuestionnaireItem` with its `QuestionnaireTitle`, one shown at a time.
 */
function AgentRequestContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="agent-request-content"
      className={cn(
        "col-start-[-2] mt-2 min-w-0",
        // A command a grey well in the card, darker than it in dark: 38px
        // for a line, the radius of the card's buttons.
        "[&_[data-slot=code-block-content]]:py-2 [&_[data-slot=code-block]]:rounded-md [&_[data-slot=code-block]]:bg-sidebar",
        // A question's words close over its choices, as the card's are.
        "[&_[data-slot=questionnaire-item]>[data-slot=questionnaire-title]]:mb-2",
        // Under a header, a question as the design has it: 14px words,
        // 13px rows that bleed to the card's edge, each led by its number
        // in grey, the chosen one's in bold on a grey row. Where several
        // may be chosen, a checkbox after the number, filled when checked.
        "[&_[data-slot=questionnaire-description]]:mb-2 [&_[data-slot=questionnaire-description]]:text-2sm [&_[data-slot=questionnaire-item]]:gap-0 [&_[data-slot=questionnaire-item]>[data-slot=questionnaire-title]:has(~[data-slot=questionnaire-description])]:mb-0 [&_[data-slot=questionnaire-title]]:text-sm [&_[data-slot=questionnaire-title]]:leading-6",
        // A choice's description under its words, 12px in the lighter grey
        // (the darker on a grey row, chosen or hovered, to read), line on
        // line: 46px for such a row. 8px in, past its transparent 1px
        // edge, the number a pixel past the question's x.
        "[&_[data-slot=questionnaire-choice-description]]:text-xs [&_[data-slot=questionnaire-choice-description]]:leading-4 [&_[data-slot=questionnaire-choice-description]]:text-subtle-foreground [&_[data-slot=questionnaire-choice-label]]:gap-0 [&_[data-slot=questionnaire-choice]:hover_[data-slot=questionnaire-choice-description]]:text-muted-foreground [&_[data-slot=questionnaire-choice][data-checked]_[data-slot=questionnaire-choice-description]]:text-muted-foreground",
        "[&_[data-slot=questionnaire-choice-label]]:leading-5 [&_[data-slot=questionnaire-choice]]:min-h-0 [&_[data-slot=questionnaire-choice]]:rounded-md [&_[data-slot=questionnaire-choice]]:px-2 [&_[data-slot=questionnaire-choice]]:py-1 [&_[data-slot=questionnaire-choice]]:text-2sm [&_[data-slot=questionnaire-choice]>[data-slot=questionnaire-input]]:leading-5 [&_[data-slot=questionnaire-choices]]:-mx-2 [&_[data-slot=questionnaire-choices]]:gap-0.5",
        "[&_[data-slot=questionnaire-choice-shortcut]]:h-5 [&_[data-slot=questionnaire-choice-shortcut]]:w-3 [&_[data-slot=questionnaire-choice-shortcut]]:translate-y-0 [&_[data-slot=questionnaire-choice-shortcut]]:justify-start [&_[data-slot=questionnaire-choice-shortcut]]:border-0 [&_[data-slot=questionnaire-choice-shortcut]]:bg-transparent [&_[data-slot=questionnaire-choice-shortcut]]:font-sans [&_[data-slot=questionnaire-choice-shortcut]]:text-xs [&_[data-slot=questionnaire-choice-shortcut]]:leading-5 [&_[data-slot=questionnaire-choice-shortcut]]:font-normal [&_[data-slot=questionnaire-choice-shortcut]]:text-subtle-foreground [&_[data-slot=questionnaire-choice][data-checked]_[data-slot=questionnaire-choice-shortcut]]:bg-transparent [&_[data-slot=questionnaire-choice][data-checked]_[data-slot=questionnaire-choice-shortcut]]:font-semibold [&_[data-slot=questionnaire-choice][data-checked]_[data-slot=questionnaire-choice-shortcut]]:text-foreground",
        // The row the keyboard is on leads with its number in bold too.
        "[&_[data-slot=questionnaire-choice]:has(>input:focus-visible)_[data-slot=questionnaire-choice-shortcut]]:font-semibold [&_[data-slot=questionnaire-choice]:has(>input:focus-visible)_[data-slot=questionnaire-choice-shortcut]]:text-foreground",
        "[&_[data-slot=questionnaire-choice][data-type=checkbox]_[data-slot=questionnaire-choice-indicator]]:flex",
        className
      )}
      {...props}
    />
  )
}

/**
 * Across the card's foot, on the sidebar's grey: the reader's choices,
 * the default last; an `AgentRequestStatus` first. A `Kbd` in a choice,
 * its key ("Esc", "↵"), is in the button's ink. Not shown once decided.
 *
 * For a question, a `QuestionnaireProgress` first and a
 * `QuestionnaireNavigation` last: Decline (`onDecline`), Previous, Skip,
 * Next and Submit, each where it applies, so the reader can always go
 * on, and decline the whole request ("Dismiss").
 */
function AgentRequestFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const context = React.useContext(RequestContext)
  if (context?.decided) return null
  return (
    <div
      data-slot="agent-request-footer"
      className={cn(
        "col-span-full -mx-4 mt-3 -mb-3 flex min-w-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/50 px-4 py-2 dark:bg-background",
        "[&_[data-slot=kbd]]:h-4 [&_[data-slot=kbd]]:min-w-0 [&_[data-slot=kbd]]:bg-transparent [&_[data-slot=kbd]]:px-0 [&_[data-slot=kbd]]:text-current [&_[data-slot=kbd]]:opacity-60 pointer-coarse:[&_[data-slot=kbd]]:hidden",
        // A questionnaire's progress ("Question 2 of 4") first, as a status.
        "[&>[data-slot=questionnaire-progress]]:me-auto [&>[data-slot=questionnaire-progress]]:min-w-0 [&>[data-slot=questionnaire-progress]]:font-normal [&>[data-slot=questionnaire-progress]]:text-subtle-foreground",
        // A questionnaire's foot is the card's, not a grey band, 8px under
        // its last choice.
        "has-[>[data-slot=questionnaire-progress]]:bg-transparent @md/agent-request:has-[>[data-slot=questionnaire-progress]]:mt-2 dark:has-[>[data-slot=questionnaire-progress]]:bg-transparent",
        // Going back is the quietest of its ways through.
        "[&>[data-slot=questionnaire-previous]]:border-transparent [&>[data-slot=questionnaire-previous]]:bg-transparent [&>[data-slot=questionnaire-previous]]:text-muted-foreground [&>[data-slot=questionnaire-previous]]:hover:text-foreground dark:[&>[data-slot=questionnaire-previous]]:bg-transparent",
        // Narrow, as on a phone: part of the card, not a band under it;
        // the default (or a questionnaire's Next and Submit) first,
        // across, the others sharing the line under it, each a finger's
        // size; no keys, the status a line under them.
        "@max-md/agent-request:mt-4 @max-md/agent-request:border-t-0 @max-md/agent-request:bg-transparent @max-md/agent-request:pt-0 @max-md/agent-request:pb-3 dark:@max-md/agent-request:bg-transparent @max-md/agent-request:[&_[data-slot=kbd]]:hidden @max-md/agent-request:[&>:is([data-slot=questionnaire-next],[data-slot=questionnaire-submit])]:order-first @max-md/agent-request:[&>:is([data-slot=questionnaire-next],[data-slot=questionnaire-submit])]:basis-full @max-md/agent-request:[&>button]:h-11 @max-md/agent-request:[&>button]:flex-1 @max-md/agent-request:[&>button]:rounded-xl @max-md/agent-request:[&>button]:text-md pointer-coarse:[&>button]:h-11 @max-md/agent-request:[&>button:last-child]:order-first @max-md/agent-request:[&>button:last-child]:basis-full",
        className
      )}
      {...props}
    />
  )
}

/**
 * First in the footer, small and muted: "Asked 4s ago", "Expires in
 * 30s". Narrow, as on a phone, a line of its own under the choices.
 */
function AgentRequestStatus({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="agent-request-status"
      className={cn(
        "me-auto min-w-0 truncate text-xs text-muted-foreground tabular-nums @max-md/agent-request:order-last @max-md/agent-request:me-0 @max-md/agent-request:basis-full @max-md/agent-request:text-center",
        className
      )}
      {...props}
    />
  )
}

/**
 * Why the reader's choice did not go through ("Could not reach the
 * server"), over the footer, where its choices are: announced as it
 * comes, in the destructive colour, as a field's error is.
 */
function AgentRequestError({ className, ...props }: React.ComponentProps<"p">) {
  const context = React.useContext(RequestContext)
  if (context?.decided) return null
  return (
    <p
      role="alert"
      data-slot="agent-request-error"
      className={cn(
        "col-span-full mt-3 text-sm text-destructive @max-md/agent-request:text-center",
        className
      )}
      {...props}
    />
  )
}

/** In a decided row's summary, the reader's answer, a shade darker. */
function AgentRequestAnswer({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="agent-request-answer"
      className={cn("text-foreground", className)}
      {...props}
    />
  )
}

/**
 * One of several questions as it was, to read once answered: its words
 * over its `AgentRequestOptions`, a `meta` ("Skipped") at the line's end.
 * One after another in `AgentRequestContent`.
 */
function AgentRequestQuestion({
  title,
  meta,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  /** The question: "Where should the release go?". */
  title: React.ReactNode
  meta?: React.ReactNode
}) {
  const id = React.useId()
  return (
    <section
      aria-labelledby={id}
      data-slot="agent-request-question"
      className={cn("grid min-w-0 gap-1 not-first:mt-3", className)}
      {...props}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <h3
          id={id}
          className="min-w-0 flex-1 leading-5 font-medium text-pretty text-foreground"
        >
          {title}
        </h3>
        {meta !== undefined && (
          <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
        )}
      </div>
      {children}
    </section>
  )
}

/**
 * A question's choices as they were, to read once it is answered (a
 * `Questionnaire` asks; this shows): each an `AgentRequestOption`.
 */
function AgentRequestOptions({
  className,
  ...props
}: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="agent-request-options"
      className={cn("grid min-w-0 gap-0.5", className)}
      {...props}
    />
  )
}

/**
 * A choice as it was: the one chosen (`chosen`) on a tint, in the
 * foreground, a check before it and `aria-current` on it; the others
 * muted.
 */
function AgentRequestOption({
  chosen = false,
  description,
  className,
  children,
  ...props
}: React.ComponentProps<"li"> & {
  chosen?: boolean
  /** Under its words, smaller: "Recommended · CI runs before merge". */
  description?: React.ReactNode
}) {
  return (
    <li
      data-slot="agent-request-option"
      data-chosen={chosen || undefined}
      aria-current={chosen || undefined}
      className={cn(
        "grid min-w-0 grid-cols-icon gap-x-2 rounded-lg px-2 py-1 text-muted-foreground data-chosen:bg-muted data-chosen:text-foreground dark:data-chosen:bg-foreground/10",
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className="flex h-5 items-center justify-center">
        {chosen ? (
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={2}
            className="size-3.5"
          />
        ) : (
          <span className="size-1 rounded-full bg-muted-foreground/60" />
        )}
      </span>
      <span className="min-w-0 leading-5">{children}</span>
      {description !== undefined && (
        <span className="col-start-2 text-xs leading-4 text-muted-foreground">
          {description}
        </span>
      )}
    </li>
  )
}

export {
  AgentRequest,
  AgentRequestHeader,
  AgentRequestAnswer,
  AgentRequestOption,
  AgentRequestOptions,
  AgentRequestQuestion,
  AgentRequestContent,
  AgentRequestDescription,
  AgentRequestError,
  AgentRequestFooter,
  AgentRequestStatus,
  AgentRequestTitle,
  type AgentRequestDecision,
  type AgentRequestLabels,
}
