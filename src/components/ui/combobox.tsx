"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, Cancel01Icon, SearchIcon, Tick02Icon } from "@hugeicons/core-free-icons"

const Combobox = ComboboxPrimitive.Root

// agent-ui: whether an input is in the list's popup, where it is a search
// row, not a field.
const ComboboxPopupContext = React.createContext(false)

// agent-ui: no fill in dark, its border alone (3:1) outlining it, so a
// field is not a grey slab on a card or a dialog.
function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="pointer-events-none size-4 text-muted-foreground" />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      // agent-ui: an icon-only button needs a name.
      aria-label="Clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  )
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger: showTriggerProp,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  // agent-ui: in the popup, a search field, as a command menu's: a search
  // icon, a row's height on a muted ground 4px in from the popup's edges,
  // no edge nor ring, no rule under it; no trigger, the list being open.
  const inPopup = React.useContext(ComboboxPopupContext)
  const showTrigger = showTriggerProp ?? !inPopup
  return (
    // agent-ui: the group is Base UI's input group, which the list anchors
    // to: it lines up with the field's edges, not the input's (an addon
    // before the input pushed it in).
    <ComboboxPrimitive.InputGroup
      render={
        <InputGroup
          className={cn(
            "w-auto",
            inPopup &&
              "m-1 mb-0 h-8 rounded-md border-0 bg-muted shadow-none has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-muted",
            className
          )}
        />
      }
    >
      {inPopup && (
        <InputGroupAddon align="inline-start" className="pl-3">
          <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="size-4 shrink-0 text-muted-foreground" />
        </InputGroupAddon>
      )}
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            // agent-ui: an icon-only button needs a name; the input already
            // opens the list, so the trigger leaves the tab order.
            aria-label="Show options"
            tabIndex={-1}
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </ComboboxPrimitive.InputGroup>
  )
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPopupContext.Provider value>
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          // agent-ui: the theme's shadow-md and shadow-lg are shadow-float, whose hairline a ring would double;
          // anchored to the whole input group, the list is as wide as it; an
          // input in it a search row (`ComboboxInput`).
          className={cn("group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md motion-pop data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
    </ComboboxPopupContext.Provider>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
        className
      )}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  indicator = "check",
  ...props
}: ComboboxPrimitive.Item.Props & {
  // agent-ui: in a list of many to choose, a checkbox before each item,
  // there before it is chosen; drawn as `Checkbox` is, not one (the item
  // is the option, chosen or not).
  indicator?: "check" | "checkbox"
}) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      data-indicator={indicator}
      // agent-ui: rows 32px tall, the same in every menu. Highlighted, its
      // own text in the accent's colour, not what it holds: a line under
      // its label stays grey, as the tick does (the chosen one is told by
      // it, the highlighted one by its fill).
      className={cn(
        "group/combobox-item relative flex w-full cursor-default items-center gap-2 min-h-8 rounded-md py-1 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-[indicator=checkbox]:pr-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {indicator === "checkbox" && (
        <span
          aria-hidden="true"
          data-slot="combobox-item-checkbox"
          className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input text-primary-foreground transition-colors group-aria-selected/combobox-item:border-primary group-aria-selected/combobox-item:bg-primary dark:bg-input/30 dark:group-aria-selected/combobox-item:bg-primary"
        >
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="hidden size-3.5! *:stroke-primary-foreground group-aria-selected/combobox-item:block" />
        </span>
      )}
      {children}
      {indicator === "check" && (
        <ComboboxPrimitive.ItemIndicator
          render={
            <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-muted-foreground" />
          }
        >
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="pointer-events-none" />
        </ComboboxPrimitive.ItemIndicator>
      )}
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  )
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-2 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex",
        className
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      // agent-ui: 6px either side of the rule, 13px between groups; in
      // from the popup's edges as the rows' text, not across it.
      className={cn("mx-2 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-field bg-transparent bg-clip-padding px-3 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "flex h-5 w-fit items-center justify-center gap-1 rounded-sm bg-muted px-2 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
          // agent-ui: an icon-only button needs a name.
          aria-label="Remove"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn("min-w-16 flex-1 outline-none", className)}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
