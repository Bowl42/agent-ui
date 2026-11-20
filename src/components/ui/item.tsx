import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Separator } from "@/components/ui/separator"

// agentui: with `columns`, its items' facts (`ItemMeta`) and actions
// stand in columns across them, each as wide as its widest, as a table's
// would: media (where any item has it), content, then that many
// columns, in each item's subgrid. On a phone, a list as without, each
// item's parts in a row.
function ItemGroup({
  className,
  style,
  columns,
  ...props
}: React.ComponentProps<"div"> & {
  /** How many columns after the content: its facts and its actions. */
  columns?: number | undefined
}) {
  return (
    <div
      role="list"
      data-slot="item-group"
      data-columns={columns}
      className={cn(
        "group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2 has-data-[size=xs]:gap-2 has-data-[size=compact]:gap-y-0",
        columns !== undefined &&
          "sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(var(--item-columns),auto)] gap-x-4 has-data-[size=sm]:gap-x-4 has-data-[size=xs]:gap-x-4 sm:has-data-[slot=item-media]:grid-cols-[auto_minmax(0,1fr)_repeat(var(--item-columns),auto)]",
        className
      )}
      style={
        columns === undefined
          ? style
          : ({ "--item-columns": columns, ...style } as React.CSSProperties)
      }
      {...props}
    />
  )
}

// agentui: a run of an ItemGroup's items under a word ("Today",
// "Yesterday"): small, in grey, where the items' words start, lighter
// than a section's title. A heading where the app makes it one
// (render={<h3 />}).
function ItemGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "col-span-full border-x border-transparent px-3 pt-2 text-xs leading-4 font-medium text-muted-foreground not-first:pt-4",
          className
        ),
      },
      props
    ),
    render,
    state: { slot: "item-group-label" },
  })
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("my-2", className)}
      {...props}
    />
  )
}

// agentui: an item made a button (render={<button />}), as a row the
// app acts on, answers the pointer as a link does, pressed too (on a
// touch screen, where nothing hovers); its words start where a row's do,
// and disabled it waits, faint. The current one (aria-current, as a
// link to the page shown or the entry open beside a list), the selected
// one (aria-selected, in a listbox) or one marked data-active is on the
// hover's grey, kept. In an ItemGroup with `columns`, its parts stand in
// the group's columns (on a phone, in a row as without). With an
// ItemLink, it is hovered where its link is, and its link's focus ring
// is round it.
const itemVariants = cva(
  "group/item has-data-[slot=item-link]:relative has-[[data-slot=item-link]:hover]:bg-muted flex w-full flex-wrap items-center rounded-lg border text-sm transition-colors outline-none motion-hover aria-selected:bg-muted data-active:bg-muted [&[aria-current]:not([aria-current=false])]:bg-muted sm:group-data-columns/item-group:col-span-full sm:group-data-columns/item-group:grid sm:group-data-columns/item-group:grid-cols-subgrid sm:group-data-columns/item-group:gap-x-4 sm:group-data-columns/item-group:group-has-data-[slot=item-media]/item-group:*:data-[slot=item-content]:col-start-2 sm:group-data-columns/item-group:*:data-[slot=item-media]:col-start-1 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a,button]:transition-colors [a,button]:hover:bg-muted [a,button]:active:bg-muted [button]:text-start [button]:disabled:pointer-events-none [button]:disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-transparent",
        outline: "border-border",
        muted: "border-transparent bg-muted/50",
      },
      size: {
        default: "gap-2 px-3 py-3",
        sm: "gap-2 px-3 py-2",
        xs: "gap-2 px-2 py-2 in-data-[slot=dropdown-menu-content]:p-0",
        // agentui: a long list's row, as the sidebar's: 32px, 8px in,
        // no outline (whatever its variant), its corners a row's; rows
        // in an ItemGroup touch, hovered alone (a line under its title:
        // see ItemContent).
        compact:
          "min-h-8 gap-2 rounded-md border-transparent px-2 py-0 data-[variant=muted]:bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Item({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(itemVariants({ variant, size, className })),
      },
      props
    ),
    render,
    state: {
      slot: "item",
      variant,
      size,
    },
  })
}

