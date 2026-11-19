"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "cn"
import {
  PhoneSheetHeader,
  phoneSheetBackdrop,
  phoneSheetPopup,
  phoneSheetPopupStyle,
  phoneSheetPositionerStyle,
  usePhoneSheet,
} from "@/lib/phone-sheet"
import { useOverflow } from "@/hooks/use-overflow"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  anchor,
  sheet: sheetProp = true,
  sheetTitle,
  style,
  children,
  ref,
  tabIndex,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    // agentui: anchor, for a popup whose trigger is hidden (inputGroupPopupAnchor).
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor"
  > & {
    /** agentui: whether it opens as a sheet from the bottom on a phone. */
    sheet?: boolean
    /** agentui: its heading as a sheet. */
    sheetTitle?: React.ReactNode
  }) {
  const sheet = usePhoneSheet(sheetProp)
  // agentui: reachable by keyboard while it scrolls, for its arrow keys.
  const [watch, overflows] = useOverflow<HTMLDivElement>()
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
    <PopoverPrimitive.Portal>
      {sheet && <PopoverPrimitive.Backdrop className={phoneSheetBackdrop} />}
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        className="isolate z-50"
        style={sheet ? phoneSheetPositionerStyle : undefined}
      >
        <PopoverPrimitive.Popup
          ref={setRef}
          tabIndex={overflows ? 0 : tabIndex}
          data-slot="popover-content"
          data-phone-sheet={sheet ? "" : undefined}
          // agentui: the theme's shadow-md and shadow-lg are shadow-float, whose hairline a ring would double.
          className={cn(
            "z-50 flex w-72 origin-(--transform-origin) flex-col gap-3 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md outline-hidden motion-pop data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            // agentui: no wider or taller than there is room for, as a
            // menu is; what is taller scrolls.
            !sheet &&
              "max-h-(--available-height) max-w-(--available-width) overflow-y-auto",
            className,
            sheet && phoneSheetPopup,
            // Its content scrolls, under the handle.
            sheet && "overflow-y-auto overscroll-contain pt-0"
          )}
          style={sheet ? phoneSheetPopupStyle(style) : style}
          {...props}
        >
          {sheet && <PhoneSheetHeader title={sheetTitle} />}
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
