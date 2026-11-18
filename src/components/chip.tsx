import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * A chip's look: a file, an image, a link or a mention in a line of text,
 * 24px tall, its icon or thumbnail (an `img`) first, then its name, on a
 * hairline. `muted` on a field, e.g. the composer's (in dark, the page's
 * colour, recessed in the lighter field); `raised`, the page's colour, on
 * a tint, e.g. a sent message's bubble; `outline`, on the
 * page with a hairline in grey, 12px, e.g. an answer's sources. `md`,
 * 28px, a row of its own under the text.
 */
const chipVariants = cva(
  "inline-flex h-6 max-w-64 min-w-0 items-center gap-1 overflow-hidden rounded-md ps-2 pe-2 text-2sm leading-6 font-normal whitespace-nowrap text-foreground inset-ring inset-ring-border has-[>img:first-child]:ps-1 [&_img]:size-4 [&_img]:shrink-0 [&_img]:rounded-xs [&_img]:object-cover [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
  {
    variants: {
      variant: {
        muted: "bg-muted dark:bg-background dark:inset-ring-foreground/15",
        raised: "bg-background",
        outline:
          "text-xs text-muted-foreground hover:text-foreground [a]:hover:bg-muted/60",
      },
      size: {
        default: "",
        md: "h-7 ps-2 pe-3 leading-7",
      },
    },
    defaultVariants: { variant: "muted", size: "default" },
  }
)

/** A chip: `chipVariants` on a span, e.g. a mention in a sent message. */
function Chip({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return (
    <span
      data-slot="chip"
      data-variant={variant ?? "muted"}
      data-size={size ?? "default"}
      className={cn(chipVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/**
 * What follows a chip's name, smaller and grey: "12 pages", a host. Cut
 * short first when the chip has no room, so a long one does not take the
 * name's.
 */
function ChipDetail({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chip-detail"
      className={cn(
        "min-w-0 shrink-100 truncate text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/** Chips in a row of their own, wrapping: e.g. an answer's sources. */
function ChipList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="chip-list"
      className={cn("flex min-w-0 flex-wrap gap-1", className)}
      {...props}
    />
  )
}

export { Chip, ChipDetail, ChipList, chipVariants }
