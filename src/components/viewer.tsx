"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  AtIcon,
  Cancel01Icon,
  Download01Icon,
  DragDropVerticalIcon,
  FileUnknownIcon,
  MinusSignIcon,
  MoreHorizontalIcon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { nextZoom, zoomSteps } from "@/lib/zoom"

// Where the pointer is a finger, a small button's place is as large as one
// (44px), its look the same.
const touch =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-2"

/**
 * A tool's look, a round ghost icon button's: grey, the foreground's when
 * pointed at, pressed or open, and a finger's place on a touch screen.
 * For a bar's button that is not a `ViewerTool`, e.g. a menu's trigger.
 */
const viewerToolLook = cn(
  touch,
  // Round, as a browser's.
  "rounded-full text-muted-foreground hover:text-foreground aria-expanded:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground",
  // In a group's island: a grey under the pointer, pressed or open.
  "in-data-[slot=viewer-tool-group]:hover:bg-muted in-data-[slot=viewer-tool-group]:aria-expanded:bg-muted in-data-[slot=viewer-tool-group]:aria-pressed:bg-muted"
)
// An icon button's: 28px in a group's island, 32px in a titlebar's row.
const viewerTool = cn(
  viewerToolLook,
  "in-data-[slot=viewer-lead]:size-7 in-data-[slot=viewer-titlebar-group]:size-8 in-data-[slot=viewer-tool-group]:size-7"
)

type ViewerLabels = {
  back: string
  forward: string
  /** The path's name, for a screen reader. */
  path: string
  /** The menu of the path's folders that have no room. */
  pathAbove: string
  addToChat: string
  download: string
  more: string
  zoomIn: string
  zoomOut: string
  /** The zoom's value, e.g. "Zoom 100%". */
  zoom: string
  fit: string
  /** A filter's placeholder and name. */
  filter: string
  /** Empties a filter. */
  clearFilter: string
  /** A find bar's field, and its buttons to the matches and to close it. */
  find: string
  previousMatch: string
  nextMatch: string
  closeFind: string
  /** No preview: its title, and what is said under it. */
  unsupported: string
  unsupportedDescription: string
  /** The buttons to the one before and after among the app's others. */
  previous: string
  next: string
  /** Where it is among them, from 1: "3 / 7". */
  among: (index: number, count: number) => string
  /** The floating bar of ways to change it, and its handle. */
  edits: string
  moveEdits: string
}

const defaultViewerLabels: ViewerLabels = {
  back: "Back",
  forward: "Forward",
  path: "Path",
  pathAbove: "Folders above",
  addToChat: "Add to chat",
  download: "Download",
  more: "More",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoom: "Zoom",
  fit: "Fit",
  filter: "Filter",
  clearFilter: "Clear filter",
  find: "Find",
  previousMatch: "Previous match",
  nextMatch: "Next match",
  closeFind: "Close find",
  unsupported: "No preview",
  unsupportedDescription: "This file cannot be shown here.",
  previous: "Previous",
  next: "Next",
  edits: "Edit",
  moveEdits: "Move the bar",
  among: (index, count) => `${index} / ${count}`,
}

/**
 * One thing open in a panel or over the window, e.g. a file: a toolbar
 * above (back, its path, its own tools, add to chat, download, more), its
 * content to the edges, and a status bar below where its controls need
 * one. A container (`@container/viewer`) for what is narrow in it.
 * Under a finger it takes no double tap to zoom the page: a tap on its
 * buttons is a click at once, however quick the next (its content may
 * take pinches and double taps of its own).
 */
function Viewer({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="viewer"
      className={cn(
        "@container/viewer flex h-full min-h-0 min-w-0 touch-manipulation flex-col bg-background text-sm",
        className
      )}
      {...props}
    />
  )
}

/**
 * The bar above: `ViewerBack`, `ViewerPath`, `ViewerTool`s, nearer the
 * panel's tabs over it than the content under it.
 */
function ViewerToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="viewer-toolbar"
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 px-3 [&>[data-slot=viewer-tools]]:ms-auto",
        // Its path on a row of its own where its name has no room.
        "has-data-wrapped:h-auto has-data-wrapped:flex-wrap has-data-wrapped:py-2",
        className
      )}
      {...props}
    />
  )
}

