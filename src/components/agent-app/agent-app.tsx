"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import type { PanelImperativeHandle } from "react-resizable-panels"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowExpand01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowShrink02Icon,
  Cancel01Icon,
  Menu01Icon,
  SidebarLeftIcon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons"

import { useIsMobile } from "@/hooks/use-mobile"
import { RailColumn, RailContext } from "./agent-app-rail"
import { ProjectName, type AppProject } from "./project-picker"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { useDirection } from "@/components/ui/direction"
import { Sheet, SheetContent, SheetDescription } from "@/components/ui/sheet"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
} from "@/components/ui/drawer"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** The sidebar's width, which its edge changes. */
type SidebarWidth = {
  width: number
  min: number
  max: number
  /** As the reader drags its edge, or by keys. */
  resize: (width: number) => void
  /** The width the reader settled on. */
  commit: (width: number) => void
  /** While its edge is dragged: no transitions, nor text selected. */
  setDragging: (dragging: boolean) => void
}

const SidebarWidthContext = React.createContext<SidebarWidth | null>(null)

/** For an `AgentAppSidebar`'s edge. */
const useSidebarWidth = () => React.useContext(SidebarWidthContext)

/**
 * Whether a click on a link is the browser's: with a modifier key (a new
 * tab or window) or a button other than the main one. The app's
 * `onSelect` is not called for it, so it does not route in place.
 */
function opensElsewhere(event: React.MouseEvent) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

/** A foldable open as a book: two screens side by side. */
const BOOK = "(horizontal-viewport-segments: 2)"
/** A foldable half open as a laptop: a screen over the other. */
const TABLETOP = "(vertical-viewport-segments: 2)"

/**
 * The rail's width: shadcn's `--sidebar-width-icon`, 3rem, on a touch
 * screen too (its 32px items' targets 44px, unseen).
 */
const RAIL_WIDTH = 48
/** The sidebar's width at first; on a touch screen 28px more: rows are larger. */
const SIDEBAR_WIDTH = 240
const TOUCH_SIDEBAR_WIDTH = SIDEBAR_WIDTH + 28

const COARSE = "(pointer: coarse)"

/** Round the main area where it is a card on the sidebar's colour. */
const GUTTER = 16
/** A card's inset from its screen's edges: `m-2`. */
const CARD_INSET = 8

function useMedia(query: string) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    [query]
  )
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** A panel's narrowest: pixels, or a share of the area ("25"). */
type PanelWidth = number | string

/** A sidebar's own buttons, which its rail shows while it is folded. */
type SidebarActions = {
  newConversation?: { label: string; run: () => void }
  search?: { label: string; run: () => void; keys: string }
}

/** How an `AgentApp` lays out at its width. */
type Layout = {
  /** Narrower than 640px: a phone's layout. */
  phone: boolean
  /**
   * From 640px, the sidebar folded to the rail for want of room: a sheet
   * past it, opened by the rail's button.
   */
  folded: boolean
  /**
   * The rail has the sidebar's button, a new conversation and search at
   * its top: where the sidebar is folded. Open, the sidebar has its own,
   * on a touch screen too.
   */
  railControls: boolean
  /** The sidebar's button's name. */
  toggleLabel: string
  sidebarActions: SidebarActions | null
  /** For the sidebar: its buttons, for the rail while it is folded. */
  setSidebarActions: (actions: SidebarActions | null) => void
  /** Open as a book: the main area on one screen, a panel on the other. */
  book: boolean
  /**
   * Open as a book with no panel beside: the sidebar the first screen,
   * open, at its width; the main area the second. No button closes it.
   */
  pinned: boolean
  /**
   * Half open as a laptop is (`vertical-viewport-segments: 2`): where
   * the top screen ends and the bottom one starts, in pixels from the
   * window's top; the composer's dock on the bottom one.
   */
  tabletop: Segments | null
  /** Whether an open panel this narrow has room beside the main area. */
  fitsBeside: (minWidth: PanelWidth) => boolean
  /** The main area's narrowest beside a panel, in pixels. */
  minMainWidth: number
  /**
   * The widest a panel opens to, in pixels, beside a sidebar this wide:
   * the main area keeps its narrowest. `Infinity` while not known.
   */
  panelRoom: (sidebarWidth: number) => number
  /** A panel's, open or not: the sidebar folds for it first. */
  setPanel: (panel: { open: boolean; minWidth: PanelWidth } | null) => void
  /** Whether the sidebar closes while a panel is open beside. */
  foldForPanel: boolean
  /**
   * `railPlacement="sidebar"`: no column at the window's edge; the app's
   * areas a bar at the sidebar's foot, the sidebar's button the header's.
   */
  railInSidebar: boolean
  /** For the sidebar: its variant; inset, the main area is a card on it. */
  setSidebarVariant: (variant: string | null) => void
  /**
   * Folded, the main area a card past the rail on the sidebar's colour;
   * as a book, the main area and the panel each one on its screen.
   */
  cards: boolean
  /**
   * `titlebar`: a bar across the window's top, the sidebar's button in
   * it; the sidebar flat under it, the header's place in it.
   */
  titlebar: boolean
  /** The titlebar's place for the header, once on the page. */
  titlebarSlot: HTMLElement | null
  /** The titlebar's place for the panel's bar, over the panel. */
  titlebarPanelSlot: HTMLElement | null
  /** That place's width, the panel's, in pixels; null, none. */
  setTitlebarPanelWidth: (width: number | null) => void
  /** The panel expanded over the main area: the header's place goes too. */
  setTitlebarCovered: (covered: boolean) => void
}

const LayoutContext = React.createContext<Layout | null>(null)

/** The `AgentApp`'s layout; out of one, by the window's width alone. */
function useAgentAppLayout(): Layout {
  const layout = React.useContext(LayoutContext)
  const phone = useIsMobile()
  return (
    layout ?? {
      phone,
      folded: false,
      railControls: false,
      toggleLabel: "Toggle Sidebar",
      sidebarActions: null,
      setSidebarActions: () => {},
      book: false,
      pinned: false,
      tabletop: null,
      fitsBeside: () => !phone,
      minMainWidth: 0,
      panelRoom: () => Infinity,
      setPanel: () => {},
      foldForPanel: false,
      railInSidebar: false,
      setSidebarVariant: () => {},
      cards: false,
      titlebar: false,
      titlebarSlot: null,
      titlebarPanelSlot: null,
      setTitlebarPanelWidth: () => {},
      setTitlebarCovered: () => {},
    }
  )
}

/**
 * Where the focus in a closing panel goes: the trigger that opened it
 * (the one clicked, or, opened by the app, one on the page), else the
 * main area; none where the focus is elsewhere.
 */
function returnFrom(element: HTMLElement, opener: HTMLElement | null) {
  if (!element.contains(document.activeElement)) return null
  const trigger = opener?.isConnected
    ? opener
    : document.querySelector<HTMLElement>(
        `[aria-controls="${CSS.escape(element.id)}"]`
      )
  return trigger ?? element.closest<HTMLElement>("#agent-app-main")
}

/** A panel's narrowest in pixels, in an area this wide. */
function panelPixels(width: PanelWidth, area: number) {
  return typeof width === "number" ? width : (area * parseFloat(width)) / 100
}

/**
 * A sheet's sidebar closes as it goes back beside the main area: it does
 * not open by itself the next time it folds.
 */
function SheetReset() {
  const { isMobile, setOpenMobile } = useSidebar()
  const was = React.useRef(isMobile)
  React.useEffect(() => {
    if (was.current === isMobile) return
    was.current = isMobile
    setOpenMobile(false)
  }, [isMobile, setOpenMobile])
  return null
}

/** AgentApp's words, for other languages. */
type AgentAppLabels = {
  /** The skip link to the main area. */
  skip: string
  /** The rail's button to the sidebar, where it is folded. */
  toggleSidebar: string
  /** The titlebar's back button. */
  back: string
  /** The titlebar's forward button. */
  forward: string
}

/** One of the titlebar's buttons to go back or forward: the app's. */
type AgentAppTitlebarAction = {
  onClick: () => void
  /** Nowhere to go. */
  disabled?: boolean | undefined
}

/**
 * A bar across the window's top, as a desktop app's: at its start, past
 * the window's own buttons (macOS's, `env(titlebar-area-x)`), back,
 * forward and the sidebar's button, which stay where they are as the
 * sidebar opens and closes; then the header (`AgentAppHeader`'s place
 * and title, and its actions), from the main area's edge. The window is
 * dragged by it, not by its buttons. Where the window has no Window
 * Controls Overlay (a WKWebView's), the app sets the inset of its own
 * buttons and the bar's height on the root:
 * `--agent-app-titlebar-inset`, `--agent-app-titlebar-height`.
 */
type AgentAppTitlebar = {
  back?: AgentAppTitlebarAction | undefined
  forward?: AgentAppTitlebarAction | undefined
}

/**
 * What in the titlebar does not drag the window (`app-region: no-drag`):
 * its controls, and a panel's bar over the panel (its tabs and buttons
 * close together, where Electron, moving from a button onto a dragging
 * region, never tells the page the pointer left: the button stayed lit
 * as if pointed at). A host that drags it itself (WebKit has no
 * `app-region`) does so on a pointerdown in
 * `[data-slot=agent-app-titlebar]` whose target is not in one of these
 * (`target.closest(agentAppTitlebarControls)`).
 */
