"use client"

import * as React from "react"
import { useRender } from "@base-ui/react/use-render"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  TextAlignJustifyRightIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "cn"

import { StatusMark, type StatusTone } from "@/components/status-mark"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type ConversationDetailsLabels = { title: string }
type ConversationDetailsStatus = {
  tone?: StatusTone
  busy?: boolean
  label: string
}

// The card's w-48 (3 of the column's 12 and a gutter), its end-3, and
// the room it leaves the column's content so the two do not touch: a
// column of 784px leaves it room from a main area of 1192px.
const cardWidth = 192
const inset = 12
const clearance = 12

const DetailsContext = React.createContext<{
  details: React.ReactNode
  labels: ConversationDetailsLabels
  id: string
  open: boolean
  setOpen: (open: boolean) => void
  pinned: boolean
  measure: (margin: number) => void
} | null>(null)

/**
 * Details shared by a header trigger and the conversation area. `open`
 * controls only the pinned card, uncontrolled by default and initially open.
 * The popover starts closed, with its own state, and closes on gaining room.
 */
function ConversationDetails({
  details,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  labels: labelsProp,
  children,
}: {
  details: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  labels?: Partial<ConversationDetailsLabels>
  children: React.ReactNode
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const [pinned, setPinned] = React.useState(false)
  const [popupOpen, setPopupOpen] = React.useState(false)
  const id = React.useId()
  const labels = { title: "Details", ...labelsProp }
  const measure = React.useCallback((margin: number) => {
    const room = margin >= cardWidth + inset + clearance
    setPinned(room)
    if (room) setPopupOpen(false)
  }, [])
  return (
    <DetailsContext.Provider
      value={{
        details,
        labels,
        id,
        open: openProp ?? uncontrolled,
        setOpen: (next) => {
          if (openProp === undefined) setUncontrolled(next)
          onOpenChange?.(next)
        },
        pinned,
        measure,
      }}
    >
      <Popover open={!pinned && popupOpen} onOpenChange={setPopupOpen}>
        {children}
        {!pinned && (
          <PopoverContent
            id={id}
            role="dialog"
            aria-label={labels.title}
            side="bottom"
            align="end"
            className="max-h-(--available-height) w-48 gap-0 rounded-2xl p-0 shadow-none motion-reduce:animate-none"
          >
            <DetailsCard>{details}</DetailsCard>
          </PopoverContent>
        )}
      </Popover>
    </DetailsContext.Provider>
  )
}

/** Wraps the scroller and dock; measures the margin beside the column. */
function ConversationDetailsArea({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<"div">) {
  const context = React.useContext(DetailsContext)
  const area = React.useRef<HTMLDivElement>(null)
  const measure = context?.measure
  React.useLayoutEffect(() => {
    const element = area.current
    if (!element || !measure) return
    // The margin beside the conversation's column (AgentAppColumn): from
    // its content's end to the area's, as laid out; without a column, the
    // area's whole width.
    const observed = new Set<Element>()
    const update = () => {
      const end = element.getBoundingClientRect().right
      const column = element.querySelector<HTMLElement>(
        "[data-slot=agent-app-column]"
      )
      if (column && !observed.has(column)) {
        observed.add(column)
        observer.observe(column)
      }
      const contentEnd = column
        ? column.getBoundingClientRect().right -
          parseFloat(getComputedStyle(column).paddingRight)
        : element.getBoundingClientRect().left
      measure(end - contentEnd)
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    update()
    return () => observer.disconnect()
  }, [measure])
  return (
    <div
      {...props}
      ref={(element) => {
        area.current = element
        if (typeof ref === "function") return ref(element)
        if (ref) ref.current = element
      }}
      data-slot="conversation-details-area"
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
    >
      {children}
      {context?.pinned && context.open && (
        <div className="pointer-events-none absolute end-3 top-3 bottom-3 z-10 flex w-48 flex-col">
          <section
            id={context.id}
            aria-label={context.labels.title}
            className="pointer-events-auto flex max-h-full min-h-0 flex-col"
          >
            <DetailsCard>{context.details}</DetailsCard>
          </section>
        </div>
      )}
    </div>
  )
}

function DetailsCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-slot="conversation-details-card"
      className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-float"
    >
      <ScrollArea className="min-h-0 flex-1 basis-auto overflow-hidden">
        <div className="divide-y divide-border">{children}</div>
      </ScrollArea>
    </div>
  )
}

function ConversationDetailsTrigger({
  children,
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const context = React.useContext(DetailsContext)
  if (!context) return null
  const button = (
    <Button
      {...props}
      variant="ghost"
      size="icon-sm"
      className={cn("touch-target relative", className)}
      aria-label={context.labels.title}
      {...(context.pinned
        ? {
            "aria-expanded": context.open,
            "aria-controls": context.open ? context.id : undefined,
            onClick: (event: Parameters<NonNullable<typeof onClick>>[0]) => {
              onClick?.(event)
              if (!event.defaultPrevented) context.setOpen(!context.open)
            },
          }
        : { onClick })}
    />
  )
  return (
    <Tooltip>
      <TooltipTrigger
        // Without room, the popover's own trigger: it opens, closes and
        // takes the focus back as Base UI's popovers do.
        render={context.pinned ? button : <PopoverTrigger render={button} />}
      >
        {children ?? (
          <HugeiconsIcon icon={TextAlignJustifyRightIcon} strokeWidth={2} />
        )}
      </TooltipTrigger>
      <TooltipContent>{context.labels.title}</TooltipContent>
    </Tooltip>
  )
}

/** Rows belong inside a section; empty sections leave no divider. */
function ConversationDetailsSection({
  title,
  hideTitle,
  meta,
  actions,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: string
  hideTitle?: boolean
  meta?: React.ReactNode
  actions?: React.ReactNode
}) {
  const id = React.useId()
  if (React.Children.toArray(children).length === 0) return null
  return (
    <section
      {...props}
      data-slot="conversation-details-section"
      className={cn("p-2", className)}
      aria-label={hideTitle ? title : undefined}
      aria-labelledby={hideTitle ? undefined : id}
    >
      {!hideTitle && (
        <div className="flex h-8 items-center gap-2 ps-2 pe-1">
          <h2
            id={id}
            className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground"
          >
            {title}
            {meta && <> · {meta}</>}
          </h2>
          {actions && (
            <div className="flex shrink-0 items-center">{actions}</div>
          )}
        </div>
      )}
      <div className="flex flex-col">{children}</div>
    </section>
  )
}

function ConversationDetailsRow({
  plain,
  label,
  icon,
  status,
  meta,
  chevron,
  disabled,
  action,
  render,
  className,
  children,
  onClick,
  ...props
}: useRender.ComponentProps<"button"> & {
  /** A fact rather than a control; ignores chevron and disabled. */
  plain?: boolean
  /** A muted name before the value, read first. */
  label?: React.ReactNode
  icon?: React.ReactNode
  status?: ConversationDetailsStatus
  meta?: React.ReactNode
  chevron?: boolean
  action?: React.ReactNode
}) {
  const native =
    !render || (React.isValidElement(render) && render.type === "button")
  const row = useRender({
    defaultTagName: plain ? "div" : "button",
    render,
    props: {
      ...props,
      "data-slot": "conversation-details-row",
      "data-plain": plain ? "" : undefined,
      ...(plain
        ? { onClick }
        : {
            type: native ? "button" : undefined,
            disabled: native ? disabled : undefined,
            "aria-disabled": disabled || undefined,
            onClick: (event: Parameters<NonNullable<typeof onClick>>[0]) => {
              if (disabled) {
                event.preventDefault()
                return
              }
              onClick?.(event)
            },
          }),
      className: cn(
        "flex h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start text-2sm font-medium pointer-coarse:h-10",
        plain
          ? "text-foreground"
          : "group/details-row text-foreground/80 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:text-muted-foreground aria-disabled:pointer-events-none aria-disabled:text-muted-foreground aria-expanded:bg-muted data-popup-open:bg-muted",
        // grid: clear (room for the row's 36px action)
        action && "pe-9",
        className
      ),
      children: (
        <>
          {(icon || status) && (
            <span className="relative flex size-4 shrink-0 items-center justify-center text-muted-foreground">
              {icon && (
                <span
                  aria-hidden="true"
                  className="flex size-4 items-center justify-center *:size-4"
                >
                  {icon}
                </span>
              )}
              {status && (
                <StatusMark
                  {...status}
                  grey
                  className={
                    icon
                      ? "absolute -end-1 -bottom-1 scale-75 rounded-full bg-popover"
                      : undefined
                  }
                />
              )}
            </span>
          )}
          {label !== undefined ? (
            <>
              <span className="shrink-0 text-muted-foreground">{label}</span>{" "}
              <span className="min-w-0 flex-1 truncate">{children}</span>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate">{children}</span>
          )}
          {meta && (
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {meta}
            </span>
          )}
          {!plain && chevron && (
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          )}
        </>
      ),
    },
  })
  return (
    <div className="relative flex min-w-0 items-center">
      {row}
      {action && (
        <div className="absolute end-1 flex items-center">{action}</div>
      )}
    </div>
  )
}

function ConversationDetailsAction({
  label,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            {...props}
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            className={cn(
              "touch-target relative text-muted-foreground",
              className
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export {
  ConversationDetails,
  ConversationDetailsTrigger,
  ConversationDetailsArea,
  ConversationDetailsSection,
  ConversationDetailsRow,
  ConversationDetailsAction,
  type ConversationDetailsLabels,
  type ConversationDetailsStatus,
}
