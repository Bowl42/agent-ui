"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  SearchIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  inputGroupPopupAnchor,
  inputGroupPopupOffset,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

/** Why it opened or closed, as Base UI tells it: "escape-key", "trigger-press". */
type ComposerSelectOpenReason = string

type ComposerSelectContextValue = {
  phone: boolean
  /** Its trigger, which the popover keeps clear of the composer by. */
  trigger: React.RefObject<HTMLButtonElement | null>
  value: string | null
  /** Chooses `value` and closes. */
  choose: (value: string) => void
}

const ComposerSelectContext =
  React.createContext<ComposerSelectContextValue | null>(null)

function useComposerSelect() {
  const context = React.useContext(ComposerSelectContext)
  if (!context)
    throw new Error(
      "ComposerSelect parts must be used within a ComposerSelect."
    )
  return context
}

/**
 * A choice of one from a composer's toolbar: a mode, an agent, a model.
 * Its trigger says the choice; its list opens over the composer, or as a
 * sheet from the bottom on a phone, with a title and Done; choosing an
 * item closes it. The items are the app's, a label and a description
 * each.
 */
function ComposerSelect({
  value = null,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  /** The item chosen, by its `value`. */
  value?: string | null
  onValueChange?: (value: string) => void
  open?: boolean
  defaultOpen?: boolean
  /**
   * Whether it opens or closes, and why: a picker with pages, as
   * `ModelPicker`, may take Escape ("escape-key") back a page instead.
   */
  onOpenChange?: (open: boolean, reason: ComposerSelectOpenReason) => void
  children: React.ReactNode
}) {
  const phone = useIsMobile()
  const trigger = React.useRef<HTMLButtonElement>(null)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const setOpen = (next: boolean, reason: ComposerSelectOpenReason) => {
    if (openProp === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next, reason)
  }
  const context: ComposerSelectContextValue = {
    phone,
    trigger,
    value,
    choose: (next) => {
      onValueChange?.(next)
      setOpen(false, "item-press")
    },
  }
  return (
    <ComposerSelectContext value={context}>
      {phone ? (
        // A sheet, with a handle to swipe it away by.
        <Drawer
          showSwipeHandle
          open={open}
          onOpenChange={(next, details) => setOpen(next, details.reason)}
        >
          {children}
        </Drawer>
      ) : (
        <Popover
          open={open}
          onOpenChange={(next, details) => setOpen(next, details.reason)}
        >
          {children}
        </Popover>
      )}
    </ComposerSelectContext>
  )
}

/**
 * A trigger's look: a quiet pill, 28px, 13px, grey, its icons a step
 * fainter; 36px on a phone.
 */
const quietPill =
  "min-w-0 shrink gap-1 rounded-md px-2 text-2sm font-normal text-muted-foreground hover:text-foreground aria-expanded:text-foreground max-sm:h-9 max-sm:px-3 max-sm:text-sm [&_svg]:text-subtle-foreground [&_svg:not([class*='size-'])]:size-3.5"

/**
 * A button in a `ComposerSelectTrigger`'s look, for a composer's row of
 * options, that opens something of the app's other than a list (a
 * dialog, a sheet) or acts at once; `chevron` where it opens a choice.
 * Out of a `ComposerSelect`.
 */
function ComposerOptionButton({
  className,
  children,
  chevron = false,
  ...props
}: React.ComponentProps<typeof Button> & {
  /** Whether a chevron follows its words, as a select's does. */
  chevron?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-slot="composer-option-button"
      className={cn(quietPill, className)}
      {...props}
    >
      {children}
      {chevron && (
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-3"
        />
      )}
    </Button>
  )
}

/**
 * Its trigger, a button of the composer's toolbar: the choice, then a
 * chevron. Name it with the choice too: "Mode: Plan".
 */