const agentAppTitlebarControls =
  "button, a, input, select, textarea, [role=button], [tabindex], [data-slot=agent-app-titlebar-panel]"

/** A button of the titlebar's, named in its tooltip. */
function TitlebarButton({
  icon,
  label,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  icon: typeof SidebarLeftIcon
  label: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn("touch-target relative", className)}
            {...props}
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The titlebar, on the window's colour over the card of the sidebar and
 * the main area: its start as wide as the rail and the sidebar beside
 * the main area, so the header starts over their rule, which goes on up
 * through the bar; closed or folded, as wide as its buttons, the header
 * after them, no rule.
 */
function Titlebar({
  titlebar,
  labels,
  railWidth,
  onSlot,
  onPanelSlot,
  panelWidth,
  covered,
}: {
  titlebar: AgentAppTitlebar
  labels: { back: string; forward: string; toggleSidebar: string }
  /** The rail's column before the sidebar, in pixels; 0 with none. */
  railWidth: number
  onSlot: (element: HTMLDivElement | null) => void
  onPanelSlot: (element: HTMLDivElement | null) => void
  /** The panel's, for the place for its bar; null, none open. */
  panelWidth: number | null
  /** The panel expanded over the main area, its header gone with it. */
  covered: boolean
}) {
  const { open, toggleSidebar } = useSidebar()
  const { folded, pinned } = useAgentAppLayout()
  const beside = open && !folded
  return (
    <div
      data-slot="agent-app-titlebar"
      // Its end 8px in, as the card under it.
      className="fixed inset-x-0 top-0 z-20 flex h-(--agent-app-titlebar) bg-frame pe-2"
    >
      <div
        data-slot="agent-app-titlebar-start"
        className={cn(
          "flex shrink-0 items-center gap-0.5 pe-2 text-muted-foreground",
          // The sidebar's rule on up through the bar, one line with it.
          beside && "border-e"
        )}
        style={{
          // Past the window's own buttons, where it has them.
          // Without Window Controls Overlay (a WKWebView's, Tauri's
          // window), the app's inset on the root.
          paddingInlineStart:
            "calc(env(titlebar-area-x, var(--agent-app-titlebar-inset, 0px)) + 0.5rem)",
          ...(beside
            ? { width: `calc(var(--sidebar-width) + ${railWidth}px)` }
            : {}),
        }}
      >
        {titlebar.back && (
          <TitlebarButton
            icon={ArrowLeft01Icon}
            label={labels.back}
            onClick={titlebar.back.onClick}
            disabled={titlebar.back.disabled ?? false}
            className="rtl:-scale-x-100"
          />
        )}
        {titlebar.forward && (
          <TitlebarButton
            icon={ArrowRight01Icon}
            label={labels.forward}
            onClick={titlebar.forward.onClick}
            disabled={titlebar.forward.disabled ?? false}
            className="rtl:-scale-x-100"
          />
        )}
        {/* None as a book's first screen: the sidebar stays open. */}
        {!pinned && (
          <TitlebarButton
            icon={SidebarLeftIcon}
            label={labels.toggleSidebar}
            // No aria-expanded, as shadcn's SidebarTrigger: a ghost button
            // with it is filled, as a menu's open trigger.
            data-sidebar="trigger"
            onClick={toggleSidebar}
          />
        )}
      </div>
      <div
        ref={onSlot}
        data-slot="agent-app-titlebar-header"
        // Its end on the card's inside, past its edge's line: where a
        // panel's bar ends too.
        className={cn(
          "flex min-w-0 flex-1 items-center border-e border-transparent",
          covered && "hidden"
        )}
      />
      {/* Over a panel beside the main area, its bar: as wide as it (set
          by the panel), the line between them on up through the bar. */}
      <div
        ref={onPanelSlot}
        data-slot="agent-app-titlebar-panel"
        // From the line before the panel to the card's edge after it,
        // its inside the panel's own width.
        className="relative flex shrink-0 border-x border-e-transparent empty:hidden"
        style={panelWidth === null ? undefined : { width: panelWidth }}
      />
    </div>
  )
}

/**
 * An agent app's page: its sidebar (an `AgentAppSidebar`), and the main
 * area, the height of the window, for what is open: a header, then a
 * conversation and its composer, or a project's page. A link first in
 * the page skips to the main area. ⌘B or Ctrl+B opens and closes the
 * sidebar. The reader drags the sidebar's edge to make it wider or
 * narrower. An `AgentAppRail` of the app's areas is a column before the
 * sidebar, kept while it is closed.
 *
 * The main area is never narrower than `minMainWidth`: where the window
 * has no room for it beside the sidebar (a tablet, an unfolded phone),
 * the sidebar folds to the rail and opens as a sheet over the page (on a
 * touch screen, first a list and its page while the main area has
 * `minTouchMainWidth`: the sidebar open at its narrowest, the rail still
 * a column); where there is still none beside a panel, the panel is a sheet
 * from the end.
 * Narrower than 640px (Tailwind's `sm`) it is a phone's layout: no rail
 * (its areas are at the sidebar's foot), the panel a sheet from the
 * bottom. A foldable open as a book has the main area on one screen and
 * the panel on the other. Sizes for a finger (44px targets) follow the
 * pointer; the phone's type scale (16px text) follows the width, below
 * 640px. Where the sidebar is `inset` (its default), the main area is a
 * card on the sidebar's colour, right after the rail while it is closed
 * or folded. With `railPlacement="sidebar"` there is no column at any
 * width: the app's areas are a bar at the sidebar's foot, as on a phone,
 * and the folded sidebar a sheet opened by the header's button.
 */
function AgentApp({
  sidebar,
  rail,
  children,
  defaultSidebarWidth,
  minSidebarWidth = 208,
  maxSidebarWidth = 480,
  onSidebarWidthChange,
  minMainWidth = 600,
  minTouchMainWidth = 368,
  foldForPanel = true,
  railPlacement = "column",
  titlebar: titlebarProp,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  labels,
  className,
  style,
  ref,
  ...props
}: Omit<React.ComponentProps<typeof SidebarProvider>, "sheet"> & {
  sidebar: React.ReactNode
  /** An `AgentAppRail`: the app's areas, e.g. chat and files. */
  rail?: React.ReactNode
  /** The sidebar's width at first, in pixels: e.g. the one kept. Default 240, 268 on a touch screen. */
  defaultSidebarWidth?: number
  minSidebarWidth?: number
  maxSidebarWidth?: number
  /** The width the reader drags the sidebar to, in pixels: to keep. */
  onSidebarWidthChange?: (pixels: number) => void
  /**
   * The main area's narrowest, in pixels: with less room, the sidebar
   * folds to a sheet, then a panel goes over the page.
   */
  minMainWidth?: number
  /**
   * On a touch screen (an unfolded phone, a tablet upright) with no room
   * for `minMainWidth` beside the sidebar, the main area as narrow as
   * this beside it, a list and its page: the sidebar open at its
   * narrowest beside the rail, before it folds to the rail; `false` to
   * fold. Default 368: from 640px, beside the rail (48px) and the
   * sidebar at its narrowest (208px), the sidebar always open.
   */
  minTouchMainWidth?: number | false
  /**
   * The sidebar folds to the rail while a panel is open beside the main
   * area, which keeps its room; with `false`, only where it has none.
   */
  foldForPanel?: boolean
  /**
   * Where the app's areas (`rail`) are from 640px: a `column` at the
   * window's edge, kept while the sidebar is closed or folded (with no
   * rail, the folded sidebar's own: its button, a new conversation,
   * search); or in the `sidebar`, a bar at its foot as on a phone, and no
   * column at any width: the folded sidebar a sheet opened by the
   * header's button.
   */
  railPlacement?: "column" | "sidebar"
  /**
   * A bar across the window's top from 640px, for a desktop app's window
   * (`AgentAppTitlebar`); with it the sidebar is flat by default and the
   * header is in the bar. `true` for one with the sidebar's button alone.
   */
  titlebar?: AgentAppTitlebar | boolean | undefined
  labels?: Partial<AgentAppLabels>
}) {
  const main = React.useRef<HTMLElement>(null)
  const coarse = useMedia(COARSE)
  // Until the reader drags it: the default, wider for a finger.
  const [dragged, setWidth] = React.useState<number | null>(null)
  const width =
    dragged ??
    defaultSidebarWidth ??
    (coarse ? TOUCH_SIDEBAR_WIDTH : SIDEBAR_WIDTH)
  const [dragging, setDragging] = React.useState(false)
  const clamp = (pixels: number) =>
    Math.round(Math.min(maxSidebarWidth, Math.max(minSidebarWidth, pixels)))
  const sidebarWidth: SidebarWidth = {
    width: clamp(width),
    min: minSidebarWidth,
    max: maxSidebarWidth,
    resize: (pixels) => setWidth(clamp(pixels)),
    commit: (pixels) => {
      setWidth(clamp(pixels))
      onSidebarWidthChange?.(clamp(pixels))
    },
    setDragging,
  }

  const phone = useIsMobile()
  const book = useMedia(BOOK) && !phone
  const tabletop = useSegments(useMedia(TABLETOP), "y")
  const rtl = useDirection() === "rtl"
  const railWidth = RAIL_WIDTH
  // Its width: none known before it is on the page.
  const [area, setArea] = React.useState<number | null>(null)
  const railInSidebar = railPlacement === "sidebar"
  const columnWidth = !railInSidebar && rail ? railWidth : 0
  // On a touch screen with no room for the main area's narrowest beside
  // the sidebar and the rail: a list and its page, the rail kept a
  // column, while the main area has a touch screen's narrowest.
  const compact =
    !phone &&
    !book &&
    coarse &&
    minTouchMainWidth !== false &&
    area !== null &&
    area - columnWidth - GUTTER - minSidebarWidth < minMainWidth &&
    area - columnWidth - GUTTER - minSidebarWidth >= minTouchMainWidth
  // The app's rail as a column at the window's edge.
  const column = !railInSidebar && rail !== undefined && rail !== null
  const [sidebarActions, setSidebarActions] =
    React.useState<SidebarActions | null>(null)
  const [sidebarVariant, setSidebarVariant] = React.useState<string | null>(
    null
  )
  const observed = React.useCallback(
    (element: HTMLDivElement | null) => {
      if (typeof ref === "function") ref(element)
      else if (ref) ref.current = element
      if (!element) return
      // At once, before the page is drawn; then as it changes.
      setArea(Math.round(element.clientWidth))
      const observer = new ResizeObserver(([entry]) => {
        if (entry) setArea(Math.round(entry.contentRect.width))
      })
      observer.observe(element)
      return () => observer.disconnect()
    },
    [ref]
  )
  const [panel, setPanel] = React.useState<{
    open: boolean
    minWidth: PanelWidth
  } | null>(null)
  // The room the main area has beside the sidebar's width and a panel's,
  // and the rail: the app's, or the sidebar's where it is folded.
  const room = (sidebarWidth: number, panelWidth: number) =>
    area === null
      ? Infinity
      : area -
        (!railInSidebar && (rail || sidebarWidth === 0) ? railWidth : 0) -
        GUTTER -
        sidebarWidth -
        panelWidth
  const fitsBeside = (minWidth: PanelWidth) =>
    !phone &&
    (book || room(0, panelPixels(minWidth, area ?? 0) + 1) >= minMainWidth)
  const panelBeside = panel?.open === true && fitsBeside(panel.minWidth)
  // As a book with no panel open, a list and its page: the sidebar the
  // first screen, open, and the main area the second; nothing over the
  // hinge, the sidebar's end clear of it.
  const screens = useSegments(book)
  const pinned =
    book && !panelBeside && sidebarVariant !== null && screens !== null
  // Inset, past the card's 8px gap on the second screen; flat (under a
  // titlebar), to its edge, the rule between them there.
  const pinnedInset = sidebarVariant === "inset" ? CARD_INSET : 0
  const pinnedWidth =
    pinned && screens && area !== null
      ? (rtl ? area - screens.hinge : screens.start) +
        pinnedInset -
        (column ? railWidth : 0)
      : null
  // Where the main area has not its narrowest beside the sidebar's width,
  // the sidebar is drawn narrower, down to its narrowest (the width the
  // reader dragged it to is kept, for a wider window); folded where it has
  // no room even so, open or not: the reader opens it as a sheet, not to
  // squeeze the main area.
  const besidePanel = panelBeside
    ? panelPixels(panel.minWidth, area ?? 0) + 1
    : 0
  const mainWidth = compact ? minTouchMainWidth : minMainWidth
  const shownWidth = Math.round(
    Math.max(
      minSidebarWidth,
      Math.min(
        clamp(width),
        minSidebarWidth + room(minSidebarWidth, besidePanel) - mainWidth
      )
    )
  )
  const sheet =
    !phone &&
    !pinned &&
    ((book && panel?.open === true) ||
      room(minSidebarWidth, besidePanel) < mainWidth)
  const folded = !phone && sheet
  // Its width as drawn: the context's, for its edge and a panel's room.
  const shown: SidebarWidth = { ...sidebarWidth, width: shownWidth }
  const railControls = folded
  // Folded, the sidebar is a sheet, not the main area's peer: the main
  // area is a card past the rail by itself, on the sidebar's colour; as
  // a book with its panel open, the panel the second screen's card.
  const card = folded && sidebarVariant === "inset"
  const split = book && panelBeside
  const titlebar =
    !phone && titlebarProp !== undefined && titlebarProp !== false
      ? titlebarProp === true
        ? {}
        : titlebarProp
      : null
  const [titlebarSlot, setTitlebarSlot] = React.useState<HTMLElement | null>(
    null
  )
  const [titlebarPanelSlot, setTitlebarPanelSlot] =
    React.useState<HTMLElement | null>(null)
  const [titlebarPanelWidth, setTitlebarPanelWidth] = React.useState<
    number | null
  >(null)
  const [titlebarCovered, setTitlebarCovered] = React.useState(false)
  // Its height, the window's own title bar's where it has one: on the
  // root, for what opens in a portal too (the folded sidebar's sheet).
  const hasTitlebar = titlebar !== null
  React.useLayoutEffect(() => {
    if (!hasTitlebar) return
    const root = document.documentElement.style
    root.setProperty(
      "--agent-app-titlebar",
      "env(titlebar-area-height, var(--agent-app-titlebar-height, 2.5rem))"
    )
    return () => {
      root.removeProperty("--agent-app-titlebar")
    }
  }, [hasTitlebar])
  const layout: Layout = {
    phone,
    folded,
    railControls,
    toggleLabel: labels?.toggleSidebar ?? "Toggle Sidebar",
    sidebarActions,
    setSidebarActions,
    book,
    pinned,
    tabletop,
    fitsBeside,
    minMainWidth,
    panelRoom: (sidebarWidth) => room(sidebarWidth, 0) - minMainWidth,
    setPanel,
    foldForPanel,
    railInSidebar,
    setSidebarVariant,
    cards: card,
    titlebar: titlebar !== null,
    titlebarSlot: titlebar ? titlebarSlot : null,
    titlebarPanelSlot: titlebar ? titlebarPanelSlot : null,
    setTitlebarPanelWidth,
    setTitlebarCovered,
  }

  return (
    <LayoutContext value={layout}>
      <SidebarWidthContext value={shown}>
        <RailContext value={rail}>
          <SidebarProvider
            ref={observed}
            data-slot="agent-app"
            data-phone={phone ? "" : undefined}
            data-inset={card ? "" : undefined}
            data-resizing={dragging ? "" : undefined}
            data-titlebar={titlebar ? "" : undefined}
            data-pinned={pinned ? "" : undefined}
            defaultOpen={defaultOpen}
            {...(pinned
              ? { open: true }
              : openProp !== undefined
                ? { open: openProp }
                : {})}
            {...(onOpenChange ? { onOpenChange } : {})}
            sheet={sheet}
            style={
              {
                "--sidebar-width": `${pinnedWidth ?? shown.width}px`,
                ...(pinned && screens
                  ? {
                      // Its rows 8px short of the hinge: inset, its own 8px
                      // gone; flat, its rows are 8px in already.
                      "--agent-app-pinned-end": `${screens.start - screens.hinge + 2 * pinnedInset}px`,
                    }
                  : {}),
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "h-svh min-h-0 overflow-hidden data-resizing:cursor-ew-resize data-resizing:select-none data-resizing:**:transition-none",
              card && "bg-sidebar",
              // Pinned as a book's first screen: its rows clear of the hinge
              // and of the second screen's edge it reaches.
              "data-pinned:[&>[data-slot=sidebar]>[data-slot=sidebar-container]]:pe-(--agent-app-pinned-end)",
              // After a rail: the sidebar, fixed at the window's edge, moved
              // past it; closed, it is under it.
              column &&
                "sm:[&>[data-slot=sidebar][data-side=left]>[data-slot=sidebar-container]]:ms-(--sidebar-width-icon)",
              // Under the titlebar, on the window's colour (`frame`): the
              // rail, and a card of the sidebar and the main area, both on
              // the page's colour, its corner rounded, a rule between them.
              titlebar &&
                "bg-frame pt-(--agent-app-titlebar) [&>[data-slot=sidebar]_[data-slot=sidebar-inner]]:rounded-ss-xl [&>[data-slot=sidebar]_[data-slot=sidebar-inner]]:bg-background [&>[data-slot=sidebar]>[data-slot=sidebar-container]]:top-(--agent-app-titlebar) [&>[data-slot=sidebar]>[data-slot=sidebar-container]]:h-auto [&>[data-slot=sidebar]>[data-slot=sidebar-container]]:rounded-ss-xl [&>[data-slot=sidebar]>[data-slot=sidebar-container]]:border-s [&>[data-slot=sidebar]>[data-slot=sidebar-container]]:border-t",
              // The card 8px from the window's end and foot, its corners
              // there rounded too, as the main area's card without one.
              titlebar &&
                !split &&
                "pe-2 pb-2 [&>[data-slot=sidebar]_[data-slot=sidebar-inner]]:rounded-es-xl [&>[data-slot=sidebar]>[data-slot=sidebar-container]]:bottom-2 [&>[data-slot=sidebar]>[data-slot=sidebar-container]]:rounded-es-xl [&>[data-slot=sidebar]>[data-slot=sidebar-container]]:border-b",
              className
            )}
            {...props}
          >
            <a
              href="#agent-app-main"
              data-slot="agent-app-skip-link"
              onClick={(event) => {
                // Not by the address: the app may route by it.
                event.preventDefault()
                main.current?.focus()
              }}
              className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm shadow-float focus:not-sr-only focus:fixed focus:start-2 focus:top-2"
            >
              {labels?.skip ?? "Skip to main content"}
            </a>
            {titlebar && (
              <Titlebar
                titlebar={titlebar}
                labels={{
                  back: labels?.back ?? "Back",
                  forward: labels?.forward ?? "Forward",
                  toggleSidebar: labels?.toggleSidebar ?? "Toggle Sidebar",
                }}
                railWidth={column ? railWidth : 0}
                onSlot={setTitlebarSlot}
                onPanelSlot={setTitlebarPanelSlot}
                panelWidth={titlebarPanelWidth}
                covered={titlebarCovered}
              />
            )}
            <SheetReset />
            {/* The column at the start edge from 640px wide: the app's
                rail, or, folded, the sidebar's own. */}
            {!railInSidebar && (rail ?? (folded && <RailColumn />))}
            {sidebar}
            <SidebarInset
              ref={main}
              id="agent-app-main"
              tabIndex={-1}
              // Floating on the sidebar's colour, with a hairline: in the dark
              // too, where a shadow alone does not show its edge.
              className={cn(
                "min-h-0 min-w-0 overflow-hidden outline-none sm:peer-data-[variant=inset]:shadow-float",
                // Past the rail, the rail's edge is the card's gap, as the
                // open sidebar's is.
                column &&
                  "sm:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0",
                card && !split && "m-2 rounded-xl shadow-float",
                card && !split && !railInSidebar && "ms-0",
                // As a book, the panels are the cards, one on each screen.
                card && split && "bg-transparent",
                // The titlebar's card, its edge; alone in it, its corner.
                titlebar && "border-t",
                titlebar && !split && "rounded-e-xl border-e border-b",
                titlebar &&
                  (folded
                    ? "rounded-s-xl border-s"
                    : "peer-data-[state=collapsed]:rounded-s-xl peer-data-[state=collapsed]:border-s")
              )}
            >
              {children}
            </SidebarInset>
          </SidebarProvider>
        </RailContext>
      </SidebarWidthContext>
    </LayoutContext>
  )
}

/** AgentAppHeader's words, for other languages. */
type AgentAppHeaderLabels = {
  toggleSidebar: string
  /** Where the reader is, the path's landmark: "Breadcrumb". */
  breadcrumb: string
}

/**
 * The main area's header: the sidebar's button, then where the reader is,
 * "agentui / Fix the slow deploy", the project's directory in its
 * tooltip and a link to its page; then the app's actions.
 */
function AgentAppHeader({
  project,
  title,
  projectHref,
  onProjectSelect,
  actions,
  labels,
  className,
  ...props
}: Omit<React.ComponentProps<"header">, "title"> & {
  /** The project of what is open, if any. */
  project?: AppProject
  /**
   * What is open: the conversation's title, as the page's heading (h1);
   * none on a page with its own, as `AgentAppPage`.
   */
  title?: React.ReactNode
  /** The project page's address, to make its name a link. */
  projectHref?: string
  /**
   * On going to the project's page; e.g. `event.preventDefault()`. Not
   * for a click that opens its address elsewhere (⌘ or Ctrl, a new tab).
   */
  onProjectSelect?: (event: React.MouseEvent) => void
  /** The app's buttons, e.g. to open a side panel. */
  actions?: React.ReactNode
  labels?: Partial<AgentAppHeaderLabels>
}) {
  const linked = projectHref !== undefined || onProjectSelect !== undefined
  const { toggleSidebar } = useSidebar()
  const {
    phone,
    folded,
    railControls,
    railInSidebar,
    titlebar,
    titlebarSlot,
    pinned,
  } = useAgentAppLayout()
  const { open } = useSidebar()
  // The sidebar beside it names the project, and the rail has its button.
  const beside = railControls && !folded && open && !railInSidebar
  const projectLink =
    linked && title !== undefined ? (
      <BreadcrumbLink
        render={
          projectHref !== undefined ? (
            <a href={projectHref} />
          ) : (
            <button type="button" />
          )
        }
        onClick={(event) => {
          if (projectHref !== undefined && opensElsewhere(event)) return
          onProjectSelect?.(event)
        }}
      />
    ) : undefined

  if (phone)
    // On a phone: the sidebar's button, what is open in the middle, its
    // project under it, and the app's actions; each a finger's size.
    return (
      <header
        data-slot="agent-app-header"
        data-mobile=""
        className={cn(
          "grid h-12 shrink-0 grid-cols-[minmax(2.5rem,auto)_minmax(0,1fr)_minmax(2.5rem,auto)] items-center gap-0.5 px-1",
          className
        )}
        {...props}
      >
        <Button
          variant="ghost"
          size="icon-lg"
          data-sidebar="trigger"
          aria-label={labels?.toggleSidebar ?? "Toggle Sidebar"}
          onClick={toggleSidebar}
          className="size-10 text-muted-foreground"
        >
          <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
        </Button>
        <div className="flex min-w-0 flex-col items-center text-center">
          {title !== undefined ? (
            <h1 className="max-w-full truncate text-md/5 font-semibold">
              {title}
            </h1>
          ) : (
            project && (
              <ProjectName
                project={project}
                className="max-w-full text-md/5 font-semibold"
              />
            )
          )}
          {project && !beside && title !== undefined && (
            <ProjectName
              project={project}
              render={projectLink}
              icon={false}
              className="touch-target relative max-w-full text-xs/4 text-subtle-foreground"
            />
          )}
        </div>
        <div
          data-slot="agent-app-header-actions"
          className="flex shrink-0 items-center justify-end text-muted-foreground [&>button]:h-10 [&>button]:min-w-10"
        >
          {actions}
        </div>
      </header>
    )

  const header = (
    <header
      data-slot="agent-app-header"
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 transition-[width,height] motion-size pointer-coarse:h-13",
        // In the titlebar: as tall as it.
        titlebar && "h-full min-w-0 flex-1",
        className
      )}
      {...props}
    >
      {/* As shadcn's dashboard-01 header, 48px (52px to a finger): the sidebar's button, a
          rule, the place, 8px apart. */}
      <div className="flex w-full min-w-0 items-center gap-2 ps-3 pe-3 pointer-coarse:pe-1">
        {/* Folded, the sidebar's button is the rail's, if it has one; the
            titlebar's, where there is one; none as a book's first screen. */}
        {!titlebar && !pinned && (!railControls || railInSidebar) && (
          <>
            <SidebarTrigger
              className="touch-target relative text-muted-foreground"
              aria-label={labels?.toggleSidebar ?? "Toggle Sidebar"}
            />
            <Separator
              orientation="vertical"
              className="h-4 data-vertical:self-auto"
            />
          </>
        )}
        {/* None with nothing in it: no empty landmark. */}
        {((project && !beside) || title !== undefined) && (
          <Breadcrumb
            aria-label={labels?.breadcrumb ?? "Breadcrumb"}
            className="min-w-0 flex-1"
          >
            {/* Where it is from in a muted grey (4.5:1 on the titlebar's
              frame too), what is open in the text's, a step bolder. */}
            <BreadcrumbList className="flex-nowrap gap-2 text-2sm text-muted-foreground">
              {project && !beside && (
                <BreadcrumbItem className="min-w-0">
                  <ProjectName
                    project={project}
                    icon={false}
                    // A finger's place, where it is a link.
                    {...(projectLink
                      ? { className: "relative touch-target" }
                      : {})}
                    render={
                      projectLink ??
                      (title === undefined ? (
                        // Its own page.
                        <BreadcrumbPage />
                      ) : undefined)
                    }
                  />
                </BreadcrumbItem>
              )}
              {project && !beside && title !== undefined && (
                // A slash, as a path reads: "agentui / Fix the slow deploy".
                <BreadcrumbSeparator className="opacity-60">
                  /
                </BreadcrumbSeparator>
              )}
              {title !== undefined && (
                <BreadcrumbItem className="min-w-0">
                  {/* The page's heading: a conversation has no other. */}
                  <h1 className="truncate">
                    {typeof title === "string" || typeof title === "number" ? (
                      <BreadcrumbPage className="font-medium">
                        {title}
                      </BreadcrumbPage>
                    ) : (
                      // A node, e.g. a path with links back in it: the
                      // current page, not a disabled link around them.
                      <span
                        data-slot="breadcrumb-page"
                        aria-current="page"
                        className="font-medium text-foreground"
                      >
                        {title}
                      </span>
                    )}
                  </h1>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        {actions && (
          // Under a finger, each a 44px button, side by side, 4px from the
          // end: a pressed one's fill as large as its target.
          <div
            data-slot="agent-app-header-actions"
            className="ms-auto flex shrink-0 items-center gap-1 text-muted-foreground pointer-coarse:gap-0 pointer-coarse:[&>button]:size-11"
          >
            {actions}
          </div>
        )}
      </div>
    </header>
  )
  // In the titlebar, where there is one: none in the main area.
  if (titlebar) return titlebarSlot ? createPortal(header, titlebarSlot) : null
  return header
}

/**
 * The conversation's column in the main area, on the grid (docs/grid.md):
 * 12 columns of 48px, 16 apart (752px), 16px each side (784px),
 * centred; where the area is narrower, the columns narrower. What is in
 * it spans them (`w-span-6`, `max-w-span-9`). For the messages (e.g. `render={<MessageScrollerContent />}`)
 * and, in an `AgentAppDock`, the composer, so the two line up.
 */
function AgentAppColumn({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    render,
    props: {
      "data-slot": "agent-app-column",
      className: cn("mx-auto w-full max-w-column px-4", className),
      ...props,
    },
  })
}

/**
 * The composer's place at the main area's foot, under the conversation:
 * in an `AgentAppColumn`, 24px from the bottom, the messages fading out
 * above it as they scroll under. On a phone, nearer the screen's edges
 * and clear of its home indicator (the safe area). On a foldable half
 * open as a laptop (tabletop), the bottom screen, the composer at its
 * top as a keyboard under the screen: the conversation on the top one.
 */
function AgentAppDock({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<"div">) {
  const { tabletop } = useAgentAppLayout()
  const [foot, setFoot] = React.useState<number | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)
  // Its foot, the main area's: from the hinge to it is the bottom screen.
  React.useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!tabletop || !parent) return setFoot(null)
    const measure = () => setFoot(parent.getBoundingClientRect().bottom)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [tabletop])
  const bottomScreen =
    tabletop && foot !== null && foot > tabletop.start
      ? {
          minHeight: foot - tabletop.hinge,
          paddingTop: tabletop.start - tabletop.hinge,
        }
      : null
  return (
    <div
      ref={ref}
      data-slot="agent-app-dock"
      data-tabletop={bottomScreen ? "" : undefined}
      className={cn(
        "relative shrink-0 pb-6 group-data-phone/sidebar-wrapper:pt-2 group-data-phone/sidebar-wrapper:pb-safe-or-2 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-12 before:bg-linear-to-b before:from-transparent before:to-background",
        className
      )}
      style={bottomScreen ? { ...bottomScreen, ...style } : style}
      {...props}
    >
      {/* On the bottom screen, 12px under the hinge. */}
      <AgentAppColumn className="group-data-phone/sidebar-wrapper:px-2 in-data-tabletop:pt-3">
        {children}
      </AgentAppColumn>
    </div>
  )
}

