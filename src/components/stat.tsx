import * as React from "react"
import { cn } from "cn"

/**
 * Headline numbers, side by side: as many columns as fit, each at least
 * 192px (`grid-cols-fill-48`), 16px apart; one under another on a phone.
 */
function StatGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-grid"
      className={cn("grid grid-cols-fill-48 gap-4", className)}
      {...props}
    />
  )
}

/**
 * A headline number: its `StatLabel` ("Spend this month"), its
 * `StatValue` large ("$412.80") and a `StatDetail` line ("+12% on
 * last month"), in a card's hairline edge, 16px in.
 */
function Stat({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat"
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-4 text-card-foreground",
        className
      )}
      {...props}
    />
  )
}

/** What the number is: 13px, grey. */
function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-label"
      className={cn("truncate text-2sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/** The number: 22px (`text-display`), its digits of one width. */
function StatValue({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-value"
      className={cn(
        "truncate text-display font-semibold tabular-nums",
        className
      )}
      {...props}
    />
  )
}

/** A line under it: what it is against, when; small, in the faintest grey. */
function StatDetail({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-detail"
      className={cn("text-xs text-subtle-foreground", className)}
      {...props}
    />
  )
}

/**
 * A row of facts under a page's title (Plan Pro · Seats 4 · Renews
 * 1 Dec): each its label over its value, 24px apart, wrapping where it
 * is narrow. A description list.
 */
function FactList({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="fact-list"
      className={cn("flex flex-wrap gap-x-6 gap-y-3 text-2sm", className)}
      {...props}
    />
  )
}

/** One of a `FactList`'s: its `label` small and grey over its value. */
function Fact({
  label,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="fact"
      className={cn("flex min-w-0 flex-col", className)}
      {...props}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate tabular-nums">{children}</dd>
    </div>
  )
}

export { Fact, FactList, Stat, StatDetail, StatGrid, StatLabel, StatValue }
