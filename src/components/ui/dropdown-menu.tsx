"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import {
  PhoneSheetHeader,
  phoneSheetBackdrop,
  phoneSheetPopup,
  phoneSheetPopupStyle,
  phoneSheetPositionerStyle,
  phoneSheetRow,
  usePhoneSheet,
} from "@/lib/phone-sheet"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

const menuWidth = {
  "--dropdown-menu-min-width": "max(var(--anchor-width), 8rem)",
} as React.CSSProperties

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  anchor,
  className,
  sheet: sheetProp = true,
  sheetTitle,
  style,
  children,
  ...props
}: MenuPrimitive.Popup.Props &
  // agent-ui: an anchor of its own (e.g. a split button's group), not
  // only its trigger.
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor"
  > & {
    /** agent-ui: whether it opens as a sheet from the bottom on a phone. */
    sheet?: boolean
    /** agent-ui: its heading as a sheet, e.g. what it acts on. */
    sheetTitle?: React.ReactNode
  }) {
  const sheet = usePhoneSheet(sheetProp)
  return (
    <MenuPrimitive.Portal>
      {sheet && <MenuPrimitive.Backdrop className={phoneSheetBackdrop} />}
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        anchor={anchor}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        // agent-ui: as wide as its items, at least its trigger (and 8rem),
        // at most the room there is: an icon button's menu is not 128px
        // with its items broken over two lines.
        style={sheet ? phoneSheetPositionerStyle : menuWidth}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          data-phone-sheet={sheet ? "" : undefined}
          // agent-ui: the theme's shadow-md and shadow-lg are shadow-float, whose hairline a ring would double.
          className={cn("z-50 max-h-(--available-height) w-max max-w-(--available-width) min-w-(--dropdown-menu-min-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md motion-pop outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95", className, sheet && phoneSheetPopup )}
          style={sheet ? phoneSheetPopupStyle(style) : style}
          {...props}
        >
          {sheet && <PhoneSheetHeader title={sheetTitle} />}
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1 text-xs font-medium text-muted-foreground data-inset:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  description,
  children,
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
  /**
   * agent-ui: a line under its label, what it does, in grey; said after
   * its name. The item's children are its label's line.
   */
  description?: React.ReactNode
}) {
  const descriptionId = React.useId()
  const described = description !== undefined && description !== null
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      {...(described ? { "aria-describedby": descriptionId } : {})}
      // agent-ui: rows 32px tall, the same in every menu.
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-2 min-h-8 rounded-md px-2 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:not-data-[slot=dropdown-menu-item-description]:text-accent-foreground data-inset:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        phoneSheetRow,
        className
      )}
      {...props}
    >
      {described ? (
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">{children}</span>
          <span
            id={descriptionId}
            // Said by `aria-describedby`, not in its name.
            aria-hidden="true"
            data-slot="dropdown-menu-item-description"
            // Under its label's text, past an icon before it.
            className="text-xs text-muted-foreground [span:has(>svg:first-child)+&]:ps-6"
          >
            {description}
          </span>
        </span>
      ) : (
        children
      )}
    </MenuPrimitive.Item>
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      // agent-ui: rows 32px tall, the same in every menu.
      className={cn(
        "flex cursor-default items-center gap-2 min-h-8 rounded-md px-2 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-8 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        phoneSheetRow,
        className
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      // agent-ui: the theme's shadow-md and shadow-lg are shadow-float, whose hairline a ring would double.
      className={cn("w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg motion-pop data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      // agent-ui: rows 32px tall, the same in every menu.
      className={cn(
        "relative flex cursor-default items-center gap-2 min-h-8 rounded-md py-1 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        phoneSheetRow,
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      // agent-ui: rows 32px tall, the same in every menu.
      className={cn(
        "relative flex cursor-default items-center gap-2 min-h-8 rounded-md py-1 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        phoneSheetRow,
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      // agent-ui: 6px either side of the rule, 13px between groups.
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground in-data-phone-sheet:hidden",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
