import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const alertVariants = cva(
  // agent-ui: the action in a column of its own, as wide as its buttons
  // (shadcn's sat over the text, past 72px of room); under the text where
  // the alert is narrow.
  "group/alert @container/alert relative grid w-full gap-x-2 gap-y-0.5 rounded-lg border px-3 py-2 text-left text-sm has-data-[slot=alert-action]:grid-cols-[1fr_auto] has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:has-data-[slot=alert-action]:grid-cols-[auto_1fr_auto] *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
        // agent-ui: a state beside the page's words (unsaved changes, a
        // key being checked): the icon in its colour, the words the card's.
        warning: "bg-card text-card-foreground *:[svg]:text-warning",
        success: "bg-card text-card-foreground *:[svg]:text-success",
        info: "bg-card text-card-foreground *:[svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-1 text-sm text-balance text-muted-foreground group-has-[>svg]/alert:col-start-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex flex-wrap items-center justify-end gap-2 self-start group-has-[>svg]/alert:col-start-3 @max-md/alert:col-start-1 @max-md/alert:-col-end-1 @max-md/alert:row-span-1 @max-md/alert:row-start-3 @max-md/alert:mt-2 @max-md/alert:group-has-[>svg]/alert:col-start-2",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
