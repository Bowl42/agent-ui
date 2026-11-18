"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  MoreHorizontalIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageFooter } from "@/components/ui/message"
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

/**
 * Under a turn once it has ended, where it ends: what the reader can do
 * with it (a `copy-button`, `AgentTurnRetry`, `AgentTurnAction`s,
 * `AgentTurnMore`), then `AgentTurnInfo`, the facts of the turn. Its
 * icons line up with the text above.
 *
 * Hidden while the `AgentTurn` before it runs. `visibility="hover"` is for
 * the turns before the last: its actions show while the message is
 * hovered or holds the focus, where hovering is possible, and keep their
 * place so nothing moves; its facts stay. Where the footer is narrow (a phone), its buttons are a
 * finger's size and the `optional` actions are left out.
 */
function AgentTurnFooter({
  visibility = "always",
  className,
  children,
  ...props
}: React.ComponentProps<typeof MessageFooter> & {
  visibility?: "always" | "hover"
}) {
  // Its facts stay; its actions may show on hover only.
  const parts = React.Children.toArray(children)
  const facts = parts.filter(
    (part) => React.isValidElement(part) && part.type === AgentTurnInfo
  )
  const actions = parts.filter((part) => !facts.includes(part))
  return (
    <MessageFooter
      data-slot="agent-turn-footer"
      data-visibility={visibility}
      className={cn(
        // Its width is what "narrow" is measured by.
        "@container/agent-turn-footer max-w-none px-0 font-normal [[data-slot=agent-turn][data-status=running]~&]:hidden",
        className
      )}
      {...props}
    >
      <div
        data-slot="agent-turn-footer-content"
        className={cn(
          // Out by a button's padding, so the first icon lines up with
          // the text above: 16px icons in 32px buttons, the row's
          // height. Under a finger, 40px buttons (their icons larger on
          // a phone only).
          "-ms-2 flex h-8 min-w-0 flex-1 items-center @max-sm:-ms-3 @max-sm:h-10 pointer-coarse:-ms-3 pointer-coarse:h-10",
          // A copy button is one of its actions.
          "[&_[data-slot=copy-button]]:size-8 @max-sm:[&_[data-slot=copy-button]]:size-10 pointer-coarse:[&_[data-slot=copy-button]]:size-10 [&_[data-slot=copy-button]_svg:not([class*='size-'])]:size-4 @max-sm:[&_[data-slot=copy-button]_svg:not([class*='size-'])]:size-5"
        )}
      >
        <div
          data-slot="agent-turn-footer-actions"
          data-visibility={visibility}
          className="flex min-w-0 shrink-0 items-center text-subtle-foreground data-[visibility=hover]:opacity-0 data-[visibility=hover]:transition-opacity data-[visibility=hover]:group-hover/message:opacity-100 data-[visibility=hover]:focus-within:opacity-100 data-[visibility=hover]:hover:opacity-100 data-[visibility=hover]:has-aria-expanded:opacity-100 data-[visibility=hover]:[@media(hover:none)]:opacity-100"
        >
          {actions}
        </div>
        {facts}
      </div>
    </MessageFooter>
  )
}

const actionClass =
  "size-8 [&_svg:not([class*='size-'])]:size-4 pointer-coarse:size-10 @max-sm:size-10 @max-sm:[&_svg:not([class*='size-'])]:size-5"

/**
 * A footer's menu: a hint at an item's end (`DropdownMenuShortcut`,
 * "Max", "Faster", "⌘R") is plain small text in the faintest grey, not
 * spaced as keys are.
 */
const menuClass =
  "p-1 **:data-[slot=dropdown-menu-item]:text-2sm **:data-[slot=dropdown-menu-label]:text-2xs **:data-[slot=dropdown-menu-label]:font-medium **:data-[slot=dropdown-menu-shortcut]:tracking-normal **:data-[slot=dropdown-menu-shortcut]:text-subtle-foreground **:data-[slot=dropdown-menu-shortcut]:tabular-nums"

/**
 * An icon button for a turn, e.g. "Branch from here": its name in a
 * tooltip. `optional` ones are left out where the footer is narrow; put
 * them in `AgentTurnMore` too.
 */