/**
 * A new conversation's page: its composer (and what the app puts over
 * it: a notice, a setup alert) already where the conversation's will be,
 * in an `AgentAppDock`, so sending the first message moves nothing; over
 * it, centred in the room left, what to ask, a heading 22px and semibold
 * (and a line under it, if the app has one). Where the window is short,
 * the heading's room shrinks and scrolls before the composer is pushed
 * off. The header has no other heading for it than its title ("New
 * chat").
 */
function AgentAppStart({
  title,
  description,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  /** "What should we work on?" */
  title: React.ReactNode
  /** Under the heading, centred and muted, one block with it. */
  description?: React.ReactNode
}) {
  return (
    <div
      data-slot="agent-app-start"
      className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", className)}
      {...props}
    >
      {/* Centred by its margins, not justify-center: shorter than its
          heading, it scrolls from the heading's top. */}
      <div
        data-slot="agent-app-start-room"
        className="flex min-h-0 flex-1 scrollbar-thin flex-col overflow-y-auto py-6"
      >
        <AgentAppColumn className="my-auto group-data-phone/sidebar-wrapper:px-2">
          {description ? (
            <div
              data-slot="agent-app-start-heading"
              className="flex flex-col gap-2 text-center"
            >
              <h2 className="text-display font-medium">{title}</h2>
              <p className="text-sm text-pretty text-muted-foreground">
                {description}
              </p>
            </div>
          ) : (
            <h2 className="text-center text-display font-medium">{title}</h2>
          )}
        </AgentAppColumn>
      </div>
      <AgentAppDock className="before:hidden">
        <div className="flex flex-col gap-6">{children}</div>
      </AgentAppDock>
    </div>
  )
}

