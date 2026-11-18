"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * An event in a conversation, between its messages: a day, the context
 * compacted, the model switched, a branch. One centred line between
 * rules, an icon first; what can be followed is a `MessageDividerAction`.
 * With `running`, its words shimmer (respecting reduced motion), for example
 * while compacting context. Its icon stays in the text colour.
 * Not a `separator`: that role would hide its actions from screen
 * readers.
 */
function MessageDivider({
  className,
  children,
  running = false,
  ...props
}: React.ComponentProps<"div"> & { running?: boolean }) {
  return (
    <div
      data-slot="message-divider"
      data-running={running || undefined}
      aria-busy={running || undefined}
      className={cn(
        "flex min-h-6 w-full min-w-0 items-center gap-2 text-xs text-subtle-foreground before:h-px before:min-w-4 before:flex-1 before:bg-border after:h-px after:min-w-4 after:flex-1 after:bg-border",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "flex min-w-0 items-center gap-1 text-center [&_svg]:size-3 [&_svg]:shrink-0",
          // Shimmer uses text fill, leaving SVG currentColor strokes visible.
          running && "shimmer motion-reduce:shimmer-none"
        )}
      >
        {children}
      </span>
    </div>
  )
}

/** A part of the event that can be followed: "View summary". */
function MessageDividerAction({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="message-divider-action"
      className={cn(
        "relative cursor-pointer rounded-sm font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:after:absolute pointer-coarse:after:-inset-3",
        className
      )}
      {...props}
    />
  )
}

export { MessageDivider, MessageDividerAction }