function ComposerSelectTrigger({
  className,
  children,
  chevron = true,
  tooltip,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "render"> & {
  /** Whether a chevron follows the choice. */
  chevron?: boolean
  /**
   * A tooltip over it where a pointer rests, e.g. its name and the key
   * that opens it; none on a touch screen.
   */
  tooltip?: React.ReactNode
}) {
  const { phone, trigger } = useComposerSelect()
  const Trigger = phone ? DrawerTrigger : PopoverTrigger
  const button = (
    <Button
      ref={trigger}
      type="button"
      variant="ghost"
      size="sm"
      className={cn(quietPill, className)}
      {...props}
    />
  )
  const content = (
    <>
      {children}
      {chevron ? (
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-3"
        />
      ) : null}
    </>
  )
  if (!tooltip || phone)
    return (
      <Trigger data-slot="composer-select-trigger" render={button}>
        {content}
      </Trigger>
    )
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Trigger data-slot="composer-select-trigger" render={button} />}
      >
        {content}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Its words for a value, in the trigger: cut short where there is no room. */
function ComposerSelectValue({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="composer-select-value"
      className={cn("min-w-0 truncate", className)}
      {...props}
    />
  )
}

/**
 * What opens: 8px above the composer (not over its text), its start at
 * the trigger's, or a sheet from the bottom on a phone with its `title`
 * and a Done button.
 */
function ComposerSelectContent({
  title,
  doneLabel = "Done",
  initialFocus,
  footer,
  className,
  children,
}: {
  /** Its name; the sheet's title on a phone. */
  title: string
  /** The sheet's button that closes it, on a phone. */
  doneLabel?: string
  /**
   * Under the list, past a hairline, kept in sight while the list
   * scrolls: a line of small grey text about the choice, with a link or
   * a button in it ("Applies to this conversation · Learn more").
   */
  footer?: React.ReactNode
  /** Where the focus goes as it opens; else the chosen item, or the first. */
  initialFocus?: React.RefObject<HTMLElement | null>
  className?: string
  children: React.ReactNode
}) {
  const { phone, trigger } = useComposerSelect()
  const body = React.useRef<HTMLDivElement>(null)
  const focus = () =>
    initialFocus?.current ??
    body.current?.querySelector<HTMLElement>(
      "[data-slot=composer-select-search] input, [data-slot=composer-select-item][tabindex='0']"
    ) ??
    true

  if (phone) {
    return (
      <DrawerContent
        data-slot="composer-select-content"
        initialFocus={focus}
        className={className}
      >
        <DrawerHeader className="flex-row items-center justify-between gap-2 px-4 pt-1 pb-1">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerClose render={<Button size="sm" />}>{doneLabel}</DrawerClose>
        </DrawerHeader>
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
        {footer !== undefined && (
          <ComposerSelectFooter className="px-4 py-3 pb-safe-or-3">
            {footer}
          </ComposerSelectFooter>
        )}
      </DrawerContent>
    )
  }
  return (
    <PopoverContent
      data-slot="composer-select-content"
      aria-label={title}
      side="top"
      align="start"
      sideOffset={({ side }) => inputGroupPopupOffset(trigger.current, side)}
      anchor={() => inputGroupPopupAnchor(trigger.current)}
      initialFocus={focus}
      className={cn(
        // No taller than the room above the composer: what is longer
        // scrolls, as a sheet's does on a phone.
        "relative max-h-(--available-height) w-72 max-w-[calc(100vw-1rem)] gap-0 p-0",
        className
      )}
    >
      <div ref={body} className="min-h-0 overflow-y-auto overscroll-contain">
        {children}
      </div>
      {footer !== undefined && (
        <ComposerSelectFooter className="px-3 py-2">
          {footer}
        </ComposerSelectFooter>
      )}
    </PopoverContent>
  )
}

/**
 * A picker's footer: small grey text past a hairline, its links and
 * buttons underlined, darker under the pointer, ringed for the keyboard.
 */
function ComposerSelectFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-select-footer"
      className={cn(
        "shrink-0 border-t text-xs text-pretty text-muted-foreground",
        "[&_:is(a,button)]:rounded-xs [&_:is(a,button)]:underline [&_:is(a,button)]:underline-offset-4 [&_:is(a,button)]:outline-none [&_:is(a,button)]:hover:text-foreground [&_:is(a,button)]:focus-visible:ring-3 [&_:is(a,button)]:focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

/**
 * A row's look in a composer's pickers, as a menu's or a command's item:
 * 32px tall, an icon first in grey, a detail at the end.
 */
const composerSelectRow =
  "group/composer-select-row relative flex min-h-8 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-start text-2sm outline-hidden select-none motion-hover hover:bg-muted focus-visible:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>svg:first-child]:text-muted-foreground"

/** A list's items that can be chosen and are shown (not filtered out). */
const shownItems = (list: Element | null | undefined) =>
  Array.from(
    list?.querySelectorAll<HTMLElement>(
      "[data-slot=composer-select-item]:not([aria-disabled=true]):not([hidden])"
    ) ?? []
  )

/** Moves the focus among a list's items by the arrow keys, Home and End. */
function moveFocus(event: React.KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowDown", "ArrowUp", "Home", "End"]
  if (!keys.includes(event.key)) return
  const items = shownItems(event.currentTarget)
  const from = items.indexOf(document.activeElement as HTMLElement)
  const to =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : Math.min(
            items.length - 1,
            Math.max(0, from + (event.key === "ArrowDown" ? 1 : -1))
          )
  event.preventDefault()
  items[to]?.focus()
}

const ComposerSelectListContext = React.createContext<{
  value: string | null
  choose: (value: string) => void
  /** The item the Tab key goes to: the chosen one, or the first. */
  tabbable: string | null
  /** What is searched for, lower case and trimmed; "" for all. */
  needle: string
} | null>(null)

type ComposerSelectListLabels = {
  /** The search field's name and placeholder. */
  search: string
  /** When nothing matches the search. */
  empty: string
}

const defaultListLabels: ComposerSelectListLabels = {
  search: "Search",
  empty: "No matches",
}

/** `text` with the first `needle` in it in the text's own colour. */
function Matched({ text, needle }: { text: string; needle: string }) {
  const at = needle ? text.toLowerCase().indexOf(needle) : -1
  if (at < 0) return text
  // One inline run: in a flex row, its parts are not spaced apart.
  return (
    <span>
      {text.slice(0, at)}
      <mark
        data-slot="composer-select-match"
        className="bg-transparent font-medium text-foreground"
      >
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </span>
  )
}

/**
 * Its items, one chosen: the arrow keys move among them, Enter, Space or a
 * click chooses one. By default the select's value, choosing closes it; a
 * list of its own `value` and `onValueChange`, e.g. on a page of a
 * picker, stays open. Of more than `searchFrom` items (10; 0 for always),
 * a search field over them filters them by their words (label,
 * description, detail and `keywords`, in any case), in their order, the
 * part matched in a label of plain text in the text's colour; it has the
 * focus as the list opens, typing on an item goes to it, the arrow keys
 * go from it to the items and Enter chooses the first. The chosen item
 * stays chosen while it is filtered out. A `pinned` item is never
 * filtered out. `search` and `onSearchChange` make the search's text the
 * app's, e.g. to render more items while there is some, or an item that
 * reads it; the app then clears it as the select closes.
 */
function ComposerSelectList({
  value: valueProp,
  onValueChange,
  searchFrom = 10,
  search,
  onSearchChange,
  labels: labelsProp,
  className,
  children,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value?: string | null
  onValueChange?: (value: string) => void
  /** How many items it takes for a search field: more than this; 0, any. */
  searchFrom?: number
  /** The search's text, as typed; with `onSearchChange`, the app's. */
  search?: string | undefined
  onSearchChange?: ((search: string) => void) | undefined
  labels?: Partial<ComposerSelectListLabels> | undefined
}) {
  const select = useComposerSelect()
  const labels = { ...defaultListLabels, ...labelsProp }
  const own = onValueChange !== undefined
  const value = own ? (valueProp ?? null) : select.value
  const choose = own ? onValueChange : select.choose
  const ref = React.useRef<HTMLDivElement>(null)
  const field = React.useRef<HTMLInputElement>(null)
  const listId = React.useId()
  const [ownQuery, setOwnQuery] = React.useState("")
  const query = search ?? ownQuery
  const setQuery = (next: string) => {
    if (search === undefined) setOwnQuery(next)
    onSearchChange?.(next)
  }
  const needle = query.trim().toLowerCase()
  // How many items there are, and how many the search finds (a pinned
  // one is shown, not found).
  const [count, setCount] = React.useState(0)
  const [shown, setShown] = React.useState(0)
  const searching = searchFrom === 0 || count > searchFrom
  // The item Tab goes to: the chosen one, else the first that can be
  // chosen, once they are rendered.
  const [tabbable, setTabbable] = React.useState<string | null>(value)
  // After every render, as the items are the app's children: counted on
  // the page. Each set bails out where the number is the same, so no
  // render follows but where one changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- read after each render
  React.useLayoutEffect(() => {
    const list = ref.current
    setCount(
      list?.querySelectorAll("[data-slot=composer-select-item]").length ?? 0
    )
    setShown(
      list?.querySelectorAll(
        "[data-slot=composer-select-item]:not([hidden]):not([data-pinned])"
      ).length ?? 0
    )
    const items = shownItems(list)
    const chosen = items.find((item) => item.dataset.value === value)
    setTabbable((chosen ?? items[0])?.dataset.value ?? null)
  })
  // The chosen one in sight as it opens, the search having the focus.
  React.useEffect(() => {
    ref.current
      ?.querySelector("[data-slot=composer-select-item][aria-selected=true]")
      ?.scrollIntoView({ block: "nearest" })
  }, [])
  return (
    <ComposerSelectListContext
      value={{ value, choose, tabbable, needle: searching ? needle : "" }}
    >
      {searching && (
        // Kept at the top as the items scroll under it.
        <div
          data-slot="composer-select-search"
          className="sticky top-0 z-10 bg-popover p-1 pb-0"
        >
          <InputGroup className="h-8 rounded-lg border-border bg-background shadow-none dark:bg-background">
            <InputGroupInput
              ref={field}
              // A text field in a searchbox's role: no native clear button,
              // in the platform's accent colour.
              type="text"
              role="searchbox"
              enterKeyHint="search"
              value={query}
              aria-label={labels.search}
              placeholder={labels.search}
              aria-controls={listId}
              autoComplete="off"
              spellCheck={false}
              className="text-2sm"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  shownItems(ref.current)[0]?.focus()
                } else if (event.key === "Enter") {
                  event.preventDefault()
                  const first = shownItems(ref.current)[0]?.dataset.value
                  if (first !== undefined) choose(first)
                }
              }}
            />
            <InputGroupAddon>
              <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
            </InputGroupAddon>
          </InputGroup>
        </div>
      )}
      <div
        ref={ref}
        id={listId}
        role="listbox"
        data-slot="composer-select-list"
        className={cn("flex flex-col p-1", className)}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          // Typed on an item: to the search.
          if (
            searching &&
            event.key.length === 1 &&
            event.key !== " " &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey
          ) {
            field.current?.focus()
            return
          }
          // Up from the first item: back to the search.
          if (
            searching &&
            event.key === "ArrowUp" &&
            shownItems(ref.current)[0] === document.activeElement
          ) {
            event.preventDefault()
            field.current?.focus()
            return
          }
          moveFocus(event)
        }}
        {...props}
      >
        {children}
      </div>
      {searching && needle && shown === 0 && (
        <p
          role="status"
          data-slot="composer-select-empty"
          className="px-3 pt-1 pb-3 text-2sm text-muted-foreground"
        >
          {labels.empty}
        </p>
      )}
    </ComposerSelectListContext>
  )
}