/** Where an open panel is: beside the main area, or a sheet over it. */
type PanelPlace = "beside" | "sheet" | "drawer"

type PanelState = {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string
  title: string
  /** The close button's name. */
  close: string
  /** Keeps the trigger that last opened or closed it: focus goes back to it. */
  setOpener: (trigger: HTMLElement) => void
  /** It takes the whole area, the main area hidden: only beside it. */
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  /** Its expand button's names. */
  expand: string
  collapse: string
  place: PanelPlace
  /**
   * Beside the main area under a titlebar: the titlebar's place over the
   * panel, for its bar (`useAgentAppPanelBar`).
   */
  bar: HTMLElement | null
}

const PanelContext = React.createContext<PanelState | null>(null)

/**
 * Where a foldable's screens meet: the first's end and the second's
 * start, in pixels from the window's left (as a book) or top (tabletop).
 */
type Segments = { hinge: number; start: number }

/**
 * The first screen's end and the second's start, from the browser's
 * screens (`window.viewport.segments`); at the window's middle where it
 * has none to tell (Firefox, Safari).
 */
function readSegments(axis: "x" | "y") {
  const segments = (
    window as { viewport?: { segments?: readonly DOMRectReadOnly[] } }
  ).viewport?.segments
  const [first, second] = segments ?? []
  if (segments?.length === 2 && first && second)
    return axis === "x"
      ? `${Math.round(first.right)} ${Math.round(second.left)}`
      : `${Math.round(first.bottom)} ${Math.round(second.top)}`
  const middle = Math.round(
    (axis === "x" ? window.innerWidth : window.innerHeight) / 2
  )
  return `${middle} ${middle}`
}

