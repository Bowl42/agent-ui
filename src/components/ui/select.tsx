"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { UnfoldMoreIcon, Tick02Icon, ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"
import {
  PhoneSheetHeader,
  phoneSheetBackdrop,
  phoneSheetPopup,
  phoneSheetPopupStyle,
  phoneSheetPositionerStyle,
  phoneSheetRow,
  usePhoneSheet,
} from "@/lib/phone-sheet"

const Select = SelectPrimitive.Root

// agentui: no fill in dark, its border alone (3:1) outlining it, so a
// field is not a grey slab on a card or a dialog.
function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      // agentui: hovered in dark, a lighter fill (input/30, not /50), on
      // which the placeholder's grey keeps its 4.5:1.
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-lg border border-field bg-transparent py-2 pr-2 pl-3 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:hover:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  // agentui: below (or above) the trigger by default, as a menu opens,
  // not with the chosen item over it: tall items (long names, wrapped, in
  // large text) could put the list out of the window.
  alignItemWithTrigger: alignItemWithTriggerProp = false,
  sheet: sheetProp = true,
  sheetTitle,
  style,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  > & {
    /** agentui: whether it opens as a sheet from the bottom on a phone. */
    sheet?: boolean
    /** agentui: its heading as a sheet, e.g. what is chosen. */
    sheetTitle?: React.ReactNode
  }) {
  const sheet = usePhoneSheet(sheetProp)
  const alignItemWithTrigger = alignItemWithTriggerProp && !sheet
  return (
    <SelectPrimitive.Portal>
      {sheet && <SelectPrimitive.Backdrop className={phoneSheetBackdrop} />}
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
        style={sheet ? phoneSheetPositionerStyle : undefined}
      >
        <SelectPrimitive.Popup
          // agentui: a new one as it turns a sheet or back. Base UI puts
          // the positioner's top, bottom and the like back as it first
          // found them each time it closes: a sheet's, kept, would pin it
          // to the bottom once it opens by its trigger.
          key={sheet ? "sheet" : "anchored"}
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          data-phone-sheet={sheet ? "" : undefined}
          // agentui: the theme's shadow-md and shadow-lg are shadow-float, whose hairline a ring would double.
          className={cn("relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) flex flex-col overflow-hidden data-[side=none]:max-h-none rounded-lg bg-popover text-popover-foreground shadow-md motion-pop data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className, sheet && phoneSheetPopup )}
          style={sheet ? phoneSheetPopupStyle(style) : style}
          {...props}
        >
          {sheet && <PhoneSheetHeader title={sheetTitle} />}
          <SelectScrollUpButton />
          {/* agentui: the list scrolls, not the popup: Base UI scrolls it
              to bring the chosen item over the trigger, and the listbox is
              the box seen. Lined up with the trigger (side "none"), the
              popup is as tall as Base UI makes it, not the room below.
              Items straight in it, not in a group, are inset as a group's
              are. */}
          <SelectPrimitive.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain has-[>[data-slot=select-item]]:p-1">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      // agentui: rows 32px tall, the same in every menu.
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 min-h-8 rounded-md py-1 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        phoneSheetRow,
        className
      )}
      {...props}
    >
      {/* agentui: a long name wraps, anywhere, not past the list's edge. */}
      <SelectPrimitive.ItemText className="flex min-w-0 flex-1 gap-2 wrap-anywhere">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      // agentui: 6px either side of the rule, 13px between groups.
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
