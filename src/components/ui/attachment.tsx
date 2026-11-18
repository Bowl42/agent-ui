import * as React from "react"
import { useShimmerPause } from "@/hooks/use-shimmer-pause"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// agent-ui: unchanged; its registry item depends on the fixed button, so
// installing it does not bring back shadcn's.
import { Button } from "@/components/ui/button"

// agent-ui: keyboard-only container ring; filled text chips and square image tiles.
const attachmentVariants = cva(
  "group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-xl border bg-card text-card-foreground transition-colors has-focus-visible:ring-1 has-focus-visible:ring-ring/50 has-[>a,>button]:hover:bg-muted/50 data-[state=error]:border-destructive/30 data-[state=idle]:border-dashed",
  {
    variants: {
      size: {
        default:
          "gap-2 text-sm has-data-[slot=attachment-content]:px-3 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2",
        sm: "gap-2 text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2",
        xs: "gap-1 rounded-lg text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1",
      },
      orientation: {
        horizontal: "min-w-40 items-center",
        vertical: "w-24 flex-col has-data-[slot=attachment-content]:w-32",
      },
      // agent-ui: opt-in pasted-text chip or edge-to-edge 64px image tile.
      variant: {
        default: "",
        tile:
          "size-16 min-w-0 snap-start flex-nowrap overflow-hidden rounded-lg bg-muted p-0 has-data-[slot=attachment-content]:p-0 has-data-[slot=attachment-media]:p-0 has-[>a,>button]:hover:bg-muted data-[state=error]:border-dashed",
        filled:
          "h-11 flex-nowrap rounded-md border-0 bg-muted has-data-[slot=attachment-content]:px-3 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:px-3 has-data-[slot=attachment-media]:py-2 has-[>a,>button]:hover:bg-muted [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
      },
    },
    // agent-ui: preserve the original card unless a chip or image tile is requested.
    defaultVariants: { variant: "default" },
  }
)

function Attachment({
  className,
  // agent-ui: expose the opt-in visual variant.
  variant = "default",
  state = "done",
  size = "default",
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof attachmentVariants> & {
    state?: "idle" | "uploading" | "processing" | "error" | "done"
  }) {
  return (
    <div
      data-slot="attachment"
      // agent-ui: let child parts follow the chip and tile variants.
      data-variant={variant}
      data-state={state}
      data-size={size}
      data-orientation={orientation}
      // agent-ui: include the visual variant without changing size or orientation defaults.
      className={cn(
        attachmentVariants({ variant, size, orientation }),
        className
      )}
      {...props}
    />
  )
}

// agent-ui: filled chips use a 32px inset; image tiles fill the bordered root.
const attachmentMediaVariants = cva(
  "group-data-[variant=tile]/attachment:absolute group-data-[variant=tile]/attachment:inset-0 group-data-[variant=tile]/attachment:size-full group-data-[variant=tile]/attachment:w-full group-data-[variant=tile]/attachment:rounded-none group-data-[variant=tile]/attachment:inset-ring-0 relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-md group-data-[state=error]/attachment:bg-destructive/10 group-data-[state=error]/attachment:text-destructive group-data-[variant=filled]/attachment:w-8 group-data-[variant=filled]/attachment:rounded-md group-data-[variant=filled]/attachment:bg-card group-data-[variant=filled]/attachment:inset-ring group-data-[variant=filled]/attachment:inset-ring-border group-data-[orientation=vertical]/attachment:*:data-[slot=spinner]:size-6! [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 group-data-[orientation=vertical]/attachment:[&_svg:not([class*='size-'])]:size-6 group-data-[size=xs]/attachment:[&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        icon: "",
        image:
          "opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover group-data-[variant=tile]/attachment:*:[img]:size-full",
      },
    },
    defaultVariants: {
      variant: "icon",
    },
  }
)

function AttachmentMedia({
  className,
  variant = "icon",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof attachmentMediaVariants>) {
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn(attachmentMediaVariants({ variant }), className)}
      {...props}
    />
  )
}

function AttachmentContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-content"
      className={cn(
        // agent-ui: keep image tile names and status available to screen readers.
        "group-data-[variant=tile]/attachment:sr-only max-w-full min-w-0 flex-1 leading-4 group-data-[orientation=vertical]/attachment:px-1",
        className
      )}
      {...props}
    />
  )
}

function AttachmentTitle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  // agent-ui: pause running titles while out of view.
  useShimmerPause()
  return (
    <span
      data-slot="attachment-title"
      className={cn(
        // agent-ui: filled titles use the closest named type step and regular weight.
        "block max-w-full min-w-0 truncate font-medium group-data-[state=processing]/attachment:shimmer group-data-[state=uploading]/attachment:shimmer group-data-[variant=filled]/attachment:text-2sm group-data-[variant=filled]/attachment:font-normal",
        className
      )}
      {...props}
    />
  )
}

function AttachmentDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-description"
      className={cn(
        "mt-0.5 block min-w-0 truncate text-xs text-muted-foreground group-data-[state=error]/attachment:text-destructive/80",
        "max-w-full",
        className
      )}
      {...props}
    />
  )
}

function AttachmentActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn(
        // agent-ui: tile corner actions stay tabbable and show on focus, touch or failure.
        "group-data-[variant=tile]/attachment:absolute group-data-[variant=tile]/attachment:top-1 group-data-[variant=tile]/attachment:end-1 group-data-[variant=tile]/attachment:gap-0.5 group-data-[variant=tile]/attachment:opacity-0 group-data-[variant=tile]/attachment:group-hover/attachment:opacity-100 group-data-[variant=tile]/attachment:group-focus-within/attachment:opacity-100 group-data-[variant=tile]/attachment:pointer-coarse:opacity-100 group-data-[variant=tile]/attachment:group-data-[state=error]/attachment:opacity-100 group-data-[variant=tile]/attachment:motion-safe:transition-opacity relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:right-3 group-data-[orientation=vertical]/attachment:gap-1",
        className
      )}
      {...props}
    />
  )
}

function AttachmentAction({
  className,
  variant,
  size = "icon-xs",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="attachment-action"
      variant={variant ?? "ghost"}
      size={size}
      // agent-ui: readable image controls with a coarse-pointer touch target.
      className={cn(
        "touch-target relative group-data-[variant=tile]/attachment:rounded-full group-data-[variant=tile]/attachment:bg-background/90 group-data-[variant=tile]/attachment:text-foreground group-data-[variant=tile]/attachment:shadow-xs",
        className
      )}
      {...props}
    />
  )
}

function AttachmentTrigger({
  className,
  render,
  type,
  ...props
}: useRender.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: render ? type : (type ?? "button"),
        // agent-ui: the tile opens an image; the root supplies its keyboard ring.
        className: cn(
          "absolute inset-0 z-10 outline-none group-data-[variant=tile]/attachment:cursor-zoom-in",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "attachment-trigger",
    },
  })
}

function AttachmentGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-group"
      className={cn(
        "flex min-w-0 scroll-fade-x snap-x snap-mandatory scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain py-1 *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start",
        className
      )}
      {...props}
    />
  )
}

export {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
}