/** A button of a viewer's bars: an icon, named by its tooltip; toggled where `pressed` is given. */
function ViewerTool({
  label,
  pressed,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string
  /** On or off, e.g. comparing; a plain button without it. */
  pressed?: boolean | undefined
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            {...(pressed !== undefined ? { "aria-pressed": pressed } : {})}
            data-slot="viewer-tool"
            className={cn(viewerTool, className)}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Back, e.g. to the folder a file was opened from. */
function ViewerBack({
  label = defaultViewerLabels.back,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children"> & {
  label?: string
}) {
  return (
    <ViewerTool label={label} {...props}>
      <HugeiconsIcon
        icon={ArrowLeft01Icon}
        strokeWidth={2}
        className="rtl:rotate-180"
      />
    </ViewerTool>
  )
}

/** Forward again, after back. */
function ViewerForward({
  label = defaultViewerLabels.forward,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children"> & {
  label?: string
}) {
  return (
    <ViewerTool label={label} {...props}>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="rtl:rotate-180"
      />
    </ViewerTool>
  )
}

/** A folder on the way to what is shown; one with `onSelect` goes there. */
type ViewerPathSegment = {
  label: string
  onSelect?: (() => void) | undefined
}

/**
 * Where it is: the folders on the way, then its own name with its icon.
 * Where they have no room, all but the nearest are in a menu at the start
 * (`pathAbove` names it), not cut to nothing.
 */
function ViewerPath({
  path = [],
  name,
  icon,
  label = defaultViewerLabels.path,
  aboveLabel = defaultViewerLabels.pathAbove,
  className,
  ...props
}: Omit<React.ComponentProps<"nav">, "children"> & {
  path?: readonly ViewerPathSegment[] | undefined
  name: React.ReactNode
  icon?: React.ReactNode
  label?: string
  /** The menu of the folders that have no room. */
  aboveLabel?: string
}) {
  const nav = React.useRef<HTMLElement>(null)
  const [folded, setFolded] = React.useState(false)
  // Its name still cut short of 6rem, folded: a row of its own, over the
  // tools, not its name cut to nothing.
  const [wrapped, setWrapped] = React.useState(false)
  // The width it needs unfolded, read before it folded.
  const needed = React.useRef(0)
  // The toolbar's width it needs on one line, read before it wrapped.
  const oneLine = React.useRef(0)
  const foldable = path.length > 1
  React.useLayoutEffect(() => {
    const element = nav.current
    const bar = element?.closest<HTMLElement>("[data-slot=viewer-toolbar]")
    if (!element || !bar) return
    const least =
      6 *
      (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16)
    const measure = () => {
      if (wrapped) {
        if (bar.clientWidth >= oneLine.current) setWrapped(false)
      } else if (folded || !foldable) {
        const words = element.querySelector<HTMLElement>(
          "[data-viewer-path-own]"
        )
        const width = words?.clientWidth ?? least
        if (words && words.scrollWidth > width + 1 && width < least) {
          oneLine.current = bar.clientWidth + (least - width)
          setWrapped(true)
          return
        }
      }
      if (!foldable) return
      if (folded) {
        if (element.clientWidth >= needed.current) setFolded(false)
        return
      }
      const list = element.querySelector<HTMLElement>(
        "[data-slot=breadcrumb-list]"
      )
      if (!list) return
      // What each folder's name lacks, cut, on top of what the list takes.
      let cut = 0
      for (const name of element.querySelectorAll<HTMLElement>(
        "[data-viewer-path-name]"
      ))
        cut += Math.max(0, name.scrollWidth - name.clientWidth)
      if (cut > 1 || list.scrollWidth > list.clientWidth + 1) {
        needed.current =
          element.clientWidth + cut + (list.scrollWidth - list.clientWidth)
        setFolded(true)
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [folded, wrapped, foldable, path])
  const shown = folded && foldable ? path.slice(-1) : path
  const above = folded && foldable ? path.slice(0, -1) : []
  return (
    <Breadcrumb
      ref={nav}
      aria-label={label}
      data-slot="viewer-path"
      data-wrapped={wrapped || undefined}
      className={cn(
        "flex min-w-0 flex-1 overflow-hidden px-2 data-wrapped:basis-full",
        className
      )}
      {...props}
    >
      <BreadcrumbList
        className={cn(
          "min-w-0 flex-nowrap gap-1 text-2sm whitespace-nowrap text-subtle-foreground",
          // On a toolbar group's grey: a grey that reads on it.
          "in-data-[slot=viewer-tool-group]:text-muted-foreground"
        )}
      >
        {above.length > 0 && (
          <>
            <BreadcrumbItem className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label={aboveLabel}
                      className="flex size-5 items-center justify-center rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
                    />
                  }
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {above.map((segment, index) => (
                    <DropdownMenuItem
                      key={index}
                      disabled={!segment.onSelect}
                      onClick={segment.onSelect}
                    >
                      {segment.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="opacity-60">/</BreadcrumbSeparator>
          </>
        )}
        {shown.map((segment, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem
              // Folded, the nearest whole up to a third, the name cut first.
              className={
                above.length > 0 ? "max-w-1/3 shrink-0" : "min-w-0 shrink"
              }
            >
              {segment.onSelect ? (
                <BreadcrumbLink
                  render={<button type="button" />}
                  data-viewer-path-name=""
                  className="truncate rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  onClick={segment.onSelect}
                >
                  {segment.label}
                </BreadcrumbLink>
              ) : (
                <span data-viewer-path-name="" className="truncate">
                  {segment.label}
                </span>
              )}
            </BreadcrumbItem>
            <BreadcrumbSeparator className="opacity-60">/</BreadcrumbSeparator>
          </React.Fragment>
        ))}
        <BreadcrumbItem className="min-w-0 shrink">
          <BreadcrumbPage className="inline-flex min-w-0 items-center gap-1 font-medium">
            {icon && (
              <span
                aria-hidden="true"
                className="flex shrink-0 text-muted-foreground [&_svg]:size-3.5"
              >
                {icon}
              </span>
            )}
            {typeof name === "string" && /.\.[^.\s]{1,8}$/.test(name) ? (
              // Cut short, its extension kept: "screensh….png".
              <span data-viewer-path-own="" className="flex min-w-0">
                <span className="truncate">
                  {name.slice(0, name.lastIndexOf("."))}
                </span>
                <span className="shrink-0">
                  {name.slice(name.lastIndexOf("."))}
                </span>
              </span>
            ) : (
              <span data-viewer-path-own="" className="truncate">
                {name}
              </span>
            )}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * The tools at the end of the toolbar: its `ViewerToolGroup`s, each on a
 * grey pill of its own; gone while they hold none.
 */
function ViewerTools({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="viewer-tools"
      className={cn(
        "flex shrink-0 items-center gap-2 not-has-[>:not(:empty)]:hidden",
        className
      )}
      {...props}
    />
  )
}

/**
 * Tools that go together: the viewer's own, the app's, add to chat and
 * download, the overlay's. An island of their own, as a desktop chat
 * app's: a pill 36px high on the page's colour with a hairline and a
 * faint shadow (dark, a step lighter than the panel), its buttons 28px;
 * a lone tool a round island; apart from the next. Gone while it holds
 * none.
 */
function ViewerToolGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="viewer-tool-group"
      className={cn(
        "flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-background px-1 shadow-raised empty:hidden dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

/** Adds what is shown (or picked in it) to the conversation. */
function ViewerAddToChat({
  label = defaultViewerLabels.addToChat,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children"> & {
  label?: string
}) {
  return (
    <ViewerTool label={label} {...props}>
      <HugeiconsIcon icon={AtIcon} strokeWidth={2} />
    </ViewerTool>
  )
}

/** Downloads it: a link to `href`, or the app's `onClick`. */
function ViewerDownload({
  label = defaultViewerLabels.download,
  href,
  fileName,
  onClick,
}: {
  label?: string
  href?: string | undefined
  /** The name it is saved as, with a link. */
  fileName?: string | undefined
  onClick?: (() => void) | undefined
}) {
  if (href === undefined)
    return (
      <ViewerTool label={label} onClick={onClick}>
        <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
      </ViewerTool>
    )
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={href}
            download={fileName ?? ""}
            aria-label={label}
            data-slot="viewer-tool"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              viewerTool
            )}
          />
        }
      >
        <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * A tool that opens a menu: More by default, the app's
 * `DropdownMenuItem`s in it; another with its own `icon` and `label`,
 * e.g. a page's viewport. The menu as wide as its items.
 */
function ViewerMenu({
  label = defaultViewerLabels.more,
  icon = <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />,
  children,
  contentClassName,
  anchor,
  onKeyDown,
}: {
  label?: string
  icon?: React.ReactNode
  contentClassName?: string
  anchor?: React.ComponentProps<typeof DropdownMenuContent>["anchor"]
  /** Keys of the open menu, e.g. a letter that does an item. */
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
  children: React.ReactNode
}) {
  // No tooltip while its menu is open, nor as focus comes back to it when
  // the menu closes (it would cover the buttons beside it): again once
  // the pointer comes to it or focus leaves.
  const [quiet, setQuiet] = React.useState(false)
  return (
    <DropdownMenu onOpenChange={() => setQuiet(true)}>
      <Tooltip disabled={quiet}>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={label}
                  data-slot="viewer-tool"
                  className={viewerTool}
                  onPointerEnter={() => setQuiet(false)}
                  onBlur={() => setQuiet(false)}
                />
              }
            />
          }
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        anchor={anchor}
        onKeyDown={onKeyDown}
        alignOffset={anchor ? 10 : 0}
        sideOffset={4}
        className={cn("w-auto min-w-40", contentClassName)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * A filter of a viewer's bars, e.g. a list's by name: an icon, "Filter"
 * in it, and a button that empties it once there is something to empty.
 * Grey and on a hairline, as the bars around it; its edge darkens with
 * focus. 12px words at any width; `sm`, 24px tall with a 12px icon, as a
 * drawer's header has it. A `status` inside its end, e.g. "6 results".
 */
function ViewerFilter({
  value,
  onValueChange,
  icon = <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />,
  label = defaultViewerLabels.filter,
  clearLabel = defaultViewerLabels.clearFilter,
  size = "default",
  status,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "size"> & {
  value: string
  onValueChange: (value: string) => void
  icon?: React.ReactNode
  label?: string | undefined
  clearLabel?: string | undefined
  size?: "default" | "sm"
  /** Inside its end, before the clear button: e.g. "6 results". */
  status?: React.ReactNode
}) {
  const shownStatus =
    status !== undefined && status !== null && status !== false
  return (
    <InputGroup
      data-slot="viewer-filter"
      data-size={size}
      className={cn(
        "h-7 border-border bg-muted/50 data-[size=sm]:h-6 dark:bg-muted/50 data-[size=sm]:[&_[data-slot=input-group-addon]>svg]:size-3",
        className
      )}
    >
      <InputGroupAddon>{icon}</InputGroupAddon>
      <InputGroupInput
        aria-label={label}
        placeholder={label}
        spellCheck={false}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        // shadcn's input is 14px from md: not here.
        className="text-xs md:text-xs"
        {...props}
      />
      {(shownStatus || value !== "") && (
        <InputGroupAddon align="inline-end">
          {shownStatus && (
            <InputGroupText
              data-slot="viewer-filter-status"
              aria-live="polite"
              className="text-xs whitespace-nowrap text-subtle-foreground tabular-nums"
            >
              {status}
            </InputGroupText>
          )}
          {value !== "" && (
            <InputGroupButton
              size="icon-xs"
              aria-label={clearLabel}
              className={touch}
              onClick={() => onValueChange("")}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

/**
 * A viewer's find bar: what to find, where the match gone to is ("3 of
 * 12") and, once there is something to find, the previous and next match
 * (Enter and Shift+Enter too); with `onClose`, a button and Escape that
 * close it. It floats over the top end of what is positioned round it, so
 * the content does not move as it opens; `inline`, it is a bar's field.
 */
function ViewerFind({
  value,
  onValueChange,
  status,
  onStep,
  canStep = true,
  onClose,
  variant = "floating",
  label = defaultViewerLabels.find,
  previousLabel = defaultViewerLabels.previousMatch,
  nextLabel = defaultViewerLabels.nextMatch,
  closeLabel = defaultViewerLabels.closeFind,
  className,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string
  onValueChange: (value: string) => void
  /** Where the match gone to is: "3 of 12", "No results". */
  status?: React.ReactNode
  /** To the next match (1) or the previous (-1). */
  onStep: (by: 1 | -1) => void
  /** Whether there are matches to go to. */
  canStep?: boolean
  onClose?: (() => void) | undefined
  variant?: "floating" | "inline"
  label?: string | undefined
  previousLabel?: string | undefined
  nextLabel?: string | undefined
  closeLabel?: string | undefined
}) {
  const finding = value.trim() !== ""
  const floating = variant === "floating"
  return (
    <div
      data-slot="viewer-find"
      data-variant={variant}
      className={cn(
        floating &&
          "absolute inset-x-3 top-2 z-20 ms-auto max-w-76 rounded-lg bg-popover shadow-float",
        className
      )}
    >
      {/* Floating, 36px, the card is its surface: no field's edge, tint or
          focus ring (the caret shows the focus, as in the composer).
          Inline, a quiet filled field, as a filter's. */}
      <InputGroup
        className={cn(
          floating
            ? "h-9 border-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-transparent"
            : "h-7 border-border bg-muted/50 dark:bg-muted/50"
        )}
      >
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={label}
          placeholder={label}
          spellCheck={false}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.defaultPrevented) return
            if (event.key === "Enter") {
              event.preventDefault()
              onStep(event.shiftKey ? -1 : 1)
            } else if (event.key === "Escape" && onClose) {
              event.preventDefault()
              event.stopPropagation()
              onClose()
            }
          }}
          // Escape and the count clear a search field, not its own button.
          // 12px, not shadcn's 14px from md.
          className="text-xs md:text-xs [&::-webkit-search-cancel-button]:appearance-none"
          {...props}
        />
        {(finding || onClose) && (
          <InputGroupAddon align="inline-end">
            {finding && (
              <>
                <InputGroupText
                  data-slot="viewer-find-status"
                  aria-live="polite"
                  // Read last: quieter than what is found.
                  className="text-xs font-normal whitespace-nowrap text-subtle-foreground tabular-nums"
                >
                  {status}
                </InputGroupText>
                <InputGroupButton
                  size="icon-xs"
                  aria-label={previousLabel}
                  disabled={!canStep}
                  className={touch}
                  onClick={() => onStep(-1)}
                >
                  <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} />
                </InputGroupButton>
                <InputGroupButton
                  size="icon-xs"
                  aria-label={nextLabel}
                  disabled={!canStep}
                  className={touch}
                  onClick={() => onStep(1)}
                >
                  <HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={2} />
                </InputGroupButton>
              </>
            )}
            {onClose && (
              <InputGroupButton
                size="icon-xs"
                aria-label={closeLabel}
                className={touch}
                onClick={onClose}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  )
}

/** What is shown: to the edges, under the toolbar with no line between. */
function ViewerContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="viewer-content"
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

/** The bar below: controls at the start, `ViewerFacts` at the end. */
function ViewerStatusBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="viewer-status-bar"
      className={cn(
        "flex h-9 shrink-0 items-center gap-0.5 border-t ps-2 pe-3 text-xs/5 text-subtle-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * A viewer's bar of actions at its foot, over a rule: what they act on
 * at its start (e.g. a branch, small, in the faintest grey, its icon
 * before it), the app's buttons at its end (e.g. Discard and Commit).
 * Under a finger, the buttons alone, sharing the bar, each a finger's
 * height (44px): what they act on is the panel's already.
 */
function ViewerActionBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="viewer-action-bar"
      className={cn(
        "flex shrink-0 items-center gap-2 border-t px-3 py-2 text-xs *:not-data-[slot=button]:text-subtle-foreground *:data-[slot=button]:first-of-type:ms-auto [&>svg]:size-3.5 [&>svg]:shrink-0",
        // Desktop's 14px on a wide touch screen, the phone's 15px below.
        "pointer-coarse:*:not-data-[slot=button]:hidden pointer-coarse:*:data-[slot=button]:h-11 pointer-coarse:*:data-[slot=button]:flex-1 pointer-coarse:*:data-[slot=button]:rounded-lg pointer-coarse:*:data-[slot=button]:text-sm max-sm:pointer-coarse:*:data-[slot=button]:text-md",
        className
      )}
      {...props}
    />
  )
}

/** A control of the status bar with words: "Fit", "Stop", "Clear". */
function ViewerStatusButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      data-slot="viewer-status-button"
      className={cn(
        touch,
        "px-2 text-xs/5 font-normal text-muted-foreground hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground",
        className
      )}
      {...props}
    />
  )
}

/** A value between controls: "100%", "2 / 12". */
function ViewerStatusValue({
  className,
  ...props
}: React.ComponentProps<"output">) {
  return (
    <output
      data-slot="viewer-status-value"
      className={cn(
        "min-w-11 text-center text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

/** Words of the status bar that are not a control: "Row 4 · seats". */
function ViewerStatusText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="viewer-status-text"
      className={cn("truncate px-2 text-muted-foreground", className)}
      {...props}
    />
  )
}

function ViewerStatusSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      orientation="vertical"
      data-slot="viewer-status-separator"
      className={cn(
        "mx-1 data-vertical:h-4 data-vertical:self-center",
        className
      )}
      {...props}
    />
  )
}

/**
 * What it is, at the end of the status bar: its size, its type, how long
 * it is; the facts given, a dot between each.
 */
function ViewerFacts({
  facts,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  facts: readonly React.ReactNode[]
}) {
  const shown = facts.filter(
    (fact) =>
      fact !== undefined && fact !== null && fact !== false && fact !== ""
  )
  return (
    <span
      data-slot="viewer-facts"
      className={cn("ms-auto truncate ps-3 tabular-nums", className)}
      {...props}
    >
      {shown.map((fact, index) => (
        <React.Fragment key={index}>
          {index > 0 && " · "}
          {fact}
        </React.Fragment>
      ))}
    </span>
  )
}

/**
 * A viewer's zoom. In its toolbar (a `ViewerFrame`'s `zoom`), its percent
 * alone, a menu of Fit, in, out and the steps; in a status bar, out, the
 * percent (that menu), in, and "Fit" (pressed while it fits, the percent
 * then the fitted one).
 */
function ViewerZoom({
  zoom,
  onZoomChange,
  fit,
  onFit,
  min = 0.1,
  max = 8,
  labels: labelsProp,
}: {
  /** As drawn: 1 is its own size. */
  zoom: number
  onZoomChange: (zoom: number) => void
  /** It fits its place: no zoom of its own. */
  fit?: boolean | undefined
  onFit?: (() => void) | undefined
  min?: number
  max?: number
  labels?: Partial<Pick<ViewerLabels, "zoomIn" | "zoomOut" | "zoom" | "fit">>
}) {
  const labels = { ...defaultViewerLabels, ...labelsProp }
  const value = `${Math.round(zoom * 100)}%`
  const inToolbar = React.useContext(ZoomInToolbar)
  const canOut = zoom > min + 1e-6
  const canIn = zoom < max - 1e-6
  const out = () => onZoomChange(nextZoom(zoom, -1, { min, max }))
  const into = () => onZoomChange(nextZoom(zoom, 1, { min, max }))
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            data-slot={inToolbar ? "viewer-zoom" : "viewer-status-value"}
            aria-label={`${labels.zoom} ${value}`}
            className={cn(
              touch,
              "font-normal tabular-nums",
              inToolbar
                ? cn(viewerToolLook, "h-8 gap-0.5 px-3 text-2sm")
                : "h-6 min-w-11 px-1 text-muted-foreground hover:text-foreground aria-expanded:text-foreground"
            )}
          />
        }
      >
        {value}
        {inToolbar && (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-3"
          />
        )}
      </DropdownMenuTrigger>
      {/* Said as it changes, as the value was. */}
      <output className="sr-only" aria-label={`${labels.zoom} ${value}`}>
        {`${labels.zoom} ${value}`}
      </output>
      <DropdownMenuContent
        align={inToolbar ? "end" : "center"}
        className="min-w-36"
      >
        {onFit && (
          <DropdownMenuRadioGroup value={fit ? "fit" : ""}>
            <DropdownMenuRadioItem value="fit" onClick={onFit}>
              {labels.fit}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        )}
        {inToolbar && (
          <>
            <DropdownMenuItem disabled={!canIn} onClick={into}>
              {labels.zoomIn}
              <DropdownMenuShortcut>+</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canOut} onClick={out}>
              {labels.zoomOut}
              <DropdownMenuShortcut>−</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
        {(onFit || inToolbar) && <DropdownMenuSeparator />}
        <DropdownMenuRadioGroup
          value={fit ? "" : String(zoom)}
          onValueChange={(step) => onZoomChange(Number(step))}
        >
          {zoomSteps
            .filter((step) => step >= min - 1e-6 && step <= max + 1e-6)
            .map((step) => (
              <DropdownMenuRadioItem
                key={step}
                value={String(step)}
                className="tabular-nums"
              >
                {`${Math.round(step * 100)}%`}
              </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
  if (inToolbar) return menu
  return (
    <>
      <ViewerTool label={labels.zoomOut} disabled={!canOut} onClick={out}>
        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} />
      </ViewerTool>
      {menu}
      <ViewerTool label={labels.zoomIn} disabled={!canIn} onClick={into}>
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
      </ViewerTool>
      {onFit && (
        <>
          <ViewerStatusSeparator />
          <ViewerStatusButton aria-pressed={!!fit} onClick={onFit}>
            {labels.fit}
          </ViewerStatusButton>
        </>
      )}
    </>
  )
}

/** Whether a `ViewerZoom` is in a toolbar: its percent's menu alone. */
const ZoomInToolbar = React.createContext(false)

/**
 * Tools a viewer's surroundings add at the end of its toolbar, e.g. a
 * `ViewerOverlay`'s close: taken by the first `ViewerFrame` in it, not by
 * one inside that.
 */
const ViewerFrameEnd = React.createContext<React.ReactNode>(null)

/**
 * A frame whose toolbar is the window's top row, as a `ViewerOverlay`'s
 * over the whole window: as tall as an AgentApp's titlebar
 * (`--agent-app-titlebar`, else 44px), past the window's own buttons
 * (`--viewer-titlebar-start` where the surroundings set it), dragging
 * the window but by its controls; at its start its name, then the kind's
 * own `lead` (an image's versions and compare), its facts after its
 * name (where it has no status bar, not in More); at its end the
 * surroundings' (`ViewerFrameEnd`, e.g. open in the panel and close). Its
 * tools under what it shows, apart from it, as a photo app's: an island
 * at the middle of the foot of ways to change it (an image's marking,
 * spreading its tools there as it marks, the app's `edits`; in place of
 * the floating bar), then another of the zoom with the viewer's and the
 * app's tools, add to chat, download and more; on two rows where they
 * have no room on one.
 * Taken by the first `ViewerFrame` in it.
 */
const ViewerFrameTitlebar = React.createContext(false)

/**
 * A toolbar's row as a window's titlebar: dragging the window (a host
 * that drags it itself does so on a pointerdown here whose target is not
 * a control), past the window's own buttons.
 */
const viewerTitlebar = "h-[var(--agent-app-titlebar,--spacing(11))] gap-3 pe-3"

/** An island of a titlebar frame's tools under what it shows. */
const viewerDockIsland = "max-w-full overflow-x-auto overflow-y-hidden"

/**
 * Whether a viewer's ways to change what it shows are on an island under
 * it (a `ViewerFrameTitlebar`'s), not its floating bar: a kind's mode
 * first, its tools and its own actions after it, in the island's row.
 */
const ViewerEditDocked = React.createContext(false)

/**
 * Where a viewer's kind puts its own ways to change what it shows (e.g. an
 * image's marking) in its floating bar of them, before the app's. `null`
 * until it is on the page; `undefined` out of a `ViewerFrame`.
 */
const ViewerEditSlot = React.createContext<HTMLElement | null | undefined>(
  undefined
)

/**
 * A way to change what a viewer shows, in its floating bar: its icon and
 * its word (the icon alone where the viewer is narrow), e.g. "Remove
 * background". For a `ViewerFrame`'s `edits`.
 */
function ViewerEditButton({
  label,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "aria-label"> & {
  label: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      data-slot="viewer-edit-button"
      className={cn(touch, viewerEdit, className)}
      {...props}
    >
      {children}
      <ViewerEditLabel>{label}</ViewerEditLabel>
    </Button>
  )
}

/** A floating bar's button's look: grey, lit when pointed at or pressed. */
const viewerEdit =
  "font-normal text-muted-foreground hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground data-pressed:bg-muted data-pressed:text-foreground"

/** A floating bar's button's word: gone where the viewer is narrow. */
function ViewerEditLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="viewer-edit-label"
      className={cn("@max-sm/viewer:hidden", className)}
      {...props}
    />
  )
}

/**
 * The floating bar of ways to change what a viewer shows, at the foot of
 * what it shows, in its middle: a handle to drag it aside by, then the
 * kind's own (its `ViewerEditSlot`) and the app's. Not there while it
 * has none.
 */
function ViewerEditBar({
  slot,
  edits,
  labels,
}: {
  slot: (element: HTMLElement | null) => void
  edits?: React.ReactNode
  labels: ViewerLabels
}) {
  const bar = React.useRef<HTMLDivElement>(null)
  const [offset, setOffset] = React.useState({ x: 0, y: 0 })
  const drag = React.useRef<{
    x: number
    y: number
    from: { x: number; y: number }
  } | null>(null)
  // Kept within what the viewer shows.
  const clamp = (next: { x: number; y: number }) => {
    const element = bar.current
    const place = element?.parentElement
    if (!element || !place) return next
    const box = element.getBoundingClientRect()
    const room = place.getBoundingClientRect()
    const left = box.left - offset.x
    const top = box.top - offset.y
    return {
      x: Math.min(
        room.right - box.width - left,
        Math.max(room.left - left, next.x)
      ),
      y: Math.min(
        room.bottom - box.height - top,
        Math.max(room.top - top, next.y)
      ),
    }
  }
  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label={labels.edits}
      data-slot="viewer-edit-bar"
      style={
        offset.x || offset.y
          ? { translate: `${offset.x}px ${offset.y}px` }
          : undefined
      }
      className="absolute inset-x-3 bottom-3 z-10 mx-auto flex w-fit items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-xl bg-popover p-1 text-popover-foreground shadow-float not-has-[[data-slot=viewer-edit-slot]>*,[data-slot=viewer-edit-actions]>*]:hidden pointer-coarse:p-2"
    >
      <button
        type="button"
        aria-label={labels.moveEdits}
        data-slot="viewer-edit-handle"
        className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-subtle-foreground outline-none hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, from: offset }
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // A pointer no longer down (Firefox throws): dragged uncaptured.
          }
        }}
        onPointerMove={(event) => {
          const from = drag.current
          if (!from) return
          setOffset(
            clamp({
              x: from.from.x + event.clientX - from.x,
              y: from.from.y + event.clientY - from.y,
            })
          )
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(event) => {
          const by = event.shiftKey ? 64 : 16
          const step = {
            ArrowLeft: { x: -by, y: 0 },
            ArrowRight: { x: by, y: 0 },
            ArrowUp: { x: 0, y: -by },
            ArrowDown: { x: 0, y: by },
          }[event.key]
          if (event.key === "Escape" || event.key === "Home") {
            setOffset({ x: 0, y: 0 })
          } else if (step) {
            setOffset(clamp({ x: offset.x + step.x, y: offset.y + step.y }))
          } else return
          event.preventDefault()
        }}
      >
        <HugeiconsIcon
          icon={DragDropVerticalIcon}
          strokeWidth={2}
          className="size-4"
        />
      </button>
      <div
        ref={slot}
        data-slot="viewer-edit-slot"
        className="flex shrink-0 items-center gap-0.5"
      />
      <div
        data-slot="viewer-edit-actions"
        className="flex shrink-0 items-center gap-0.5"
      >
        {edits}
      </div>
    </div>
  )
}

/** What every viewer takes: where it is, and the app's actions on it. */
type ViewerFrameProps = {
  /** Its name, e.g. the file's: the last of its path. */
  name: string
  /** Its type's icon, before its name. */
  icon?: React.ReactNode
  /** The folders on the way to it. */
  path?: readonly ViewerPathSegment[] | undefined
  /**
   * In the toolbar, in the place of back and the path: e.g. a terminal's
   * tabs, or `null` for nothing where a tab already names it.
   */
  start?: React.ReactNode
  /** Back, e.g. to the folder it was opened from; no button without it. */
  onBack?: (() => void) | undefined
  /** Forward again, after back; no button without it. */
  onForward?: (() => void) | undefined
  /** The app's buttons in the toolbar, after the viewer's own: `ViewerTool`s. */
  actions?: React.ReactNode
  /** "@": adds it, or what is picked in it, to the conversation. */
  onAddToChat?: (() => void) | undefined
  /** Download: a URL to save, or the app's own. */
  download?: string | (() => void) | undefined
  /** More: the app's `DropdownMenuItem`s. */
  menu?: React.ReactNode
  /** Facts of the app's after the viewer's own, e.g. "PNG", "412 KB". */
  details?: readonly React.ReactNode[] | undefined
  /**
   * Where it is among the app's others (a folder's images, a turn's
   * files), from 1: "3 / 7" at the foot of what it shows.
   */
  position?: { index: number; count: number } | undefined
  /** To the one before: a round button by its start; none at the first. */
  onPrevious?: (() => void) | undefined
  /** To the one after: a round button by its end; none at the last. */
  onNext?: (() => void) | undefined
  labels?: Partial<ViewerLabels> | undefined
}

// Over what it shows: round, on a frosted ground, as a viewer overlay's.
const viewerOverContent =
  "absolute z-10 rounded-full bg-background/80 shadow-float backdrop-blur-sm"

/**
 * Over what a viewer shows: the buttons to the one before and after by
 * its sides (gone where there is none), and where it is, "3 / 7", at its
 * foot. In a `ViewerContent`, or anything `relative`.
 */
function ViewerSiblings({
  position,
  onPrevious,
  onNext,
  labels: labelsProp,
}: Pick<ViewerFrameProps, "position" | "onPrevious" | "onNext" | "labels">) {
  const labels = { ...defaultViewerLabels, ...labelsProp }
  // Centred by its margins, not a translate: a button's press moves it
  // a pixel by its own, which would undo the centring and take it from
  // under the pointer before its click.
  const side = cn(viewerOverContent, "inset-y-0 my-auto")
  return (
    <>
      {onPrevious && (
        <Button
          variant="outline"
          size="icon"
          aria-label={labels.previous}
          data-slot="viewer-previous"
          className={cn(side, "start-3")}
          // Called with nothing: not the click, which an app's handler
          // could take for an argument of its own.
          onClick={() => onPrevious()}
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            strokeWidth={2}
            className="rtl:-scale-x-100"
          />
        </Button>
      )}
      {onNext && (
        <Button
          variant="outline"
          size="icon"
          aria-label={labels.next}
          data-slot="viewer-next"
          className={cn(side, "end-3")}
          // Called with nothing: not the click, which an app's handler
          // could take for an argument of its own.
          onClick={() => onNext()}
        >
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="rtl:-scale-x-100"
          />
        </Button>
      )}
      {position && (
        <div
          data-slot="viewer-position"
          className={cn(
            viewerOverContent,
            "inset-x-0 bottom-3 mx-auto flex h-6 w-fit items-center px-2 text-xs text-muted-foreground tabular-nums",
            // Over the floating bar of edits, where it is there.
            "in-[[data-slot=viewer-content]:has([data-slot=viewer-edit-slot]>*,[data-slot=viewer-edit-actions]>*)]:bottom-15"
          )}
        >
          {labels.among(position.index, position.count)}
        </div>
      )}
    </>
  )
}

/**
 * A viewer with its bars, as each kind of viewer has them, in a panel and
 * over the window alike: one row above, back and its path (or `start`)
 * and the kind's own `lead` (e.g. compare) at its start; its `zoom`, the
 * kind's `tools`, the app's `actions`, add to chat, download and more (its
 * facts at the top of more's menu) at its end. Under it, what it shows, to
 * its edges, a floating bar of ways to change it (the kind's own and the
 * app's `edits`) at its foot. Its status bar below, `controls` and its
 * facts, but where the kind has none (`statusBar={false}`, an image's).
 */
function ViewerFrame({
  name,
  icon,
  path,
  onBack,
  onForward,
  actions,
  onAddToChat,
  download,
  menu,
  labels: labelsProp,
  position,
  onPrevious,
  onNext,
  start,
  lead,
  zoom,
  tools,
  edits,
  controls,
  facts = [],
  toolbar = true,
  statusBar = true,
  footer,
  className,
  children,
  ...props
}: Omit<ViewerFrameProps, "details"> &
  Omit<React.ComponentProps<"section">, "children"> & {
    /** The kind's own at the toolbar's start, after its path: e.g. compare. */
    lead?: React.ReactNode
    /** Its `ViewerZoom`: its percent, at the toolbar's end. */
    zoom?: React.ReactNode
    tools?: React.ReactNode
    /**
     * The app's ways to change it, in the floating bar at its foot after
     * the kind's own: `ViewerEditButton`s, e.g. remove the background.
     */
    edits?: React.ReactNode
    /** Controls of a status bar below, e.g. a recording's play and seek. */
    controls?: React.ReactNode
    facts?: readonly React.ReactNode[]
    /**
     * Its toolbar: none where it would hold its path alone, e.g. a page
     * a tab already names.
     */
    toolbar?: boolean
    /**
     * Its status bar, of its `controls` and facts; without one (an
     * image's: its zoom in the toolbar), its facts at the top of more's
     * menu and what it shows to the viewer's foot.
     */
    statusBar?: boolean
    /** Under the content, past the status bar: e.g. a `ViewerActionBar`. */
    footer?: React.ReactNode
    children: React.ReactNode
  }) {
  const labels = { ...defaultViewerLabels, ...labelsProp }
  const end = React.useContext(ViewerFrameEnd)
  const titlebar = React.useContext(ViewerFrameTitlebar)
  const [slot, setSlot] = React.useState<HTMLElement | null>(null)
  const given = facts.filter(
    (fact) =>
      fact !== undefined && fact !== null && fact !== false && fact !== ""
  )
  // Its facts at the end of its status bar; without one, at the top of
  // more's menu; as the window's top row, after its name.
  const docked = toolbar && titlebar
  const shown = statusBar || docked ? [] : given
  const download_ = download !== undefined && (
    <ViewerDownload
      label={labels.download}
      {...(typeof download === "string"
        ? { href: download, fileName: name }
        : { onClick: download })}
    />
  )
  const more = (menu || shown.length > 0) && (
    <ViewerMenu label={labels.more}>
      {shown.length > 0 && (
        <div
          data-slot="viewer-menu-facts"
          className="px-2 py-1 text-xs text-muted-foreground"
        >
          <ViewerFacts facts={shown} className="ms-0 ps-0" />
        </div>
      )}
      {shown.length > 0 && menu && <DropdownMenuSeparator />}
      {menu}
    </ViewerMenu>
  )
  const addToChat = onAddToChat && (
    <ViewerAddToChat label={labels.addToChat} onClick={onAddToChat} />
  )
  return (
    <Viewer aria-label={name} className={className} {...props}>
      {toolbar && titlebar && (
        <ViewerToolbar
          data-titlebar=""
          className={viewerTitlebar}
          style={{
            paddingInlineStart:
              "var(--viewer-titlebar-start, calc(env(titlebar-area-x, var(--agent-app-titlebar-inset, 0px)) + 0.75rem))",
          }}
        >
          <span
            data-slot="viewer-name"
            className="flex min-w-0 items-center gap-2 font-medium [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
          >
            {icon}
            <span className="truncate">{name}</span>
            {!statusBar && given.length > 0 && (
              <ViewerFacts
                facts={given}
                className="-ms-1 shrink-0 ps-0 font-normal text-muted-foreground before:content-['·_']"
              />
            )}
          </span>
          {lead && (
            <div
              data-slot="viewer-titlebar-group"
              className="flex shrink-0 items-center gap-0.5"
            >
              {lead}
            </div>
          )}
          {end && (
            <ViewerTools>
              <div
                data-slot="viewer-titlebar-group"
                className="flex shrink-0 items-center gap-0.5"
              >
                {end}
              </div>
            </ViewerTools>
          )}
        </ViewerToolbar>
      )}
      {toolbar && !titlebar && (
        <ViewerToolbar>
          {start !== undefined ? (
            start
          ) : (
            // Back and where it is, on a pill as wide as they are.
            <ViewerToolGroup className="min-w-0 shrink has-data-wrapped:basis-full">
              {onBack && <ViewerBack label={labels.back} onClick={onBack} />}
              {onForward && (
                <ViewerForward label={labels.forward} onClick={onForward} />
              )}
              <ViewerPath
                path={path}
                name={name}
                icon={icon}
                // Its own name: viewers side by side have a path each.
                label={`${labels.path}, ${name}`}
                aboveLabel={labels.pathAbove}
                className="flex-initial px-2"
              />
            </ViewerToolGroup>
          )}
          {lead && (
            <ViewerToolGroup data-slot="viewer-lead" className="shrink-0">
              {lead}
            </ViewerToolGroup>
          )}
          <ViewerTools>
            <ViewerToolGroup>
              <ZoomInToolbar value>{zoom}</ZoomInToolbar>
            </ViewerToolGroup>
            <ViewerToolGroup>{tools}</ViewerToolGroup>
            <ViewerToolGroup>{actions}</ViewerToolGroup>
            <ViewerToolGroup>
              {addToChat}
              {download_}
              {more}
            </ViewerToolGroup>
            <ViewerToolGroup>{end}</ViewerToolGroup>
          </ViewerTools>
        </ViewerToolbar>
      )}
      <ViewerFrameEnd value={null}>
        <ViewerFrameTitlebar value={false}>
          <ViewerEditSlot value={slot}>
            <ViewerEditDocked value={toolbar && titlebar}>
              <ViewerContent>
                {children}
                <ViewerSiblings
                  position={position}
                  onPrevious={onPrevious}
                  onNext={onNext}
                  labels={labelsProp}
                />
                {/* In the titlebar's row instead, where it is one. */}
                {!(toolbar && titlebar) && (
                  <ViewerEditBar slot={setSlot} edits={edits} labels={labels} />
                )}
              </ViewerContent>
            </ViewerEditDocked>
          </ViewerEditSlot>
        </ViewerFrameTitlebar>
      </ViewerFrameEnd>
      {toolbar && titlebar && (
        // Under what it shows, apart from it: an island of its tools.
        <div
          data-slot="viewer-dock"
          className="flex shrink-0 flex-wrap justify-center gap-2 px-3 pt-2 pb-3"
        >
          {/* Ways to change it, an island apart; on a row of their own
              where the two have no room side by side. */}
          <ViewerToolGroup
            data-viewer-edits=""
            role="toolbar"
            aria-label={labels.edits}
            className={cn(
              viewerDockIsland,
              "not-has-[[data-slot=viewer-edit-slot]>*,[data-slot=viewer-edit-actions]>*]:hidden"
            )}
          >
            <div
              ref={setSlot}
              data-slot="viewer-edit-slot"
              className="flex shrink-0 items-center gap-0.5"
            />
            <div
              data-slot="viewer-edit-actions"
              className="flex shrink-0 items-center gap-0.5"
            >
              {edits}
            </div>
          </ViewerToolGroup>
          <ViewerToolGroup className={viewerDockIsland}>
            <ZoomInToolbar value>{zoom}</ZoomInToolbar>
            {tools}
            {actions}
            {addToChat}
            {download_}
            {more}
          </ViewerToolGroup>
        </div>
      )}
      {statusBar && (controls || given.length > 0) && (
        <ViewerStatusBar>
          {controls}
          <ViewerFacts facts={given} />
        </ViewerStatusBar>
      )}
      {footer}
    </Viewer>
  )
}

/**
 * What a file with no preview shows: its icon, that it cannot be shown,
 * and the app's actions, e.g. download or open elsewhere.
 */
function ViewerUnsupported({
  icon = <HugeiconsIcon icon={FileUnknownIcon} strokeWidth={2} />,
  title = defaultViewerLabels.unsupported,
  description = defaultViewerLabels.unsupportedDescription,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <Empty
      data-slot="viewer-unsupported"
      className={cn("rounded-none", className)}
      {...props}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}

/** "0:42", "1:02:09". */
function formatDuration(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds)) return "0:00"
  const whole = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = String(whole % 60).padStart(2, "0")
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`
}

export {
  ViewerSiblings,
  Viewer,
  ViewerAddToChat,
  ViewerBack,
  ViewerContent,
  ViewerDownload,
  ViewerFacts,
  ViewerFilter,
  ViewerFind,
  ViewerForward,
  ViewerFrame,
  ViewerFrameEnd,
  ViewerFrameTitlebar,
  ViewerEditDocked,
  ViewerEditSlot,
  ViewerEditButton,
  ViewerEditLabel,
  ViewerMenu,
  ViewerPath,
  ViewerActionBar,
  ViewerStatusBar,
  ViewerStatusButton,
  ViewerStatusSeparator,
  ViewerStatusText,
  ViewerStatusValue,
  ViewerTool,
  ViewerToolbar,
  ViewerToolGroup,
  ViewerTools,
  ViewerUnsupported,
  ViewerZoom,
  defaultViewerLabels,
  formatDuration,
  nextZoom,
  viewerTool,
  viewerToolLook,
  type ViewerFrameProps,
  type ViewerLabels,
  type ViewerPathSegment,
}