function AgentTurnAction({
  label,
  optional = false,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string
  optional?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            data-slot="agent-turn-action"
            data-optional={optional || undefined}
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn(
              actionClass,
              "data-optional:@max-sm:hidden",
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

/** AgentTurnRetry's words, for other languages. */
type AgentTurnRetryLabels = {
  retry: string
  /** Its menu's button. */
  more: string
}

/**
 * "Retry", and beside it, if it has `children` (`DropdownMenuItem`s,
 * `DropdownMenuLabel`s…), a menu of other ways to retry: with more
 * thinking, with another model. The menu is left out where the footer is
 * narrow.
 */
function AgentTurnRetry({
  labels,
  onClick,
  children,
}: {
  onClick?: React.ComponentProps<typeof Button>["onClick"]
  /** The retry button's name and the menu's, for other languages. */
  labels?: Partial<AgentTurnRetryLabels>
  children?: React.ReactNode
}) {
  const retry = labels?.retry ?? "Retry"
  const more = labels?.more ?? "More ways to retry"
  // Its menu opens from the whole group, at Retry's edge.
  const group = React.useRef<HTMLDivElement>(null)
  return (
    <ButtonGroup
      ref={group}
      data-slot="agent-turn-retry"
      aria-label={retry}
      className="rounded-lg has-aria-expanded:bg-muted has-aria-expanded:text-foreground dark:has-aria-expanded:bg-muted/50"
    >
      <AgentTurnAction
        label={retry}
        onClick={onClick}
        // The group's corners, as its menu's chevron has.
        className="rounded-lg"
      >
        <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
      </AgentTurnAction>
      {children !== undefined && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      data-slot="agent-turn-retry-menu"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={more}
                      // Beside the button, its height (the group's), a
                      // part of it; 24px wide, a target's least beside
                      // another (WCAG 2.5.8). Its focus ring over the
                      // button's.
                      className="h-auto w-6 focus-visible:z-10 aria-expanded:bg-transparent @max-sm:hidden"
                    />
                  }
                />
              }
            >
              <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>{more}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            side="top"
            anchor={group}
            className={cn("w-72", menuClass)}
          >
            {children}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </ButtonGroup>
  )
}

/**
 * "More": a menu of what is needed less often, e.g. copying as plain
 * text, reading aloud, hiding the turn; `children` are its items.
 */
function AgentTurnMore({
  label = "More",
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  data-slot="agent-turn-more"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={label}
                  className={actionClass}
                />
              }
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side="top"
        alignOffset={-10}
        className={cn("w-64", menuClass)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The facts of the turn at the footer's end, its children joined by
 * a dot: the model, how long it took, when ("Opus 5.5 · 48s · 12:04"),
 * or how it ended ("Stopped by you · 12:06"). One fact a child, short:
 * not "$1.16 · 3,909 tokens" in one, which joins with a dot of its own;
 * numbers (tokens, cost) go in `details`. A fact in an `AgentTurnFact`
 * says more on hover, alone (the time's full date). Put the time last:
 * where the footer is narrow, only the last shows. With `details`
 * (`AgentTurnDetails`), pressing them shows the turn's numbers. Its words
 * end where the text above does.
 */
function AgentTurnInfo({
  details,
  detailsLabel = "This turn",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  details?: React.ReactNode
  /** The details' name, for screen readers. */
  detailsLabel?: string
}) {
  // Facts of their own (a component marked `keptInFooter`, e.g.
  // AgentTurnChangesTrigger, itself a button): first, out of the details'
  // button, and kept where the footer is narrow.
  const all = React.Children.toArray(children)
  const kept = all.filter(
    (part) =>
      React.isValidElement(part) &&
      typeof part.type === "function" &&
      "keptInFooter" in part.type
  )
  const facts = all
    .filter((part) => !kept.includes(part))
    .map((fact, index) => (
      <React.Fragment key={index}>
        {index > 0 && (
          // A space each side, as in words, and a little more.
          <span
            data-slot="agent-turn-info-separator"
            className="mx-1 whitespace-pre opacity-60 @max-sm:hidden"
          >
            {" · "}
          </span>
        )}
        <span
          data-slot="agent-turn-info-fact"
          className="not-last:@max-sm:hidden"
        >
          {fact}
        </span>
      </React.Fragment>
    ))
  return (
    <div
      data-slot="agent-turn-info"
      className={cn(
        // Narrowed, only a fact of its own (the changes) gives way. Its
        // words as far in as an xs Button's padding, and out by as
        // much, so they end where the text above does.
        "ms-auto -me-2 flex min-w-0 items-center text-xs text-subtle-foreground tabular-nums @max-sm:text-2sm",
        className
      )}
      {...props}
    >
      {kept.map((part, index) => (
        <React.Fragment key={index}>
          <span className="flex h-6 min-w-0 items-center ps-2">{part}</span>
          {/* No space before: its chevron's own makes it up. */}
          <span
            data-slot="agent-turn-info-separator"
            className="me-1 shrink-0 whitespace-pre opacity-60"
          >
            {" · "}
          </span>
        </React.Fragment>
      ))}
      {details === undefined ? (
        <span
          className={cn(
            "flex h-6 shrink-0 items-center px-2 whitespace-nowrap",
            kept.length > 0 && "ps-0"
          )}
        >
          {facts}
        </span>
      ) : (
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                data-slot="agent-turn-info-trigger"
                // Pressed, the card; hovered, a fact says more, alone, so
                // the group is not tinted on hover.
                className={cn(
                  "flex h-6 shrink-0 cursor-pointer items-center rounded-md px-2 whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-muted-foreground @max-sm:h-10 dark:aria-expanded:bg-muted/50",
                  kept.length > 0 && "ps-0"
                )}
              />
            }
          >
            {facts}
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-72 gap-0 p-1"
            data-slot="agent-turn-info-details"
            aria-label={detailsLabel}
          >
            {details}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

/**
 * A fact in `AgentTurnInfo` that says more on hover, in a tooltip of its
 * own: the time's full date ("Saturday, Nov 8 · 12:04:03"), the model's
 * settings. Hovered, it alone is tinted.
 */
function AgentTurnFact({
  tooltip,
  className,
  ...props
}: React.ComponentProps<"span"> & { tooltip: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            data-slot="agent-turn-fact"
            className={cn(
              // Tinted out to its sides, its words where they were.
              "-mx-1 inline-flex h-5 items-center rounded-sm px-1 transition-colors hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
              className
            )}
            {...props}
          />
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/**
 * A list of the turn's numbers in `AgentTurnInfo`'s details, under its
 * `label` if it has one ("This turn", "Tokens"); a rule between two.
 */
function AgentTurnDetails({
  label,
  className,
  ...props
}: React.ComponentProps<"dl"> & { label?: React.ReactNode }) {
  const id = React.useId()
  return (
    <div
      data-slot="agent-turn-details"
      role={label === undefined ? undefined : "group"}
      aria-labelledby={label === undefined ? undefined : id}
      // Its rule runs edge to edge of the card, past its padding.
      className="-mx-1 flex flex-col px-1 py-1 not-first:border-t"
    >
      {label !== undefined && (
        <p
          id={id}
          data-slot="agent-turn-details-label"
          className="flex h-7 items-end px-2 pb-1 text-2xs font-medium text-subtle-foreground"
        >
          {label}
        </p>
      )}
      <dl className={cn("flex flex-col", className)} {...props} />
    </div>
  )
}

/** One of the turn's numbers: "Input 18.2k", `note` "12.0k cached". */
function AgentTurnDetail({
  label,
  note,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode
  note?: React.ReactNode
}) {
  return (
    <div
      data-slot="agent-turn-detail"
      className={cn("flex h-7 items-center gap-3 px-2 text-2sm", className)}
      {...props}
    >
      <dt className="text-subtle-foreground">{label}</dt>
      <dd className="ms-auto flex items-baseline gap-1 text-foreground tabular-nums">
        {children}
        {note !== undefined && (
          <span className="text-xs text-subtle-foreground">{note}</span>
        )}
      </dd>
    </div>
  )
}

export {
  AgentTurnAction,
  AgentTurnDetail,
  AgentTurnDetails,
  AgentTurnFact,
  AgentTurnFooter,
  AgentTurnInfo,
  AgentTurnMore,
  AgentTurnRetry,
  type AgentTurnRetryLabels,
}