function onResize(onChange: () => void) {
  window.addEventListener("resize", onChange)
  return () => window.removeEventListener("resize", onChange)
}

/** The screens' edges, while the app is open as a book or tabletop. */
function useSegments(folded: boolean, axis: "x" | "y" = "x"): Segments | null {
  const read = React.useSyncExternalStore(
    folded ? onResize : noChange,
    () => (folded ? readSegments(axis) : ""),
    () => ""
  )
  return React.useMemo(() => {
    if (!read) return null
    const [hinge = 0, start = 0] = read.split(" ").map(Number)
    return { hinge, start }
  }, [read])
}

const noChange = () => () => {}

/** AgentAppPanels' words, for other languages. */
type AgentAppPanelsLabels = {
  close: string
  /** Its edge, which the reader drags: by default its title. */
  resize: string
  /** `AgentAppPanelExpand`'s, as it takes the whole area and back. */
  expand: string
  collapse: string
}

/**
 * The main area beside a panel of the app's, e.g. a conversation's files:
 * on its end, as wide as the reader drags it, with its title and a close
 * button. Where the main area would be narrower than the `AgentApp`'s
 * `minMainWidth` beside it, the panel is a sheet over the page from the
 * end; on a phone, a sheet from the bottom; on a foldable open as a book,
 * the screen after the main area's. The app opens it, by an
 * `AgentAppPanelTrigger` in the header or by itself (a file the agent
 * wrote), and keeps whether it is open.
 */
