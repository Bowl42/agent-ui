"use client"

import * as React from "react"
import { Command as CommandPrimitive, useCommandState } from "cmdk"
import { cn } from "cn"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { HugeiconsIcon } from "@hugeicons/react"
import { SearchIcon, Tick02Icon } from "@hugeicons/core-free-icons"

// agentui: cmdk 1.1.1 is always given the value (held here when the app
// gives only `defaultValue`; `onValueChange` hears every change either
// way), and three of its faults are mended:
// - Controlled, it scrolls to the highlighted option and names it as the
//   input's aria-activedescendant before the options have rendered the
//   change, finding the old one by its aria-selected: the list stayed put
//   and the active descendant was the option before whenever the options
//   didn't render with the Command (memoized, or by the React Compiler).
//   The option is marked in the DOM as the change arrives, so cmdk finds
//   the new one.
// - It names no active descendant for the value it mounts with, nor for
//   one the app sets, and keeps the id of an option that went.
// - Mounted with a query (CommandInput's `value`), it highlights the
//   first hit in place of the value given. Until the reader acts (a key,
//   the pointer, typing), a value still in the list is kept; a query typed
//   after that highlights its first hit, as in cmdk.
function Command({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  children,
  ref,
  onKeyDownCapture,
  onPointerDownCapture,
  onPointerMoveCapture,
  onInputCapture,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  const [ownValue, setOwnValue] = React.useState(defaultValue ?? "")
  const value = valueProp ?? ownValue
  const root = React.useRef<HTMLDivElement | null>(null)
  const state = React.useRef<CommandState | null>(null)
  const given = React.useRef(true)
  const acted =
    <E,>(handler?: (event: E) => void) =>
    (event: E) => {
      given.current = false
      handler?.(event)
    }
  const setRoot = React.useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  const change = (next: string) => {
    if (given.current && root.current && findItem(root.current, value)) {
      // cmdk has its state changed before it asks; change it back.
      if (state.current) state.current.value = value
      return
    }
    root.current?.querySelectorAll("[cmdk-item]").forEach((item) => {
      const selected = item.getAttribute("data-value") === next
      item.setAttribute("aria-selected", String(selected))
    })
    if (valueProp === undefined) setOwnValue(next)
    onValueChange?.(next)
  }

  // Named again as the options change too: one that goes for another of
  // the same value (a list rendered anew) would leave a stale id.
  React.useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const name = () => {
      const id = findItem(element, value)?.id
      element
        .querySelectorAll("[cmdk-input], [cmdk-list]")
        .forEach((owner) => {
          if (id) owner.setAttribute("aria-activedescendant", id)
          else owner.removeAttribute("aria-activedescendant")
        })
    }
    name()
    const observer = new MutationObserver(name)
    observer.observe(element, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [value])

  return (
    <CommandPrimitive
      ref={setRoot}
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground",
        className
      )}
      value={value}
      onValueChange={change}
      onKeyDownCapture={acted(onKeyDownCapture)}
      onPointerDownCapture={acted(onPointerDownCapture)}
      onPointerMoveCapture={acted(onPointerMoveCapture)}
      onInputCapture={acted(onInputCapture)}
      {...props}
    >
      {children}
      {/* A second child: Command takes no `asChild`. */}
      <CommandStateRef stateRef={state} />
    </CommandPrimitive>
  )
}

type CommandState = Parameters<Parameters<typeof useCommandState>[0]>[0]

/** Hands Command cmdk's state: the live object its selectors are given. */
function CommandStateRef({
  stateRef,
}: {
  stateRef: React.RefObject<CommandState | null>
}) {
  const state = useCommandState((state: CommandState) => state)
  React.useLayoutEffect(() => {
    stateRef.current = state
  }, [stateRef, state])
  return null
}

/** The enabled option the value names, if it is in the list. */
function findItem(root: HTMLElement, value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const enabled = '[cmdk-item]:not([aria-disabled="true"])'
  return Array.from(root.querySelectorAll<HTMLElement>(enabled)).find(
    (item) => item.getAttribute("data-value") === trimmed
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  size = "auto",
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  /**
   * agentui: as tall as its results, from a third of the way down
   * ("auto"); or 32rem tall, centred, whatever its results, so it does not
   * jump as they change ("fixed"), its list filling it; "wide", the same
   * at 42rem wide, for a palette of groups and shortcuts. Never taller
   * than the window.
   */
  size?: "auto" | "fixed" | "wide"
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        data-size={size}
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0",
          size !== "auto" &&
            "top-1/2 h-128 -translate-y-1/2 **:data-[slot=command-list]:max-h-none **:data-[slot=command-list]:min-h-0 **:data-[slot=command-list]:flex-1",
          size === "wide" && "sm:max-w-2xl",
          className
        )}
        showCloseButton={showCloseButton}
        // agentui: where it is, on a phone too.
        sheet={false}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      {/* agentui: the page's colour inside a hairline, as a search field
          is drawn (white on a light popover, a step under it in dark): the
          input grey at 30% for both its fill and its border drew a darker
          rim, like an inset shadow. */}
      {/* agentui: its search icon and its text on the rows' columns, an
          item's icon and text: the addon's padding less the field's 1px
          edge. */}
      <InputGroup className="h-8! rounded-lg! border-border bg-background shadow-none! *:data-[slot=input-group-addon]:pl-[calc(--spacing(2)-1px)]! dark:bg-background">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

// agentui: a listbox may only contain options and groups, and cmdk's Separator
// always has role="separator", so this is a plain rule hidden from assistive
// technology. Like cmdk's, it hides while there is a search.
function CommandSeparator({
  className,
  alwaysRender,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  const searching = useCommandState((state) => state.search !== "")
  if (searching && !alwaysRender) return null
  return (
    <div
      data-slot="command-separator"
      role="none"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      // agentui: rows 32px tall with an 8px radius, the same in every menu.
      className={cn(
        "group/command-item relative flex min-h-8 cursor-default items-center gap-2 rounded-md px-2 py-1 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
