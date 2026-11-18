"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowExpand01Icon } from "@hugeicons/core-free-icons"

import { ChipDetail, chipVariants } from "@/components/chip"
import { Clamp, type ClampLabels } from "@/components/clamp"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** UserMessage's words, for other languages. */
type UserMessageLabels = {
  /** Its screen-reader heading: "You". */
  author: string
}

/** Who wrote a message in the user's place. */
type UserMessageFrom = {
  /** An icon, e.g. <HugeiconsIcon icon={…} strokeWidth={2} />. */
  icon?: React.ReactNode
  /** Who it is from: "Subagent", the app's name. Also its screen-reader heading. */
  label: string
  /** Its text; the folded row shows its first non-empty line. */
  summary: string
}

/**
 * A message the user sent: at the end of the line, its parts below it.
 * Its screen-reader author heading defaults to h3: the page's h1 names the
 * app or page, the conversation's h2 its title, each message an h3 under it.
 * An app whose conversation has no h2 passes headingLevel={2}.
 * With `from`, someone else wrote it: folded to their label and first line.
 */
function UserMessage({
  className,
  children,
  labels,
  headingLevel = 3,
  from,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Message> & {
  labels?: Partial<UserMessageLabels>
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** Who wrote it when not the user: another agent, a subagent's report, an automation, the system. */
  from?: UserMessageFrom
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolled
  const contentId = React.useId()
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6"
  return (
    <Message
      data-slot="user-message"
      align="end"
      className={className}
      {...props}
    >
      <MessageContent className="gap-1">
        <Heading data-slot="user-message-heading" className="sr-only">
          {from?.label ?? labels?.author ?? "You"}
        </Heading>
        {from ? (
          <>
            <button
              type="button"
              data-slot="user-message-from"
              aria-expanded={open}
              aria-controls={contentId}
              onClick={() => setOpen(!open)}
              className="-me-2 flex h-7 max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none pointer-coarse:min-h-10"
            >
              {from.icon && (
                <span aria-hidden="true" className="shrink-0 [&_svg]:size-3.5">
                  {from.icon}
                </span>
              )}
              <span className="max-w-1/2 shrink-0 truncate font-medium">
                {from.label}
              </span>
              <span className="min-w-0 truncate text-muted-foreground">
                {from.summary
                  .split("\n")
                  .map((s) => s.trim())
                  .find(Boolean) ?? ""}
              </span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                strokeWidth={2}
                aria-hidden="true"
                className={cn(
                  "size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
                  !open && "-rotate-90"
                )}
              />
            </button>
            <div
              id={contentId}
              data-slot="user-message-from-content"
              // Its parts still the message's, at its end.
              className="contents *:data-slot:self-end"
              hidden={!open}
            >
              {children}
            </div>
          </>
        ) : (
          children
        )}
      </MessageContent>
    </Message>
  )
}

/** Over it, where it came from: "Sent from queue", with an icon. */
function UserMessageHeader({
  className,
  ...props
}: React.ComponentProps<typeof MessageHeader>) {
  return (
    <MessageHeader
      data-slot="user-message-header"
      className={cn(
        "gap-1 px-0 font-normal [&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

/** UserMessageText's words, for other languages: its fold's and these. */
type UserMessageTextLabels = ClampLabels & {
  /** The reader's title for it opened whole: "Your message". */
  title: string
  /** The button that opens it whole: "Open in reader". */
  open: string
}

/**
 * Its text in a muted bubble, cut to `lines` lines (6) when longer: a
 * `Clamp` whose row says how long it is and has `actions` (a copy
 * button) and, with `onOpen`, a button that opens it in a reader. Open
 * and scrolled past its start, a bar at the top says it is the user's
 * (`labels.title`) and closes it.
 */
function UserMessageText({
  lines = 6,
  open,
  defaultOpen,
  onOpenChange,
  onOpen,
  actions,
  labels,
  className,
  children,
  ...props
}: React.ComponentProps<typeof BubbleContent> & {
  lines?: number
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Opens it whole, e.g. in a `MessageReader` or the app's panel. */
  onOpen?: () => void
  /** In its row when it is long, e.g. a `CopyButton`. */
  actions?: React.ReactNode
  labels?: Partial<UserMessageTextLabels>
}) {
  return (
    <Bubble
      variant="muted"
      data-slot="user-message-text"
      // At most 9 of the column's 12 (docs/grid.md), at its end; a long
      // one, cut or opened, 10.
      className="max-w-span-9 has-[[data-slot=clamp]:is([data-clamped],[data-open])]:max-w-span-10"
    >
      <BubbleContent
        // Not clipped, so the bar sticks while it scrolls past and
        // reaches out across what scrolls. At 16px on phones (below md),
        // rounder; its lines apart with mentions in them, which are
        // taller than text. Its text 12px in from its edge and 8px down,
        // past its transparent border (for forced colours).
        className={cn(
          "overflow-visible px-3 py-2 text-base leading-7 [--clamp-muted:var(--muted-foreground)] max-sm:rounded-2xl",
          className
        )}
        {...props}
      >
        <Clamp
          lines={lines}
          {...(open === undefined ? {} : { open })}
          {...(defaultOpen === undefined ? {} : { defaultOpen })}
          {...(onOpenChange ? { onOpenChange } : {})}
          {...(labels ? { labels } : {})}
          title={labels?.title ?? "Your message"}
          actions={
            actions || onOpen ? (
              <>
                {actions}
                {onOpen && (
                  <UserMessageAction
                    label={labels?.open ?? "Open in reader"}
                    onClick={onOpen}
                  >
                    <HugeiconsIcon icon={ArrowExpand01Icon} strokeWidth={2} />
                  </UserMessageAction>
                )}
              </>
            ) : undefined
          }
          className="scroll-mt-4 [&>[data-slot=clamp-content]]:whitespace-pre-wrap"
        >
          {children}
        </Clamp>
      </BubbleContent>
    </Bubble>
  )
}

/**
 * Under it: when it was sent, whether it was edited, and what the reader
 * can do with it (edit, copy). Shown while the pointer is on the message
 * or focus is in it, and always on touch screens.
 */
function UserMessageFooter({
  className,
  ...props
}: React.ComponentProps<typeof MessageFooter>) {
  return (
    <MessageFooter
      data-slot="user-message-footer"
      className={cn(
        // Its words 8px in from the bubble's edge, about where its
        // buttons' icons are.
        "gap-0.5 px-0 font-normal tabular-nums opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 pointer-coarse:opacity-100 [&>span]:me-2",
        className
      )}
      {...props}
    />
  )
}

/** An icon button for the message, e.g. "Edit": its name in a tooltip. */
function UserMessageAction({
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
            data-slot="user-message-action"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            // 14px icons in 28px buttons, in the faintest grey till hovered.
            className={cn(
              "text-subtle-foreground hover:text-foreground [&_svg:not([class*='size-'])]:size-3.5",
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

/**
 * Something the message refers to, in its text: a file, an image, a
 * link, as the composer showed it. Its icon or thumbnail (an `img`) goes
 * first, then its name, then `detail` ("12 pages"). With `onClick` it is
 * a button, e.g. opening it beside the conversation.
 */
function MessageMention({
  detail,
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { detail?: React.ReactNode }) {
  // On the bubble's tint: the page's colour. On the text's baseline, by
  // its label's (MessageMentionLabel's).
  const look = cn(
    chipVariants({ variant: "raised" }),
    "mx-px align-baseline",
    onClick &&
      "cursor-pointer transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:bg-foreground/10",
    className
  )
  const content = (
    <>
      {children}
      {detail && <ChipDetail>{detail}</ChipDetail>}
    </>
  )
  return onClick ? (
    <button
      type="button"
      data-slot="message-mention"
      className={look}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  ) : (
    <span data-slot="message-mention" className={look}>
      {content}
    </span>
  )
}

/**
 * Its name, cut short with an ellipsis when long: the mention's baseline,
 * on the text's (as tall as the mention, so it stays where it is).
 */
function MessageMentionLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="message-mention-label"
      className={cn("self-baseline truncate font-medium", className)}
      {...props}
    />
  )
}

/**
 * A command in the message's text ("/review"), as the composer's chip
 * showed it: a chip in monospace, the command's own words, what follows
 * it the message's.
 */
function MessageCommand({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="message-command"
      className={cn(
        chipVariants({ variant: "raised" }),
        "mx-px align-baseline font-mono",
        className
      )}
      {...props}
    />
  )
}

/**
 * A message that is only a command ("/compact", "/clear"): an order to
 * the app, not words to the model, so no bubble. A quiet line in
 * monospace on a hairline, at the message's end, a long one wrapping;
 * an icon may go first.
 * What it did follows as the app's own, e.g. a `MessageDivider`.
 */
function UserMessageCommand({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="user-message-command"
      className={cn(
        "inline-flex min-h-7 max-w-span-9 min-w-0 items-center gap-1 rounded-md px-2 py-1 font-mono text-2sm leading-5 wrap-anywhere text-muted-foreground inset-ring inset-ring-border [&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * A web address in the message's text, as a link: the site's icon
 * (`icon`, e.g. its favicon as an `img`) before its words, centred on
 * the line in any script (not by the Latin x-height, which leaves it
 * low beside CJK text), a little apart from the text before it; its
 * words underlined as a reply's links are, breaking anywhere.
 */
function MessageLink({
  icon,
  className,
  children,
  ...props
}: React.ComponentProps<"a"> & {
  /** The site's: an `img` or an icon, 14px. */
  icon?: React.ReactNode
}) {
  return (
    <a
      data-slot="message-link"
      className={cn(
        "break-all text-foreground underline decoration-muted-foreground underline-offset-3 hover:decoration-foreground",
        className
      )}
      {...props}
    >
      {icon !== undefined && icon !== null && (
        // A line tall, at the line's top: its icon in the middle of the
        // line, where the text's glyphs are centred.
        <span
          aria-hidden="true"
          data-slot="message-link-icon"
          className="ms-0.5 me-1 inline-flex h-lh items-center align-top *:shrink-0 [&>img]:size-3.5 [&>img]:object-contain [&>svg]:size-3.5"
        >
          {icon}
        </span>
      )}
      {/* No break between the icon and its words: a long address goes on
          beside it, not to the next line, leaving it alone. */}
      {icon !== undefined && icon !== null && "\u2060"}
      {children}
    </a>
  )
}

export {
  MessageCommand,
  MessageLink,
  MessageMention,
  MessageMentionLabel,
  UserMessage,
  UserMessageAction,
  UserMessageCommand,
  UserMessageFooter,
  UserMessageHeader,
  UserMessageText,
  type UserMessageFrom,
  type UserMessageLabels,
  type UserMessageTextLabels,
}