function AgentAppPanels({
  children,
  panel,
  title,
  description,
  actions,
  open,
  onOpenChange,
  defaultSize = "40",
  minSize = 280,
  onSizeChange,
  bar: barProp = true,
  labels,
}: {
  /** The main area: its header and what is open. */
  children: React.ReactNode
  /** The panel's content. */
  panel: React.ReactNode
  /** The panel's name: "Files". */
  title: string
  /** In a sheet, under its bar, what it is about (read out only without one). */
  description?: React.ReactNode
  /** The app's buttons in the panel's bar, before its close button. */
  actions?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Its width as it opens: a share of the area ("40") or pixels, e.g. the
   * one kept from `onSizeChange`. Changed while it is open, it waits for
   * the next time.
   */
  defaultSize?: number | string
  /** Its narrowest: pixels (280) or a share ("25"). */
  minSize?: number | string
  /**
   * Its width as the reader changes it, in pixels: to keep, and give back
   * as `defaultSize` next time.
   */
  onSizeChange?: (pixels: number) => void
  /**
   * Its bar: its title, `actions` and a close button. Without it the
   * panel's content has its own, e.g. a `Browser`'s, with an
   * `AgentAppPanelClose` in it.
   */
  bar?: boolean
  labels?: Partial<AgentAppPanelsLabels>
}) {
  const layout = useAgentAppLayout()
  const { setPanel } = layout
  const sidebar = useSidebar()
  const sidebarWidth = useSidebarWidth()
  const place: PanelPlace = layout.phone
    ? "drawer"
    : layout.fitsBeside(minSize)
      ? "beside"
      : "sheet"
  // A dialog opened from the panel's content, open as the window narrows
  // and the panel becomes a sheet or a drawer: that waits for it to
  // close. Over it, it would make it inert (not one of its own) and hide it.
  const covering = open && place !== "beside"
  const [wasCovering, setWasCovering] = React.useState(covering)
  const [waiting, setWaiting] = React.useState(false)
  if (wasCovering !== covering) {
    setWasCovering(covering)
    setWaiting(covering && dialogOpen())
  }
  React.useEffect(() => {
    if (!waiting) return
    const observer = new MutationObserver(() => {
      if (!dialogOpen()) setWaiting(false)
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributeFilter: ["data-open"],
    })
    return () => observer.disconnect()
  }, [waiting])
  // The sidebar folds first, for an open panel.
  React.useLayoutEffect(() => {
    setPanel({ open, minWidth: minSize })
  }, [setPanel, open, minSize])
  React.useLayoutEffect(() => () => setPanel(null), [setPanel])
  // Beside the main area, the panel takes the sidebar's room: the sidebar
  // closes to the rail as it opens, and opens again as it closes, unless
  // the reader opened or closed it in between.
  const besideOpen = open && place === "beside" && !layout.book
  const closedFor = React.useRef(false)
  const { open: sidebarOpen, setOpen: setSidebarOpen } = sidebar
  React.useLayoutEffect(() => {
    if (!layout.foldForPanel) return
    if (besideOpen && sidebarOpen) {
      closedFor.current = true
      setSidebarOpen(false)
    } else if (!besideOpen && closedFor.current) {
      closedFor.current = false
      if (!sidebarOpen) setSidebarOpen(true)
    }
    // Only as the panel opens or closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [besideOpen, layout.foldForPanel])
  const wasOpen = React.useRef(sidebarOpen)
  React.useEffect(() => {
    // The reader opened it again beside the panel: theirs from now on.
    if (besideOpen && sidebarOpen && !wasOpen.current) closedFor.current = false
    wasOpen.current = sidebarOpen
  }, [besideOpen, sidebarOpen])
  const segments = useSegments(layout.book && open && place === "beside")
  const end = useDirection() === "rtl" ? "left" : "right"
  const id = React.useId()
  const close = labels?.close ?? "Close"
  const expand = labels?.expand ?? "Expand"
  const collapse = labels?.collapse ?? "Collapse"
  // As wide as it opens, as far as the main area keeps its narrowest
  // beside it, and the sidebar, where it stays (it folds where the two
  // have no room): the reader may drag it wider after.
  // (None where the sidebar closes for the panel.)
  const shown =
    !layout.foldForPanel && !sidebar.isMobile && sidebar.open
      ? (sidebarWidth?.width ?? 0)
      : 0
  const narrowest = panelPixels(minSize, layout.panelRoom(0))
  const room =
    layout.panelRoom(shown) > narrowest
      ? layout.panelRoom(shown)
      : layout.panelRoom(0)
  const size =
    room === Infinity
      ? defaultSize
      : Math.round(
          Math.max(
            panelPixels(minSize, room + layout.minMainWidth),
            Math.min(panelPixels(defaultSize, room + layout.minMainWidth), room)
          )
        )
  // Its width as it opened: the panels would take a new one at once,
  // and lose the reader's. Open at first, once the area's is known.
  const known = room !== Infinity
  // Each opening a panel of its own: the panels keep a set of panels'
  // last layout, in shares of the area, and would open it again at the
  // share it closed at, not at `size`, where the area has changed since.
  // Opened beside by a button, it widens from nothing (see `motion`):
  // its panel starts at nothing for as long as it is there, the panels
  // taking a change of its starting size for a new panel.
  const animates = () =>
    place === "beside" &&
    !layout.book &&
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [opening, setOpening] = React.useState({
    open,
    size,
    known,
    times: 0,
    grows: false,
  })
  if (opening.open !== open || (!opening.known && known))
    setOpening({
      open,
      size,
      known,
      times: opening.times + (open && !opening.open ? 1 : 0),
      grows: open && !opening.open ? animates() : opening.grows,
    })
  const opener = React.useRef<HTMLElement | null>(null)
  // Expanded until it closes.
  const [expandedState, setExpanded] = React.useState(false)
  if (!open && expandedState) setExpanded(false)
  // Beside, over the main area (not on a foldable's own screen); as a
  // sheet or a drawer, over the whole window.
  const expanded =
    expandedState && open && (place !== "beside" || segments === null)
  // Over the main area beside it, which it then takes the place of.
  const over = expanded && place === "beside"
  // Under a titlebar, beside the main area: its bar in the titlebar's
  // row, over it.
  const bar =
    open && place === "beside" && !layout.book ? layout.titlebarPanelSlot : null
  const state = React.useMemo(
    () => ({
      open,
      onOpenChange,
      id,
      title,
      close,
      setOpener: (trigger: HTMLElement) => (opener.current = trigger),
      expanded,
      setExpanded,
      expand,
      collapse,
      place,
      bar,
    }),
    [
      open,
      onOpenChange,
      id,
      title,
      close,
      expanded,
      expand,
      collapse,
      place,
      bar,
    ]
  )
  // Beside, the panel goes as it closes, and the focus in it (its close
  // button's) would fall to the page: back to the trigger that opened
  // it, else to the main area. A sheet gives it back itself; moving
  // between its places, the focus moves with the content.
  const returnTo = React.useRef<HTMLElement | null>(null)
  const asideElement = React.useRef<HTMLElement | null>(null)
  // A trigger on the page, found while open: closed, it no longer says
  // it controls the panel.
  const controller = React.useRef<HTMLElement | null>(null)
  React.useLayoutEffect(() => {
    if (open)
      controller.current = document.querySelector<HTMLElement>(
        `[aria-controls="${CSS.escape(id)}"]`
      )
  })
  const aside = React.useCallback((element: HTMLElement | null) => {
    asideElement.current = element
    if (!element) return
    return () => {
      asideElement.current = null
      // Still on the page, as it goes.
      returnTo.current =
        returnFrom(element, opener.current ?? controller.current) ??
        returnTo.current
    }
  }, [])
  // The titlebar's place for its bar, while it had it.
  const barWas = React.useRef<HTMLElement | null>(null)
  React.useLayoutEffect(() => {
    if (bar) barWas.current = bar
  })
  const { setTitlebarPanelWidth, setTitlebarCovered } = layout
  // Expanded under a titlebar, the header's place over the main area
  // goes with it: the panel's bar takes the row.
  const coversTitlebar = over && bar !== null
  React.useLayoutEffect(() => {
    if (!coversTitlebar) return
    setTitlebarCovered(true)
    return () => setTitlebarCovered(false)
  }, [coversTitlebar, setTitlebarCovered])
  // The titlebar's place as wide as the panel, with the line before it
  // and the card's edge after it.
  React.useLayoutEffect(() => {
    const element = asideElement.current
    if (!bar || !element) return
    // Its lines either side of the panel, at its fractions too.
    const measure = () =>
      setTitlebarPanelWidth(element.getBoundingClientRect().width + 2)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
      setTitlebarPanelWidth(null)
    }
  }, [bar, opening.times, setTitlebarPanelWidth])
  React.useLayoutEffect(() => {
    // Closing beside, it stays a moment as it narrows: the focus leaves
    // it at once.
    const element = asideElement.current
    const inside = !open && !!element?.contains(document.activeElement)
    if (inside)
      returnTo.current = returnFrom(
        element!,
        opener.current ?? controller.current
      )
    const lost =
      inside ||
      !document.activeElement ||
      document.activeElement === document.body
    // Its bar was in the titlebar, the focus there gone with it: to the
    // header's trigger, on the page again (it is not while the bar is
    // there).
    if (!open && barWas.current) {
      barWas.current = null
      if (lost)
        returnTo.current =
          document.querySelector<HTMLElement>(
            `[data-agent-app-panel-trigger="${CSS.escape(id)}"]`
          ) ?? returnTo.current
    }
    const to = returnTo.current
    returnTo.current = null
    if (!open && to?.isConnected && lost) to.focus({ preventScroll: true })
  }, [open, place, id])

  // The panel's content too: rendered once, into an element of its own,
  // which goes where the panel is, beside or in a sheet.
  const [host] = React.useState(() =>
    typeof document === "undefined" ? null : createHost()
  )

  // As a book: the panel the second screen, the main area the first, clear
  // of the hinge between them. On the sidebar's colour, each a card in
  // its screen, 8px in from its edges (the main area's start edge the
  // rail's); else one line between them, at the first screen's end.
  const book =
    segments && typeof window !== "undefined"
      ? {
          panel: Math.max(0, window.innerWidth - segments.start),
          hinge: Math.max(0, segments.start - segments.hinge),
        }
      : null
  const cards = book !== null && layout.cards

  // Beside, opened or closed by a button, it widens from nothing or
  // narrows to it as the main area gives way (not dragged, not as a book,
  // not where motion is reduced): the panels move to their sizes as the
  // theme's motion-size, the panel staying a moment as it closes.
  // Opened, it settles a moment after it stops (see below).
  const [motion, setMotion] = React.useState<
    "opening" | "closing" | "settling" | null
  >(null)
  const moves = motion === "opening" || motion === "closing"
  const [panelWasOpen, setPanelWasOpen] = React.useState(open)
  if (panelWasOpen !== open) {
    setPanelWasOpen(open)
    setMotion(animates() ? (open ? "opening" : "closing") : null)
  }
  const sidePanel = React.useRef<PanelImperativeHandle>(null)
  // While it moves of itself, its sizes are not the reader's: not told
  // the app.
  const moving = React.useRef(false)
  // The opening whose panel has taken its place.
  const placed = React.useRef(-1)
  const sideId = `agent-app-side-panel-${opening.times}`
  React.useLayoutEffect(() => {
    const handle = sidePanel.current
    const element = document.getElementById(sideId)
    if (!moves || !handle || !element) return
    // From where it starts, drawn once.
    moving.current = true
    let moved = false
    const move = () => {
      moved = true
      // Gone from its group by then (the window narrowed past its room,
      // a sheet now): nothing to move, and the group no longer knows it.
      if (!element.isConnected) return
      if (motion === "opening") handle.resize(opening.size)
      else handle.collapse()
    }
    const frame = requestAnimationFrame(move)
    const stop = () => {
      // No frame came (a hidden tab, a busy machine): moved all the same,
      // not left at nothing.
      if (!moved) move()
      setMotion(motion === "opening" ? "settling" : null)
    }
    const done = (event: TransitionEvent) => {
      if (event.target === element) stop()
    }
    element.addEventListener("transitionend", done)
    // Where no transition ends (a hidden tab), it ends all the same.
    const timer = window.setTimeout(stop, 500)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("transitionend", done)
      window.clearTimeout(timer)
    }
  }, [motion, moves, sideId, opening.size])
  // Stood, its sizes are the reader's again, however a hand comes to its
  // handle: once the panels have reported where it stopped (a resize
  // observer's, the next frames).
  React.useEffect(() => {
    if (motion !== "settling") return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        moving.current = false
        setMotion(null)
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [motion])
  const present = open || motion === "closing"

  // Expanded or back beside, the main area narrows to nothing or widens
  // from it as the theme's motion-size, its content as wide as it was,
  // cut, not laid out again; only then gone (or from then back).
  const [taking, setTaking] = React.useState<
    "narrowing" | "returning" | "widening" | null
  >(null)
  const [overWas, setOverWas] = React.useState(over)
  if (overWas !== over) {
    setOverWas(over)
    setTaking(
      animates() && open && motion === null
        ? over
          ? "narrowing"
          : "returning"
        : null
    )
  }
  // The main area's width as it went, for its content as it comes back.
  const mainWidth = React.useRef<number | null>(null)
  const mainId = "agent-app-main-panel"
  React.useLayoutEffect(() => {
    const element = document.getElementById(mainId)
    if (!taking || !element) return
    if (taking === "returning") {
      // Back at nothing for a frame, then to its width.
      const frame = requestAnimationFrame(() => setTaking("widening"))
      return () => cancelAnimationFrame(frame)
    }
    const stop = () => setTaking(null)
    const done = (event: TransitionEvent) => {
      if (event.target === element && event.propertyName === "flex-grow") stop()
    }
    element.addEventListener("transitionend", done)
    // Where no transition ends (a hidden tab), it ends all the same.
    const timer = window.setTimeout(stop, 500)
    return () => {
      element.removeEventListener("transitionend", done)
      window.clearTimeout(timer)
    }
  }, [taking])
  const mainContent = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const content = mainContent.current
    if (!content) return
    if (taking === "narrowing")
      mainWidth.current = content.getBoundingClientRect().width
    content.style.minWidth =
      taking && mainWidth.current ? `${mainWidth.current}px` : ""
  }, [taking])

  // The main area in the same place wherever the panel is: moving it does
  // not render the main area again, and the app's state in it stays.
  return (
    <PanelContext value={state}>
      {present && host && createPortal(panel, host)}
      <ResizablePanelGroup
        // Its panels moving, for whatever waits for them to stand.
        data-panel-motion={
          motion ??
          (taking === null
            ? undefined
            : taking === "narrowing"
              ? "expanding"
              : "collapsing")
        }
        className={cn(
          "min-h-0 flex-1",
          // The panel's own display is inline (flex): the main area's
          // goes only by an important rule, the panel then its whole.
          "*:data-covered:hidden!",
          // Narrowing to nothing, or back at nothing a frame: then widening.
          "*:data-taking:overflow-hidden",
          "*:data-[taking=narrowing]:grow-0! *:data-[taking=returning]:grow-0!",
          "*:data-[taking=narrowing]:transition-[flex-grow] *:data-[taking=widening]:transition-[flex-grow]",
          "*:data-taking:motion-size",
          moves &&
            "*:data-panel:transition-[flex-grow] *:data-panel:motion-size"
        )}
      >
        {/* Hidden, not unmounted, while the panel is expanded: the app's
            state in it stays. */}
        <ResizablePanel
          id={mainId}
          data-covered={(over && taking === null) || undefined}
          data-taking={taking ?? undefined}
          minSize={book ? 0 : 320}
          className={cn(
            cards && "py-2",
            cards && layout.railInSidebar && "ps-2"
          )}
          style={
            book && cards
              ? { paddingInlineEnd: book.hinge + CARD_INSET }
              : undefined
          }
        >
          <div
            className={cn(
              "flex h-full min-w-0 flex-col",
              cards && "overflow-hidden rounded-xl bg-background shadow-float"
            )}
            inert={over}
            ref={mainContent}
            style={
              book && !cards
                ? { paddingInlineEnd: Math.max(0, book.hinge - 1) }
                : {}
            }
          >
            {children}
          </div>
        </ResizablePanel>
        {present && place === "beside" && (
          <>
            {/* The one line between the main area and the panel, in one
                card; fixed at the hinge. */}
            <ResizableHandle
              aria-label={labels?.resize ?? title}
              disabled={book !== null}
              className={over || cards ? "hidden" : undefined}
            />
            <ResizablePanel
              key={opening.times}
              id={sideId}
              panelRef={sidePanel}
              // From or to nothing as a button opens or closes it; never
              // by a drag, which would have to go past nothing.
              collapsible
              collapsedSize={0}
              collapsedThreshold={book ? 0 : minSize}
              // Its width in pixels as the area changes (the sidebar
              // closing for it, the window): the main area takes the rest.
              groupResizeBehavior="preserve-pixel-size"
              defaultSize={book ? book.panel : opening.grows ? 0 : opening.size}
              minSize={book ? book.panel : minSize}
              {...(book ? { maxSize: book.panel } : {})}
              onResize={(size) => {
                // Not as it first takes its place (each opening a panel of
                // its own), nor at the hinge, nor moving of itself.
                const first = placed.current !== opening.times
                placed.current = opening.times
                if (
                  !first &&
                  !book &&
                  !moving.current &&
                  !over &&
                  taking === null
                )
                  onSizeChange?.(Math.round(size.inPixels))
              }}
              className={cards ? "p-2" : undefined}
            >
              <aside
                ref={aside}
                id={id}
                data-slot="agent-app-panel"
                {...(barProp
                  ? { "aria-labelledby": `${id}-title` }
                  : { "aria-label": title })}
                className={cn(
                  "flex h-full min-w-0 flex-col",
                  cards &&
                    "overflow-hidden rounded-xl bg-background shadow-float",
                  // Its content clipped as it moves, not scrolling.
                  moves &&
                    "**:data-[slot=agent-app-panel-content]:overflow-hidden"
                )}
              >
                {barProp &&
                  (bar ? (
                    createPortal(
                      <PanelBar id={`${id}-title`} title={title} titlebar>
                        {actions}
                      </PanelBar>,
                      bar
                    )
                  ) : (
                    <PanelBar id={`${id}-title`} title={title}>
                      {actions}
                    </PanelBar>
                  ))}
                <PanelSlot host={host} panel={panel} />
              </aside>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      {/* Where the main area has no room beside it: a sheet from the end.
          Rendered at any width, closed elsewhere, its content still on the
          page to move there. */}
      <Sheet
        open={open && place === "sheet" && !waiting}
        onOpenChange={(next) => onOpenChange(next)}
      >
        <SheetContent
          id={id}
          side={end}
          showCloseButton={false}
          data-slot="agent-app-panel-sheet"
          data-expanded={expanded || undefined}
          className={cn(
            // On the main area's colour, as the panel beside it: its
            // content made for that, not a popover's lighter one in dark.
            "gap-0 overflow-hidden border-0 bg-background text-foreground data-[side=left]:border-0 data-[side=right]:border-0",
            expanded
              ? // The whole window, clear of its notches and bars.
                "inset-0 h-auto w-auto max-w-none rounded-none pt-safe-or-0 pr-[env(safe-area-inset-right)] pb-safe pl-[env(safe-area-inset-left)] data-[side=left]:w-auto data-[side=right]:w-auto data-[side=left]:sm:max-w-none data-[side=right]:sm:max-w-none"
              : // A card floating over the page, 8px in from its edges,
                // as the main area is a card; under a titlebar, 8px
                // under it, as the folded sidebar's sheet, its buttons
                // in sight.
                "rounded-xl shadow-float data-[side=left]:top-safe-offset-2 data-[side=left]:bottom-2 data-[side=left]:left-2 data-[side=left]:h-auto data-[side=left]:w-112 data-[side=right]:top-safe-offset-2 data-[side=right]:right-2 data-[side=right]:bottom-2 data-[side=right]:h-auto data-[side=right]:w-112 data-[side=left]:sm:max-w-112 data-[side=right]:sm:max-w-112"
          )}
          {...(barProp
            ? { "aria-labelledby": `${id}-side-title` }
            : { "aria-label": title })}
        >
          {barProp && (
            <PanelBar id={`${id}-side-title`} title={title}>
              {actions}
            </PanelBar>
          )}
          {description && (
            <SheetDescription className="sr-only">
              {description}
            </SheetDescription>
          )}
          <PanelSlot
            host={host}
            panel={panel}
            active={open && place === "sheet"}
          />
        </SheetContent>
      </Sheet>
      {/* On a phone, a sheet from the bottom, swiped down to close. */}
      <Drawer
        open={open && place === "drawer" && !waiting}
        onOpenChange={(next) => onOpenChange(next)}
        showSwipeHandle
      >
        {/* Its bar as beside: the same, as tall as a header, or the
            content's own, a close button at its end either way. */}
        <DrawerContent
          id={id}
          data-slot="agent-app-panel-drawer"
          data-expanded={expanded || undefined}
          // On the main area's colour, as beside; expanded, the whole
          // screen, its top clear of the notch.
          className={cn(
            "bg-background text-foreground",
            expanded &&
              "pt-safe-or-0 data-[swipe-direction=down]:rounded-t-none data-[swipe-direction=down]:border-t-0"
          )}
          style={
            {
              // Nearly the screen's height: the page shows above it.
              "--drawer-height": expanded ? "100dvh" : "calc(100dvh - 3rem)",
              "--drawer-content-max-height": expanded
                ? "100dvh"
                : "calc(100dvh - 3rem)",
            } as React.CSSProperties
          }
          {...(barProp
            ? { "aria-labelledby": `${id}-sheet-title` }
            : { "aria-label": title })}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            {barProp && (
              <PanelBar id={`${id}-sheet-title`} title={title} phone>
                {actions}
              </PanelBar>
            )}
            {description && (
              <DrawerDescription
                className={cn("px-4 pt-3", !barProp && "sr-only")}
              >
                {description}
              </DrawerDescription>
            )}
            <PanelSlot
              host={host}
              panel={panel}
              active={open && place === "drawer"}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </PanelContext>
  )
}

/** Whether a dialog, a sheet or a drawer is open on the page. */
function dialogOpen() {
  return (
    typeof document !== "undefined" &&
    document.querySelector(
      ":is([data-slot=dialog-content], [data-slot=alert-dialog-content], [data-slot=sheet-content], [data-slot=drawer-content])[data-open]"
    ) !== null
  )
}

function createHost() {
  const host = document.createElement("div")
  host.dataset.slot = "agent-app-panel-content"
  host.className = "min-h-0 flex-1 overflow-y-auto"
  return host
}

/** Where a panel's content is kept between its places: on the page. */
let parking: HTMLElement | null = null

/** Moves an element, keeping its state (a frame's page) where it can. */
function move(element: HTMLElement, into: HTMLElement) {
  const keeping = into as HTMLElement & {
    moveBefore?: (node: Node, child: Node | null) => void
  }
  if (keeping.moveBefore && element.isConnected && into.isConnected) {
    try {
      keeping.moveBefore(element, null)
      return
    } catch {
      // Not movable so: appended.
    }
  }
  into.appendChild(element)
}

/**
 * The panel's place, beside the main area or in a sheet: its content's
 * element goes in it while it is the panel's, and out to wait while it
 * moves to the other. A closing sheet stays on the page a while: when it
 * is the panel's place again before it has gone, it takes the content
 * back.
 */
function PanelSlot({
  host,
  panel,
  active = true,
}: {
  host: HTMLElement | null
  panel: React.ReactNode
  /** Whether it is the panel's place now. */
  active?: boolean
}) {
  const slot = React.useRef<HTMLDivElement | null>(null)
  // Not again as it renders: only as it mounts and goes.
  const place = React.useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || !host) return
      slot.current = element
      return () => {
        slot.current = null
        if (!parking) {
          parking = document.createElement("div")
          parking.hidden = true
          parking.dataset.slot = "agent-app-panel-parking"
          document.body.append(parking)
        }
        if (host.parentElement === element) move(host, parking)
      }
    },
    [host]
  )
  // As it mounts as the place, or becomes it again: after the other has
  // let it go.
  React.useLayoutEffect(() => {
    const element = slot.current
    if (active && host && element && host.parentElement !== element)
      move(host, element)
  }, [active, host])
  if (!host)
    return <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
  return <div className="contents" ref={place} />
}

