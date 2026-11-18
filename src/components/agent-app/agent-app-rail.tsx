"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  PencilEdit02Icon,
  Search01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons"

import { useAgentAppLayout } from "./agent-app"
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * A row of the sidebar or an item of the rail: its text in the sidebar's
 * ink, as the page's, since most of the sidebar's text is in rows (a
 * softer grey makes the whole column read faint); its icons in a softer
 * one but for the current row's or under the pointer; and the current
 * one on the main area's colour with a hairline, in the light theme as
 * in the dark, where the sidebar's own accent is too near its colour to
 * be seen.
 */
const sidebarRow = cn(
  "text-sidebar-foreground [&>svg]:text-muted-foreground hover:[&>svg]:text-sidebar-foreground data-active:[&>svg]:text-sidebar-foreground",
  "data-active:bg-background data-active:shadow-raised dark:data-active:bg-sidebar-accent"
)

/**
 * A bar's area at its narrowest, in rem as its `min-w-10`: its icon and
 * room round it; the page's text larger, larger.
 */
const NARROWEST = 2.5
/**
 * Narrower still (`min-w-7`: its icon and its padding), rather than a row
 * of the footer's buttons alone, or than the areas wrapped.
 */
const SQUEEZED = 1.75

/** The app's rail, from `AgentApp`, for a sheet's menu on a phone. */
const RailContext = React.createContext<React.ReactNode>(null)

/** Where a rail renders: its own column, or a menu in the sheet. */
const ModeContext = React.createContext<"rail" | "menu">("rail")

/**
 * An item of the rail's column: an icon, its name in a tooltip, 32px, as
 * on a touch screen (its target 44px, past it, unseen). For
 * an app's own item that is another trigger, e.g. a popover's:
 * `<PopoverTrigger render={<SidebarMenuButton aria-label="…"
 * className={railItem} />}>`.
 */
const railItem = cn(
  "touch-target relative size-8 justify-center overflow-visible p-0",
  sidebarRow
)

