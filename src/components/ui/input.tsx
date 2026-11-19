import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

// agentui: no fill in dark, its border alone (3:1) outlining it, so a
// field is not a grey slab on a card or a dialog. `size="sm"`: 28px, its
// text 13px, beside a toolbar's or a composer's 28px buttons (36px on a
// phone, as they are; 16px text under 768px, so iOS does not zoom). A
// number is the native `size`, as shadcn's InputGroupInput passes it.
function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  /** Its height, or, a number, the native width in characters. */
  size?: "default" | "sm" | number | undefined
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={typeof size === "number" ? undefined : size}
      size={typeof size === "number" ? size : undefined}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-field bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        size === "sm" && "h-7 rounded-md px-2 md:text-2sm max-sm:h-9",
        className
      )}
      {...props}
    />
  )
}

export { Input }