/**
 * Opens and closes the panel of the `AgentAppPanels` it is in: for the
 * header's `actions`. Named by the panel's title, expanded while open.
 * While the panel's bar is in a titlebar, it is not: the bar's
 * `AgentAppPanelClose` is the same button at the window's end.
 */
function AgentAppPanelTrigger({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const panel = React.useContext(PanelContext)
  // Its bar in the titlebar, the bar's close button is it, at the same
  // place: the window's end.
  if (!panel || panel.bar) return null
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            data-agent-app-panel-trigger={panel.id}
            aria-label={panel.title}
            aria-expanded={panel.open}
            aria-controls={panel.open ? panel.id : undefined}
            onClick={(event) => {
              panel.setOpener(event.currentTarget)
              panel.onOpenChange(!panel.open)
            }}
            {...props}
            className={cn("touch-target relative", props.className)}
          />
        }
      >
        {children ?? <HugeiconsIcon icon={SidebarRightIcon} strokeWidth={2} />}
      </TooltipTrigger>
      <TooltipContent>{panel.title}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The panel's bar, beside the main area or in its sheet: as tall as the
 * main area's header, level with it, or the titlebar's row over it; its
 * title, the app's buttons and a close button.
 */
function PanelBar({
  id,
  title,
  phone = false,
  titlebar = false,
  children,
}: {
  id: string
  title: string
  /** In a phone's sheet, under its handle. */
  phone?: boolean
  /** In the titlebar's row, as tall as it. */
  titlebar?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 ps-4 pe-2",
        // In the titlebar, its end the header's: 12px in.
        titlebar
          ? "h-full flex-1 pe-3"
          : phone
            ? "h-12"
            : "h-12 pointer-coarse:h-13 pointer-coarse:pe-1"
      )}
    >
      <h2 id={id} className="min-w-0 flex-1 truncate text-sm font-medium">
        {title}
      </h2>
      {children}
      <AgentAppPanelClose />
    </div>
  )
}

