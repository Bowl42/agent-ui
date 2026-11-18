"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { useOverflow } from "@/hooks/use-overflow"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 motion-pop supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = "Close",
  size = "default",
  sheet = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  /** agent-ui: the close button's name, for other languages. */
  closeLabel?: string
  /**
   * agent-ui: `"wide"`, for a picker of a list and a view beside or over
   * it: 768px wide and 640px tall whatever it shows (no taller than the
   * window, 2rem from its edges), so it does not jump as its content
   * changes; on a phone the whole screen, clear of the home indicator.
   * `"full"`, for a reader or a viewer over the app: the window but for
   * 2rem round it (a `className`'s max-w or max-h, e.g. `sm:max-w-6xl`,
   * keeps it centred); on a phone the whole screen too.
   */
  size?: "default" | "wide" | "full"
  /**
   * agent-ui: on a phone, a `"default"` one is a sheet from the bottom;
   * `false` where it places itself (a viewer over the whole screen, a
   * command palette).
   */
  sheet?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-full flex-col max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 motion-pop outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          // agent-ui: its title clear of the close button, on its line.
          "has-[>[data-slot=dialog-close]]:[&>[data-slot=dialog-header]>[data-slot=dialog-title]]:pe-8",
          size === "default" && sheet && dialogPhoneSheet,
          // A fixed height's (wide, full) lays its footer out at its
          // foot; sticky there would hold to the page's scrollport.
          size === "default" && dialogStickyFooter["dialog-footer"],
          size !== "default" &&
            "max-sm:inset-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:translate-0 max-sm:rounded-none max-sm:pb-safe",
          size === "wide" &&
            "sm:h-160 sm:max-h-[min(calc(100%-4rem),768px)] sm:max-w-3xl",
          size === "full" &&
            "sm:inset-8 sm:m-auto sm:h-auto sm:max-h-none sm:w-auto sm:max-w-none sm:translate-0",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              // agent-ui: 32px, 8px in: on the title's middle line.
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

/**
 * agent-ui: on a phone (under 640px), a sheet from the bottom, as a
 * menu's (phone-sheet): the screen's width, its top corners round, 90%
 * of the screen at most, clear of the home indicator, sliding.
 */
const dialogPhoneSheet =
  "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-dvh-90 max-sm:max-w-none max-sm:translate-0 max-sm:rounded-b-none max-sm:rounded-t-xl max-sm:pb-safe-or-4 max-sm:motion-slide max-sm:data-open:slide-in-from-bottom max-sm:data-open:zoom-in-100 max-sm:data-closed:slide-out-to-bottom max-sm:data-closed:zoom-out-100"

/**
 * agent-ui: its footer, the content's last, kept at the foot as the rest
 * scrolls under it (out to its edges, on its colour); on a phone's
 * sheet, clear of the home indicator.
 */
const dialogStickyFooter = {
  "dialog-footer":
    "*:data-[slot=dialog-footer]:sticky *:data-[slot=dialog-footer]:bottom-0 *:data-[slot=dialog-footer]:-mx-4 *:data-[slot=dialog-footer]:-mb-4 *:data-[slot=dialog-footer]:bg-popover *:data-[slot=dialog-footer]:px-4 *:data-[slot=dialog-footer]:pb-4 max-sm:has-[>[data-slot=dialog-footer]]:pb-0 max-sm:*:data-[slot=dialog-footer]:mb-0 max-sm:*:data-[slot=dialog-footer]:pb-safe-or-4",
  "alert-dialog-footer":
    "*:data-[slot=alert-dialog-footer]:sticky *:data-[slot=alert-dialog-footer]:bottom-0 *:data-[slot=alert-dialog-footer]:-mx-4 *:data-[slot=alert-dialog-footer]:-mb-4 *:data-[slot=alert-dialog-footer]:bg-popover *:data-[slot=alert-dialog-footer]:px-4 *:data-[slot=alert-dialog-footer]:pb-4 max-sm:has-[>[data-slot=alert-dialog-footer]]:pb-0 max-sm:*:data-[slot=alert-dialog-footer]:mb-0 max-sm:*:data-[slot=alert-dialog-footer]:pb-safe-or-4",
}

/**
 * agent-ui: what scrolls in a dialog taller than the window (no taller
 * than it, 1rem from its edges), its header and footer kept in place;
 * to the dialog's edges, so its fields' focus rings are not cut.
 */
function DialogBody({ className, ref, ...props }: React.ComponentProps<"div">) {
  const [watch, overflows] = useOverflow<HTMLDivElement>()
  // Reachable by keyboard while it scrolls, for its arrow keys.
  const setRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      const unwatch = watch(element)
      if (typeof ref === "function") ref(element)
      else if (ref) ref.current = element
      return unwatch
    },
    [ref, watch]
  )
  return (
    <div
      ref={setRef}
      tabIndex={overflows ? 0 : undefined}
      data-slot="dialog-body"
      className={cn(
        "-mx-4 -my-1 flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
        className
      )}
      {...props}
    />
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  closeLabel = "Close",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
  /** agent-ui: the close button's name, for other languages. */
  closeLabel?: string
}) {
  return (
    <div
      data-slot="dialog-footer"
      // agent-ui: its buttons under the content, not on a band ruled off
      // (in dark the band hardly shows: a stray line).
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end",
        // agent-ui: on a short screen, side by side, as a drawer's.
        "short:flex-row short:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          {closeLabel}
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  dialogPhoneSheet,
  dialogStickyFooter,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