/**
 * An item to choose: its label, a line of description under it, a
 * detail at its end and a tick while it is the one chosen.
 */
function ComposerSelectItem({
  value,
  description,
  detail,
  icon,
  keywords,
  disabled = false,
  pinned = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  value: string
  /** More words a search finds it by, not shown: "main origin". */
  keywords?: string | readonly string[] | undefined
  /** A line under its label: what it does. */
  description?: React.ReactNode
  /** At its end, in grey: "200k · $15". */
  detail?: React.ReactNode
  /** Before its label, in grey. */
  icon?: React.ReactNode
  disabled?: boolean
  /**
   * Shown whatever is searched for, its label not marked: "New worktree",
   * which may read the search.
   */
  pinned?: boolean
}) {
  const list = React.useContext(ComposerSelectListContext)
  if (!list)
    throw new Error(
      "ComposerSelectItem must be used within a ComposerSelectList."
    )
  const checked = list.value === value
  const choose = () => {
    if (!disabled) list.choose(value)
  }
  // Its words, read from what it shows, for a search.
  const self = React.useRef<HTMLDivElement>(null)
  const [words, setWords] = React.useState("")
  React.useLayoutEffect(() => {
    setWords((self.current?.textContent ?? "").toLowerCase())
  }, [children, description, detail])
  const extra = (typeof keywords === "string" ? [keywords] : (keywords ?? []))
    .join(" ")
    .toLowerCase()
  const needle = pinned ? "" : list.needle
  const hidden =
    needle !== "" && !words.includes(needle) && !extra.includes(needle)
  return (
    <div
      ref={self}
      hidden={hidden || undefined}
      data-pinned={pinned || undefined}
      role="option"
      data-slot="composer-select-item"
      data-value={value}
      aria-selected={checked}
      aria-disabled={disabled || undefined}
      tabIndex={list.tabbable === value ? 0 : -1}
      onClick={choose}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        choose()
      }}
      className={cn(
        composerSelectRow,
        // With a description, the icon and the tick by its label's line.
        description && "items-start [&>svg]:mt-0.5",
        className
      )}
      {...props}
    >
      {icon}
      <span
        className={cn(
          "flex min-w-0 flex-col gap-0.5",
          // With a detail, the label as wide as it is and the detail the
          // rest: it is cut first, the label never for it.
          detail === undefined && "flex-1"
        )}
      >
        {/* The chosen one's label a step bolder, beside its tick. */}
        <span className="flex min-w-0 items-center gap-1 group-aria-selected/composer-select-row:font-medium">
          {typeof children === "string" ? (
            <Matched text={children} needle={needle} />
          ) : (
            children
          )}
        </span>
        {description && (
          <span
            data-slot="composer-select-item-description"
            className="text-xs text-subtle-foreground group-hover/composer-select-row:text-muted-foreground group-focus-visible/composer-select-row:text-muted-foreground"
          >
            {description}
          </span>
        )}
      </span>
      {detail !== undefined && (
        <span
          data-slot="composer-select-item-detail"
          className="min-w-0 flex-1 truncate ps-2 text-end text-xs text-subtle-foreground tabular-nums group-hover/composer-select-row:text-muted-foreground group-focus-visible/composer-select-row:text-muted-foreground"
        >
          {detail}
        </span>
      )}
      <HugeiconsIcon
        icon={Tick02Icon}
        strokeWidth={2}
        aria-hidden
        className={cn(
          "size-3.5 text-subtle-foreground",
          !checked && "invisible"
        )}
      />
    </div>
  )
}