/** A button of the rail's column, named by its tooltip. */
function RailButton({
  icon,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<typeof SidebarMenuButton>, "children"> & {
  icon: IconSvgElement
  label: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SidebarMenuButton
            data-slot="agent-app-rail-button"
            aria-label={label}
            className={cn(railItem, className)}
            {...props}
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent side="inline-end">{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Where the sidebar is folded, or on a touch screen, the rail's first items: its button, then
 * a new conversation and search where the sidebar has them.
 */
function RailControls() {
  const { railControls, sidebarActions, toggleLabel, titlebar, pinned } =
    useAgentAppLayout()
  const { toggleSidebar } = useSidebar()
  if (!railControls) return null
  // The titlebar has the sidebar's button; as a book's first screen, the
  // sidebar has none.
  const toggle = !titlebar && !pinned
  if (!toggle && !sidebarActions?.newConversation && !sidebarActions?.search)
    return null
  return (
    <div
      data-slot="agent-app-rail-controls"
      // Apart from the areas under it by a rule; under a finger, 12px
      // clear of it on either side.
      className="flex w-full flex-col items-center gap-1 border-sidebar-border not-last:mb-1 not-last:border-b not-last:pb-1"
    >
      {toggle && (
        <RailButton
          icon={SidebarLeftIcon}
          label={toggleLabel}
          data-sidebar="trigger"
          onClick={toggleSidebar}
        />
      )}
      {sidebarActions?.newConversation && (
        <RailButton
          icon={PencilEdit02Icon}
          label={sidebarActions.newConversation.label}
          onClick={sidebarActions.newConversation.run}
        />
      )}
      {sidebarActions?.search && (
        <RailButton
          icon={Search01Icon}
          label={sidebarActions.search.label}
          aria-keyshortcuts={sidebarActions.search.keys}
          onClick={sidebarActions.search.run}
        />
      )}
    </div>
  )
}

/**
 * The column at the window's start edge, from 640px wide: the sidebar's
 * button where it is folded, then the app's areas, if any. Narrow (48px)
 * for a mouse and for a finger alike: 32px icons, a finger's 44px
 * targets unseen past them.
 * Above the sidebar, which slides under it as it closes. Its first item
 * level with the sidebar's top bar and the header (centres 24px down, or
 * 32px in an inset sidebar's padding; 26px and 34px on a touch screen), its last with the sidebar's
 * footer's row. Beside an inset sidebar, one surface with it: no rule
 * between them. None on a phone.
 */
function RailColumn({
  header,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** At its top, before the sidebar's buttons: the app's mark. */
  header?: React.ReactNode
}) {
  return (
    <div
      data-slot="agent-app-rail"
      className={cn(
        "relative z-20 flex w-(--sidebar-width-icon) shrink-0 flex-col items-center gap-1 overflow-y-auto border-e border-sidebar-border bg-frame p-2 text-sidebar-foreground group-data-phone/sidebar-wrapper:hidden",
        "group-has-data-[variant=inset]/sidebar-wrapper:border-e-0 group-has-data-[variant=inset]/sidebar-wrapper:pt-4 group-has-data-[variant=inset]/sidebar-wrapper:pb-4 group-has-data-[variant=inset]/sidebar-wrapper:pointer-coarse:*:first:mt-0.5",
        // As beside the folded inset sidebar's card: the main area's. Under
        // a finger, its first item 2px lower, centred on the header's
        // taller line.
        "group-data-inset/sidebar-wrapper:border-e-0 group-data-inset/sidebar-wrapper:pt-4 group-data-inset/sidebar-wrapper:pb-4 group-data-inset/sidebar-wrapper:pointer-coarse:*:first:mt-0.5",
        // Under the titlebar, on the window's colour beside the card.
        "group-data-titlebar/sidebar-wrapper:border-e-0",
        className
      )}
      {...props}
    >
      {header}
      <RailControls />
      {children}
    </div>
  )
}

/**
 * The app's areas, e.g. "Chat", "Files", "Settings": a column of icons at
 * the window's start edge, before the sidebar, always there from 640px
 * wide; where the sidebar has no room beside the main area, it folds, and
 * the column starts with its button. The sidebar is the area's: an
 * `AgentAppSidebar` for chat, the app's own for the others. On a phone
 * (narrower than 640px) there is no column: the same items are a bar of
 * icons over their names at the foot of the sidebar's sheet, where an
 * `AgentAppRailMenu` is (an `AgentAppSidebar` has one at its foot). Given
 * to `AgentApp` as its `rail`.
 */
function AgentAppRail({
  label,
  header,
  className,
  children,
  ...props
}: React.ComponentProps<"nav"> & {
  /** Its name, a landmark's: e.g. "Areas". */
  label: string
  /**
   * Above its areas, at its top: the app's mark, an `AgentAppRailBrand`.
   * None in a phone's bar.
   */
  header?: React.ReactNode
}) {
  const mode = React.useContext(ModeContext)
  if (mode === "menu") return <RailBar label={label}>{children}</RailBar>
  return (
    <RailColumn className={className} header={header}>
      <nav
        aria-label={label}
        className="flex min-h-0 flex-1 flex-col items-center gap-1"
        {...props}
      >
        {children}
      </nav>
    </RailColumn>
  )
}

/**
 * The rail's areas as a bar across the sidebar's foot: icons over their
 * names, each a finger's size, clear of a phone's home indicator. Where a
 * name has no room (a narrow sidebar, many areas), all are icons only,
 * their names for screen readers.
 */
function RailBar({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const bar = React.useRef<HTMLElement>(null)
  const [compact, setCompact] = React.useState(false)
  // One row; its areas narrower, the footer's buttons beside them; or
  // the footer's buttons a row of their own.
  const [fit, setFit] = React.useState<"row" | "squeezed" | "wrapped">("row")
  // Measured with the names in or out of sight: a name's scrollWidth is
  // its text's either way, its item's width the same.
  const measure = React.useCallback(() => {
    const element = bar.current
    if (!element) return
    const items = element.querySelectorAll<HTMLElement>(
      "[data-slot=agent-app-rail-item]"
    )
    // The footer's own row where the areas, even squeezed, and the
    // footer's other buttons (those shown) have no room in one: the same
    // whether it is or not.
    const others = element.querySelectorAll<HTMLElement>(
      "[data-slot=agent-app-rail-footer] > :not([data-slot=agent-app-rail-item])"
    )
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const buttons = Array.from(others).reduce((sum, other) => {
      const width = other.getBoundingClientRect().width
      if (width === 0) return sum
      const margins = getComputedStyle(other)
      return (
        sum +
        width +
        parseFloat(margins.marginInlineStart) +
        parseFloat(margins.marginInlineEnd)
      )
    }, 0)
    // Its room within its padding: `px-2`, or `px-1` squeezed or wrapped;
    // either way from its width, the same whatever it is now.
    const each = (padding: number) =>
      items.length > 0
        ? (Math.floor(element.clientWidth - 2 * padding * rem) - buttons) /
          items.length
        : Infinity
    setFit(
      buttons === 0 || each(0.5) >= NARROWEST * rem
        ? "row"
        : each(0.25) >= SQUEEZED * rem
          ? "squeezed"
          : "wrapped"
    )
    setCompact(
      Array.from(items).some((item) => {
        const name = item.querySelector<HTMLElement>(
          "[data-slot=agent-app-rail-label]"
        )
        if (!name) return false
        const style = getComputedStyle(item)
        const room =
          item.clientWidth -
          parseFloat(style.paddingInlineStart) -
          parseFloat(style.paddingInlineEnd)
        return name.scrollWidth > Math.ceil(room)
      })
    )
  }, [])
  React.useLayoutEffect(() => {
    const element = bar.current
    if (!element) return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure])
  // Its areas may change.
  React.useLayoutEffect(() => measure(), [measure, children])
  return (
    <nav
      ref={bar}
      data-slot="agent-app-rail-menu"
      data-compact={compact ? "" : undefined}
      data-wrapped={fit === "wrapped" ? "" : undefined}
      data-squeezed={fit === "squeezed" ? "" : undefined}
      aria-label={label}
      className="group/rail-bar flex shrink-0 flex-wrap items-stretch border-t border-sidebar-border px-2 pt-1 pb-safe-or-2 data-squeezed:px-1 data-wrapped:px-1"
    >
      {children}
    </nav>
  )
}

/**
 * The app's mark at the top of the rail: a letter on the text's colour,
 * 26px in a rail item's place, apart from the areas under it; or the
 * app's own logo as its children, an SVG or an image, in its own colours
 * with no tile under it. An image, named by `label`.
 */
function AgentAppRailBrand({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** The app's name. */
  label: string
}) {
  return (
    <div
      data-slot="agent-app-rail-brand"
      className={cn(
        "mb-2 flex size-8 shrink-0 items-center justify-center",
        className
      )}
      {...props}
    >
      {/* Letters on a filled tile; an image or an SVG is the mark itself,
          in its own colours, with no tile under it. */}
      <div
        role="img"
        aria-label={label}
        className="flex size-6 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background has-[>img,>svg]:bg-transparent has-[>img,>svg]:text-foreground [&>img]:size-full [&>svg]:size-full"
      >
        {children}
      </div>
    </div>
  )
}

/** The rail's last items, at its foot: e.g. "Settings". */
function AgentAppRailFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const mode = React.useContext(ModeContext)
  // In a bar, its items the bar's; a row of its own under the areas
  // where they have no room beside its buttons.
  if (mode === "menu")
    return (
      <div
        data-slot="agent-app-rail-footer"
        className={cn(
          "contents group-data-wrapped/rail-bar:flex group-data-wrapped/rail-bar:basis-full group-data-wrapped/rail-bar:items-center group-data-wrapped/rail-bar:justify-end group-data-wrapped/rail-bar:[&>[data-slot=agent-app-rail-item]]:flex-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  return (
    <div
      data-slot="agent-app-rail-footer"
      className={cn("mt-auto flex flex-col items-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * An area: its icon, its name in a tooltip (under it in a phone's bar,
 * and in the column on a touch screen). A link with `href`, where ⌘, Ctrl or Shift and a click are the
 * browser's, e.g. a new tab; `onClick` is for the rest, e.g. to route.
 */
function AgentAppRailItem({
  icon,
  label,
  current = false,
  pressed,
  href,
  onClick,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "children" | "onClick"> & {
  icon: React.ReactNode
  label: string
  /** The area the reader is in. */
  current?: boolean
  /**
   * A switch, not an area: whether it is on (`aria-pressed`), e.g. the
   * dark theme. Clicked, it leaves a phone's sidebar open, where the
   * reader sees what it changed. Its icon says its state (a moon or a
   * sun); no fill does.
   */
  pressed?: boolean
  href?: string
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
}) {
  const mode = React.useContext(ModeContext)
  const { isMobile, setOpenMobile } = useSidebar()
  const toggle = pressed !== undefined
  const click = (event: React.MouseEvent<HTMLElement>) => {
    if (
      href &&
      (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    )
      return
    onClick?.(event)
    if (isMobile && !toggle) setOpenMobile(false)
  }
  const button = {
    isActive: current,
    "aria-current": current ? ("page" as const) : undefined,
    ...(toggle ? { "aria-pressed": pressed } : {}),
    ...(href ? { render: <a href={href} /> } : {}),
    onClick: click,
    ...props,
  }
  if (mode === "menu")
    return (
      <SidebarMenuButton
        data-slot="agent-app-rail-item"
        className={cn(
          // The current one in the bar is said by its ink, not a fill.
          // 11px from 640px, as the touch rail's names: a sidebar is
          // narrower than a phone's sheet.
          "h-auto min-h-12 min-w-10 flex-1 flex-col justify-center gap-1 px-1 py-1 text-center text-xs text-muted-foreground group-data-squeezed/rail-bar:min-w-7 group-data-wrapped/rail-bar:min-w-7 sm:text-2xs data-active:bg-transparent data-active:text-sidebar-foreground hover:data-active:bg-sidebar-accent [&_svg]:size-5",
          className
        )}
        {...button}
      >
        {icon}
        <span
          data-slot="agent-app-rail-label"
          className="max-w-full group-data-compact/rail-bar:sr-only"
        >
          {label}
        </span>
      </SidebarMenuButton>
    )
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SidebarMenuButton
            data-slot="agent-app-rail-item"
            aria-label={label}
            className={cn(railItem, className)}
            {...button}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent side="inline-end">{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Where a phone's sheet, or a sidebar with `railPlacement="sidebar"`,
 * shows the rail's areas, at the foot of a sidebar of the app's own;
 * nothing where they are a column.
 */
function AgentAppRailMenu() {
  const rail = React.useContext(RailContext)
  const { phone, railInSidebar } = useAgentAppLayout()
  if (!rail || !(phone || railInSidebar)) return null
  return <ModeContext value="menu">{rail}</ModeContext>
}

export {
  AgentAppRail,
  AgentAppRailBrand,
  RailColumn,
  AgentAppRailFooter,
  AgentAppRailItem,
  AgentAppRailMenu,
  RailContext,
  railItem,
  sidebarRow,
}
