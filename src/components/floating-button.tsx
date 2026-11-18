"use client"

import * as React from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

/**
 * A button that floats over what it covers, e.g. one that jumps to the
 * end of a long text or output: round, on the page's colour (a step
 * lighter in dark) and raised by `shadow-float`, as the message
 * scroller's button is. Its place, e.g. sticking to the bottom, is the
 * app's. It fades and grows in as it comes; with `visible`, it stays
 * and fades and shrinks out too, out of reach while hidden.
 */
function FloatingButton({
  variant = "ghost",
  size = "sm",
  visible,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  /** Whether it shows; the app renders it all along, e.g. `!atEnd`. */
  visible?: boolean | undefined
}) {
  const hidden = visible === false
  return (
    <Button
      data-slot="floating-button"
      variant={variant}
      size={size}
      data-visible={visible === undefined ? undefined : String(visible)}
      {...(hidden ? { inert: true, "aria-hidden": true } : {})}
      className={cn(
        "rounded-full bg-background text-foreground shadow-float hover:bg-muted hover:text-foreground dark:bg-muted dark:hover:bg-accent",
        visible === undefined
          ? "animate-in motion-fade fade-in-0 zoom-in-95"
          : "transition-[opacity,scale,background-color] motion-fade data-[visible=false]:pointer-events-none data-[visible=false]:scale-95 data-[visible=false]:opacity-0",
        className
      )}
      {...props}
    />
  )
}

export { FloatingButton }