const itemMediaVariants = cva(
  // agentui: beside a second line it starts at the title, a phone's
  // line (ItemDescription phoneOnly) counting only on a phone; in a
  // compact row past the content's own room over it (4px, a phone's 8px).
  "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]:not([data-phone-only])]/item:translate-y-0.5 group-has-[[data-slot=item-description]:not([data-phone-only])]/item:self-start max-sm:group-has-data-[slot=item-description]/item:translate-y-0.5 max-sm:group-has-data-[slot=item-description]/item:self-start group-data-[size=compact]/item:group-has-[[data-slot=item-description]:not([data-phone-only])]/item:mt-1 max-sm:group-data-[size=compact]/item:group-has-data-[slot=item-description]/item:mt-2 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "[&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
        // agentui: a row's number (1, 2, 12) on a round grey mark of one
        // width, its digits of one width, so the rows' titles start on
        // one line whatever the number.
        number:
          "size-5 rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none",
        // agentui: in a compact item, with a line under its title, as
        // the sidebar's two-line rows: 4px over and under, 8px on a
        // phone; its buttons beside it as tall as they were.
        "group-data-[size=compact]/item:has-[[data-slot=item-description]:not([data-phone-only])]:py-1 max-sm:group-data-[size=compact]/item:has-data-[slot=item-description]:py-2",
        className
      )}
      {...props}
    />
  )
}

// agentui: an item's title as its link (or, render={<button />}, its
// button): over the whole row, so the row is pressed anywhere but its
// actions, which stay above it; the row hovered where it is, its focus
// ring round the row. In an ItemTitle.
function ItemLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "rounded-xs text-start outline-none after:absolute after:inset-0 after:rounded-lg group-data-[size=compact]/item:after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50",
          className
        ),
      },
      props
    ),
    render,
    state: { slot: "item-link" },
  })
}

function ItemTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        // agentui: as wide as its words but no wider than its column
        // (max-w-fit on its own width, not w-fit), so a part cut short is
        // cut there, not over the next column; and as narrow as that
        // column: a width of fit-content made a grid's column as wide
        // as its words in Firefox and WebKit, whatever its min-width.
        "line-clamp-1 flex max-w-fit min-w-0 items-center gap-2 text-sm leading-5 font-medium underline-offset-4",
        className
      )}
      {...props}
    >
      {/* agentui: its text one line, ending in an ellipsis: a flex box
          takes no line clamp, so a long title wrapped or ran past its
          column. Its elements (a badge, a link) as they are. */}
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <span data-slot="item-title-text" className="min-w-0 truncate">
            {child}
          </span>
        ) : (
          child
        )
      )}
    </div>
  )
}

function ItemDescription({
  className,
  phoneOnly = false,
  ...props
}: React.ComponentProps<"p"> & {
  /**
   * agentui: a line only a phone shows (as facts a desktop gives
   * columns): hidden from `sm`, where the row is one line.
   */
  phoneOnly?: boolean
}) {
  return (
    <p
      data-slot="item-description"
      data-phone-only={phoneOnly || undefined}
      className={cn(
        phoneOnly && "sm:hidden",
        "line-clamp-2 text-left text-sm leading-5 font-normal text-muted-foreground group-data-[size=xs]/item:text-xs [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

// agentui: a fact at an item's end (a time, a cost, a branch): small,
// grey, on one line, its digits of one width; in an ItemGroup with
// `columns`, in a column of the same fact of every item, at its end
// (`align="start"`: at its start, for words).
function ItemMeta({
  className,
  align = "end",
  ...props
}: React.ComponentProps<"div"> & {
  /** Its column's end (numbers, by default) or start (words). */
  align?: "start" | "end"
}) {
  return (
    <div
      data-slot="item-meta"
      data-align={align}
      className={cn(
        "shrink-0 text-xs leading-4 whitespace-nowrap text-muted-foreground tabular-nums",
        align === "end" ? "text-end" : "text-start",
        className
      )}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn(
        // agentui: in an ItemGroup's columns, at its column's end; above
        // an ItemLink's area.
        "relative flex items-center gap-2 sm:group-data-columns/item-group:justify-end",
        className
      )}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemGroupLabel,
  ItemLink,
  ItemMeta,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