/**
 * Beside the main area under an `AgentApp`'s titlebar, the titlebar's
 * place over the panel, for a bar of the panel's content's own (a
 * `Browser`'s `barContainer`): its bar is then in the titlebar's row, not
 * a row of its own under it. Else null: the bar in the panel.
 */
function useAgentAppPanelBar(): HTMLElement | null {
  return React.useContext(PanelContext)?.bar ?? null
}

/**
 * Expands the panel of the `AgentAppPanels` it is in, and back: for its
 * bar's actions. Beside the main area, over it, the main area narrowing
 * to nothing as it widens (and back); as a sheet or a phone's
 * drawer, over the whole window, clear of its safe areas. None beside on
 * a foldable's own screen.
 */
function AgentAppPanelExpand(props: React.ComponentProps<typeof Button>) {
  const panel = React.useContext(PanelContext)
  const { book } = useAgentAppLayout()
  if (!panel || (panel.place === "beside" && book)) return null
  const label = panel.expanded ? panel.collapse : panel.expand
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={() => panel.setExpanded(!panel.expanded)}
            {...props}
            className={cn(
              "touch-target relative pointer-coarse:size-11",
              props.className
            )}
          />
        }
      >
        {panel.expanded ? (
          <HugeiconsIcon icon={ArrowShrink02Icon} strokeWidth={2} />
        ) : (
          <HugeiconsIcon icon={ArrowExpand01Icon} strokeWidth={2} />
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Closes the panel of the `AgentAppPanels` it is in: for a bar of the
 * panel's content's own (`bar={false}`), beside or in the sheet. With the
 * bar in a titlebar, the header's `AgentAppPanelTrigger` in its place at
 * the window's end: its icon, its name, expanded.
 */
function AgentAppPanelClose(props: React.ComponentProps<typeof Button>) {
  const panel = React.useContext(PanelContext)
  if (!panel) return null
  if (panel.bar)
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={panel.title}
              aria-expanded
              aria-controls={panel.id}
              onClick={() => panel.onOpenChange(false)}
              {...props}
              className={cn("touch-target relative", props.className)}
            />
          }
        >
          <HugeiconsIcon icon={SidebarRightIcon} strokeWidth={2} />
        </TooltipTrigger>
        <TooltipContent>{panel.title}</TooltipContent>
      </Tooltip>
    )
  return (
    <Button
      variant="ghost"
      // The phone's sheet's bar is a header's, its buttons as large.
      size={panel.place === "drawer" ? "icon-lg" : "icon-sm"}
      aria-label={panel.close}
      onClick={() => panel.onOpenChange(false)}
      {...props}
      // Under a finger, 44px, as the header's.
      className={cn(
        "touch-target relative",
        panel.place === "drawer" ? "size-10" : "pointer-coarse:size-11",
        props.className
      )}
    >
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
    </Button>
  )
}

export {
  AgentApp,
  AgentAppColumn,
  AgentAppDock,
  AgentAppHeader,
  AgentAppStart,
  AgentAppPanelClose,
  AgentAppPanelExpand,
  AgentAppPanelTrigger,
  AgentAppPanels,
  type AgentAppHeaderLabels,
  type AgentAppLabels,
  type AgentAppPanelsLabels,
  type AgentAppTitlebar,
  type AgentAppTitlebarAction,
  agentAppTitlebarControls,
  opensElsewhere,
  useAgentAppLayout,
  useAgentAppPanelBar,
  useSidebarWidth,
}
