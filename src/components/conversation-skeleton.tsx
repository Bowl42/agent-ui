import * as React from "react"
import { cn } from "cn"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Lines of text not here yet, each a thin rounded bar on a line of the
 * text's height (`h-lh`), so the place is as tall as the text will be.
 * `widths`, one a line, its last shortest as a paragraph's.
 */
function SkeletonLines({
  widths = ["w-4/5", "w-3/5", "w-2/3"],
  className,
  ...props
}: React.ComponentProps<"div"> & {
  /** Each line's width, a class: "w-4/5". */
  widths?: readonly string[]
}) {
  return (
    <div
      data-slot="skeleton-lines"
      aria-hidden="true"
      className={cn("flex flex-col", className)}
      {...props}
    >
      {widths.map((width, index) => (
        <div key={index} className="flex h-lh items-center">
          {/* grid: mark */}
          <Skeleton className={cn("h-2.5 rounded-full", width)} />
        </div>
      ))}
    </div>
  )
}

/**
 * A conversation not here yet: a message asked, at the end edge in a
 * bubble the user's size, and the lines of an answer, in the
 * conversation's type (16px on lines of 28px). Seen only past a short
 * wait (`animate-wait-in`), so a quick load never flashes it; a status,
 * named by `label` ("Loading conversation").
 */
function ConversationSkeleton({
  label = "Loading conversation",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  /** Its name for screen readers. */
  label?: string
}) {
  return (
    <div
      data-slot="conversation-skeleton"
      role="status"
      aria-label={label}
      className={cn("flex animate-wait-in flex-col gap-6", className)}
      {...props}
    >
      {/* The user's bubble: a line of 28px and 8px each side, past its
          transparent border (as the bubble's, for forced colours). */}
      <Skeleton
        aria-hidden="true"
        className="ms-auto box-content h-11 w-2/5 max-w-span-9 rounded-xl border border-transparent max-sm:rounded-2xl"
      />
      <SkeletonLines className="text-base leading-7" />
    </div>
  )
}

export { ConversationSkeleton, SkeletonLines }