/** A mode the agent works in, as the app names it: "Ask first". */
type ComposerMode = {
  value: string
  label: string
  /** What it does, under its label. */
  description?: string
  /** Before its label, in the list and in the trigger. */
  icon?: React.ReactNode
  /**
   * "destructive" for a mode that lets the agent act unasked (files,
   * commands, the network): the trigger, chosen, in the destructive
   * colour, its icon too, and its icon in the list; its label says it.
   */
  tone?: "destructive" | undefined
}

/**
 * A choice of how the agent works, e.g. whether it asks before it edits
 * or runs a command: its icon and label in the toolbar, without a
 * chevron (the icon alone on a phone), its modes listed with what each
 * does. The modes are the app's; a mode `tone="destructive"` (one that
 * lets the agent act unasked) is seen as such in the toolbar.
 */
function ComposerModePicker({
  modes,
  value,
  onValueChange,
  title = "Permissions",
  label = (mode) => `Permissions: ${mode}`,
  doneLabel,
  footer,
  open,
  defaultOpen,
  onOpenChange,
  className,
}: {
  modes: readonly ComposerMode[]
  value: string
  onValueChange: (value: string) => void
  /** The list's name, and the sheet's title on a phone. */
  title?: string
  /** The trigger's name, with the mode's label. */
  label?: (mode: string) => string
  /** The sheet's button that closes it on a phone: "Done". */
  doneLabel?: string
  /**
   * Under the modes, in small grey text: a line about them with a link
   * or a button ("Applies to this conversation · Learn more").
   */
  footer?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) {
  const current = modes.find((mode) => mode.value === value)
  return (
    <ComposerSelect
      value={value}
      onValueChange={onValueChange}
      {...(open !== undefined ? { open } : {})}
      {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      onOpenChange={(next) => onOpenChange?.(next)}
    >
      <ComposerSelectTrigger
        data-slot="composer-mode-picker"
        data-tone={current?.tone}
        chevron={false}
        aria-label={label(current?.label ?? value)}
        className={cn(
          "data-[tone=destructive]:text-destructive data-[tone=destructive]:hover:text-destructive data-[tone=destructive]:aria-expanded:text-destructive [&[data-tone=destructive]_svg]:text-destructive",
          className
        )}
      >
        {current?.icon}
        {/* Only the icon in a toolbar under 32rem. */}
        <ComposerSelectValue className="@max-lg/composer-toolbar:hidden">
          {current?.label ?? value}
        </ComposerSelectValue>
      </ComposerSelectTrigger>
      <ComposerSelectContent
        title={title}
        {...(doneLabel !== undefined ? { doneLabel } : {})}
        footer={footer}
        className="sm:w-84"
      >
        <ComposerSelectList aria-label={title}>
          {modes.map((mode) => (
            <ComposerSelectItem
              key={mode.value}
              value={mode.value}
              icon={mode.icon}
              description={mode.description}
              data-tone={mode.tone}
              className="[&[data-tone=destructive]>svg]:text-destructive"
            >
              {mode.label}
            </ComposerSelectItem>
          ))}
        </ComposerSelectList>
      </ComposerSelectContent>
    </ComposerSelect>
  )
}

export {
  ComposerModePicker,
  ComposerOptionButton,
  ComposerSelect,
  ComposerSelectContent,
  ComposerSelectItem,
  ComposerSelectList,
  ComposerSelectTrigger,
  ComposerSelectValue,
  composerSelectRow,
  useComposerSelect,
  type ComposerMode,
  type ComposerSelectOpenReason,
}
