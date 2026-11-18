"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowExpand01Icon,
  Bug01Icon,
  Camera01Icon,
  Cancel01Icon,
  CursorMagicSelection02Icon,
  Globe02Icon,
  InformationCircleIcon,
  LaptopIcon,
  LinkSquare02Icon,
  Moon02Icon,
  RefreshIcon,
  Robot01Icon,
  SmartPhone01Icon,
  Tablet01Icon,
  WebDesign01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { InputGroupAddon } from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Kbd } from "@/components/ui/kbd"
import { ViewerFilter, ViewerMenu, ViewerTool } from "@/components/viewer"

/** A box on a web page, in its CSS pixels from its viewport's top left. */
type BrowserBox = { x: number; y: number; width: number; height: number }

/** An element of a web page, as the reader points at it. */
type BrowserElement = {
  /** A CSS selector for it: "button.cta-primary". */
  selector: string
  /** Its tag's name: "button". */
  tag?: string | undefined
  box: BrowserBox
  /** Its text, if any, for the app to quote. */
  text?: string | undefined
}

/** How a picked element goes to the chat. */
type BrowserPickOptions = {
  /** The reader asked for its picture with it ("With a screenshot"). */
  screenshot: boolean
}

/** The agent at work in a web page: what it does, and where. */
type BrowserAgent = {
  /** What it is doing: "Clicking “Get started”". */
  action?: string | undefined
  /** Its pointer on the page, and what it does there: "Click". */
  cursor?: { x: number; y: number; label?: string | undefined } | undefined
  /** The element it acts on. */
  target?: BrowserBox | undefined
}

/** A message in a web page's console. */
type BrowserConsoleMessage = {
  id: string
  level: "error" | "warning" | "info" | "log"
  text: string
  /** Where it comes from: "pricing.tsx:41". */
  source?: string | undefined
  /** How many times it came, if more than once. */
  count?: number | undefined
}

/** A request a web page made, for its drawer's Network tab. */
type BrowserNetworkRequest = {
  id: string
  /** "GET", "POST". */
  method: string
  url: string
  /** Its response's status; none while it waits, 0 where it failed. */
  status?: number | undefined
  /** How long it took, in milliseconds. */
  time?: number | undefined
  /** Its response's size, in bytes. */
  size?: number | undefined
}

/** A size of viewport for a web page: the panel's own, or a device's. */
type BrowserDevice = "fill" | "laptop" | "tablet" | "phone"

const deviceSizes: Record<Exclude<BrowserDevice, "fill">, [number, number]> = {
  laptop: [1280, 800],
  tablet: [820, 1180],
  phone: [390, 844],
}

const deviceIcons: Record<BrowserDevice, React.ReactNode> = {
  fill: <HugeiconsIcon icon={ArrowExpand01Icon} strokeWidth={2} />,
  laptop: <HugeiconsIcon icon={LaptopIcon} strokeWidth={2} />,
  tablet: <HugeiconsIcon icon={Tablet01Icon} strokeWidth={2} />,
  phone: <HugeiconsIcon icon={SmartPhone01Icon} strokeWidth={2} />,
}

/** A web page: an address, and its page in a frame or as a picture. */
type BrowserWebContent = {
  type: "web"
  url: string
  /**
   * The frame's sandbox. By default scripts, forms and popups run, as
   * on their own origin; a page from the app's own origin needs a
   * stricter one, without "allow-same-origin".
   */
  sandbox?: string | undefined
  /** The frame's permissions policy, e.g. "clipboard-write". */
  allow?: string | undefined
  /**
   * A picture of the page instead of a frame, e.g. a remote browser's
   * screenshot, as wide as the viewport.
   */
  screenshot?: string | undefined
  /**
   * Whether something serves the address, e.g. the dev server, as a dot
   * in the address bar; `false`: a page saying nothing runs there.
   */
  running?: boolean | undefined
  /**
   * The page could not be loaded: `true`, or why, as the app knows (e.g.
   * "Connection refused", "The server answered 502"). A page saying so,
   * with Retry, in place of the frame; the app clears it on `onReload`.
   * A frame's own failure cannot be read from another origin's page.
   */
  error?: string | true | undefined
  /** While the agent drives the page: it says so, and input waits. */
  agent?: BrowserAgent | undefined
  /** The page's console, for its drawer. */
  console?: BrowserConsoleMessage[] | undefined
  /** The requests it made, in order: the drawer's Network tab. */
  network?: BrowserNetworkRequest[] | undefined
}

/** How the reader looks at a web page, kept by tab. */
type BrowserWebView = {
  device: BrowserDevice
  /** A device's size on its side. */
  rotated: boolean
  /** The frame prefers a dark page. */
  dark: boolean
  /** Pointing at an element. */
  picking: boolean
  /** The console's drawer is open. */
  console: boolean
  /** The drawer's tab shown: the console's messages, or the requests. */
  drawer?: "console" | "network" | undefined
}

const defaultWebView: BrowserWebView = {
  device: "fill",
  rotated: false,
  dark: false,
  picking: false,
  console: false,
}

/** A recent address, for a page where nothing runs. */
type BrowserRecent = {
  address: string
  /** What it is, or when: "Storybook", "2h". */
  meta?: string | undefined
}

type BrowserWebLabels = {
  openExternal: string
  /** The tool that picks an element. */
  pickElement: string
  /** The viewport's menu. */
  viewport: string
  devices: Record<BrowserDevice, string>
  rotate: string
  darkScheme: string
  /** The console's button, with its errors: "Console, 2 errors". */
  console: (errors: number) => string
  closeConsole: string
  /** The drawer's tab of requests, and its list. */
  network: string
  /** The requests' columns' names. */
  requestColumns: Record<"method" | "url" | "status" | "time" | "size", string>
  /** A request still waiting, and one that failed, for its status. */
  pending: string
  failed: string
  noRequests: string
  /** The Network tab's button that reads the requests again. */
  refreshNetwork: string
  /** A request's size: "1.2 KB". */
  bytes: (size: number) => string
  /** How long it took: "120 ms". */
  duration: (milliseconds: number) => string
  /** The console's filter. */
  filter: string
  /** Empties it. */
  clearFilter: string
  noMessages: string
  /** A console message's button, giving it to the agent. */
  askAgent: string
  more: string
  /** The address bar's dot. */
  running: string
  notRunning: string
  /** Over the page while the agent drives it. */
  agentUsing: string
  takeOver: string
  /** The words written about a picked element. */
  request: string
  addToChat: string
  /** A picked element's toggle: its picture goes with the request. */
  withScreenshot: string
  cancel: string
  /** Where nothing runs: "Nothing is running on localhost:5173". */
  nothingRunning: (host: string) => string
  nothingRunningHint: string
  openAnotherAddress: string
  recent: string
  /** A page that did not load: "Could not load localhost:5173". */
  loadFailed: (host: string) => string
  /** Under it, where the app gives no reason. */
  loadFailedHint: string
  /** Loads it again. */
  retry: string
}

const defaultWebLabels: BrowserWebLabels = {
  openExternal: "Open in a new window",
  pickElement: "Point at an element",
  viewport: "Viewport",
  devices: {
    fill: "Fill the panel",
    laptop: "Laptop",
    tablet: "Tablet",
    phone: "Phone",
  },
  rotate: "Rotate",
  darkScheme: "Dark color scheme",
  console: (errors) =>
    errors === 0
      ? "Console"
      : `Console, ${errors} ${errors === 1 ? "error" : "errors"}`,
  closeConsole: "Close console",
  network: "Network",
  requestColumns: {
    method: "Method",
    url: "URL",
    status: "Status",
    time: "Time",
    size: "Size",
  },
  pending: "Pending",
  failed: "Failed",
  noRequests: "No requests",
  refreshNetwork: "Refresh requests",
  bytes: (size) =>
    size < 1024
      ? `${size} B`
      : size < 1024 * 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${(size / 1024 / 1024).toFixed(1)} MB`,
  duration: (milliseconds) =>
    milliseconds < 1000
      ? `${Math.round(milliseconds)} ms`
      : `${(milliseconds / 1000).toFixed(2)} s`,
  filter: "Filter",
  clearFilter: "Clear filter",
  noMessages: "No messages",
  askAgent: "Ask agent",
  more: "More",
  running: "Running",
  notRunning: "Not running",
  agentUsing: "Agent is using the browser",
  takeOver: "Take over",
  request: "Request",
  addToChat: "Add to chat",
  withScreenshot: "With a screenshot",
  cancel: "Cancel",
  nothingRunning: (host) => `Nothing is running on ${host}`,
  nothingRunningHint:
    "Start the server, or ask the agent to. The page opens here when it is up.",
  openAnotherAddress: "Open another address",
  recent: "Recent",
  loadFailed: (host) => `Could not load ${host}`,
  loadFailedHint:
    "Check the address and that the server answers, then try again.",
  retry: "Retry",
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host || url
  } catch {
    return url
  }
}

/** Under a finger, a toolbar's button's place is as wide as one. */
const touch =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-2"

/**
 * The address bar's start: a dot while something serves the address, a
 * ring while nothing does; else the page's icon.
 */
function BrowserAddressStatus({
  running,
  icon,
  labels,
}: {
  running: boolean | undefined
  icon: React.ReactNode
  labels: BrowserWebLabels
}) {
  if (running === undefined) return <InputGroupAddon>{icon}</InputGroupAddon>
  return (
    <InputGroupAddon>
      <span
        role="img"
        aria-label={running ? labels.running : labels.notRunning}
        data-slot="browser-address-status"
        data-running={running ? "" : undefined}
        // grid: mark (a status dot)
        className="mx-1 size-1.5 rounded-full ring-(length:--line-mark) ring-muted-foreground data-running:bg-muted-foreground data-running:ring-3 data-running:ring-muted-foreground/20"
      />
    </InputGroupAddon>
  )
}

/**
 * A web page's tools in its toolbar: pointing at an element, the
 * viewport's size, the console, and more.
 */
function BrowserWebTools({
  content,
  view,
  onViewChange,
  pickable,
  labels,
  children,
}: {
  content: BrowserWebContent
  view: BrowserWebView
  onViewChange: (change: Partial<BrowserWebView>) => void
  /** Elements can be picked: the app takes them. */
  pickable: boolean
  labels: BrowserWebLabels
  /** More of the app's, in the more menu: `DropdownMenuItem`s. */
  children?: React.ReactNode
}) {
  const tools = React.useRef<HTMLSpanElement>(null)
  const [stageWidth, setStageWidth] = React.useState(560)
  React.useLayoutEffect(() => {
    const stage = tools.current
      ?.closest("[data-slot=browser]")
      ?.querySelector("[data-slot=browser-stage]")
    if (!stage) return
    const observer = new ResizeObserver(() =>
      setStageWidth(Math.round(stage.clientWidth))
    )
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])
  const errors =
    content.console?.filter((message) => message.level === "error").length ?? 0
  // Nothing to point at where nothing runs, or it did not load.
  const stopped = content.running === false || content.error !== undefined
  return (
    <>
      <span ref={tools} className="hidden" />
      {pickable && (
        <ViewerTool
          label={labels.pickElement}
          pressed={!!view.picking}
          disabled={stopped}
          onClick={() =>
            onViewChange({ picking: !view.picking, console: false })
          }
        >
          <HugeiconsIcon icon={CursorMagicSelection02Icon} strokeWidth={2} />
        </ViewerTool>
      )}
      <ViewerMenu
        label={labels.viewport}
        contentClassName="w-60"
        onKeyDown={(event) => {
          if (event.key.toLowerCase() !== "r" || view.device === "fill") return
          if (event.metaKey || event.ctrlKey || event.altKey) return
          onViewChange({ rotated: !view.rotated })
        }}
        anchor={() =>
          tools.current?.closest<HTMLElement>("[data-slot=browser-toolbar]") ??
          null
        }
        icon={
          view.device === "fill" ? (
            <HugeiconsIcon icon={LaptopIcon} strokeWidth={2} />
          ) : (
            deviceIcons[view.device]
          )
        }
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.viewport}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={view.device}
            onValueChange={(device) =>
              onViewChange({ device: device as BrowserDevice })
            }
          >
            {(["fill", "laptop", "tablet", "phone"] as const).map((device) => (
              <DropdownMenuRadioItem key={device} value={device} closeOnClick>
                {deviceIcons[device]}
                {labels.devices[device]}
                <DropdownMenuShortcut className="tracking-normal tabular-nums">
                  {device === "fill"
                    ? stageWidth
                    : deviceSizes[device].join(" × ")}
                </DropdownMenuShortcut>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={view.device === "fill"}
          onClick={() => onViewChange({ rotated: !view.rotated })}
        >
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
          {labels.rotate}
          <DropdownMenuShortcut>
            <Kbd>R</Kbd>
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => onViewChange({ dark: !view.dark })}
        >
          <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
          {labels.darkScheme}
          <Switch
            aria-label={labels.darkScheme}
            checked={view.dark}
            size="sm"
            className="ms-auto"
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(dark) => onViewChange({ dark })}
          />
        </DropdownMenuItem>
      </ViewerMenu>
      <ViewerTool
        label={labels.console(errors)}
        disabled={!content.console && !content.network}
        pressed={!!view.console}
        onClick={() => onViewChange({ console: !view.console, picking: false })}
      >
        <HugeiconsIcon icon={Bug01Icon} strokeWidth={2} />
        {errors > 0 && (
          <span
            aria-hidden="true"
            data-slot="browser-console-count"
            // grid: mark (a count on the icon, a glyph's size)
            className="absolute -end-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-1 text-2xs leading-none font-medium text-background tabular-nums"
          >
            {errors}
          </span>
        )}
      </ViewerTool>
      <ViewerMenu label={labels.more}>
        {/* A link, as it is one. */}
        <DropdownMenuItem
          render={<a href={content.url} target="_blank" rel="noreferrer" />}
        >
          <HugeiconsIcon icon={LinkSquare02Icon} strokeWidth={2} />
          {labels.openExternal}
        </DropdownMenuItem>
        {children}
      </ViewerMenu>
    </>
  )
}

/** A CSS selector for an element: its tag, then its id or classes. */
function selectorOf(element: Element) {
  const tag = element.tagName.toLowerCase()
  if (element.id) return `${tag}#${CSS.escape(element.id)}`
  const classes = Array.from(element.classList)
    .slice(0, 2)
    .map((name) => `.${CSS.escape(name)}`)
    .join("")
  return `${tag}${classes}`
}

/** The element at a point of a frame's page, where its document is ours. */
function inspectFrame(
  frame: HTMLIFrameElement | null,
  point: { x: number; y: number }
): BrowserElement | undefined {
  let document: Document | null = null
  try {
    document = frame?.contentDocument ?? null
  } catch {
    // Another origin's.
  }
  if (!document) return undefined
  const element = document.elementFromPoint(point.x, point.y)
  if (!element || element === document.documentElement) return undefined
  if (element === document.body) return undefined
  const box = element.getBoundingClientRect()
  return {
    selector: selectorOf(element),
    tag: element.tagName.toLowerCase(),
    box: { x: box.left, y: box.top, width: box.width, height: box.height },
    text: element.textContent.trim().slice(0, 200) || undefined,
  }
}

const round = (value: number) => Math.round(value)

/** An outline round a box of the page, solid, or dashed while picking. */
function BoxOutline({
  box,
  variant,
  children,
}: {
  box: BrowserBox
  variant: "agent" | "pick"
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="browser-outline"
      data-variant={variant}
      // The agent's on the page, not the app: ink in any theme, a white halo
      // round it for a dark page. The reader's dashes in the app's ink, light
      // in dark, its halo the app's background: seen on a page of either.
      className="pointer-events-none absolute rounded-md data-[variant=agent]:ring-(length:--line-mark) data-[variant=agent]:ring-neutral-900 data-[variant=agent]:outline-2 data-[variant=agent]:outline-offset-2 data-[variant=agent]:outline-white/80 data-[variant=pick]:border-(length:--line-mark) data-[variant=pick]:border-dashed data-[variant=pick]:border-foreground/70 data-[variant=pick]:bg-foreground/5 data-[variant=pick]:outline-1 data-[variant=pick]:outline-background/80"
      style={{
        left: box.x - 4,
        top: box.y - 4,
        width: box.width + 8,
        height: box.height + 8,
      }}
    >
      {children}
    </div>
  )
}

/**
 * A dark chip on the page: what an element is, or what the agent does.
 * Ink in any theme, as the page is its own.
 */
function PageChip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="browser-chip"
      className={cn(
        "pointer-events-none absolute flex h-6 items-center gap-1 rounded-md bg-neutral-900 px-2 text-xs font-medium whitespace-nowrap text-white shadow-sm ring-1 ring-white/70",
        className
      )}
      {...props}
    />
  )
}

/** The agent's pointer on the page, what it does by it. */
function AgentCursor({
  cursor,
}: {
  cursor: NonNullable<BrowserAgent["cursor"]>
}) {
  return (
    <div
      data-slot="browser-agent-cursor"
      className="pointer-events-none absolute z-10 text-neutral-900"
      style={{ left: cursor.x, top: cursor.y }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M2 1.5 L2 14.5 L5.6 11.2 L8.1 16.4 L10.4 15.3 L7.9 10.2 L12.8 10.2 Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      {cursor.label && (
        <PageChip className="start-4 top-4">{cursor.label}</PageChip>
      )}
    </div>
  )
}

/**
 * The page's place: the panel's size, or a device's on a dotted canvas,
 * scaled to fit, with its size at the canvas's bottom. Its child is
 * drawn at the page's own size.
 */
function BrowserStage({
  device,
  rotated,
  children,
}: {
  device: BrowserDevice
  rotated: boolean
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [room, setRoom] = React.useState<{ width: number; height: number }>()
  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(() =>
      setRoom({ width: element.clientWidth, height: element.clientHeight })
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  if (device === "fill")
    return (
      <div
        ref={ref}
        data-slot="browser-stage"
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        {children}
      </div>
    )
  const [deviceWidth, deviceHeight] = deviceSizes[device]
  const [width, height] = rotated
    ? [deviceHeight, deviceWidth]
    : [deviceWidth, deviceHeight]
  // Room round it, and under it for its size.
  const scale = room
    ? Math.max(
        0.1,
        Math.min(1, (room.width - 64) / width, (room.height - 112) / height)
      )
    : 1
  return (
    <div
      ref={ref}
      data-slot="browser-stage"
      data-device={device}
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden bg-muted/50 bg-dot-grid"
    >
      <div
        data-slot="browser-device"
        className="relative shrink-0 rounded-4xl bg-background p-px ring-8 ring-background before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-4xl before:ring-1 before:ring-border after:pointer-events-none after:absolute after:-inset-2 after:rounded-4xl after:ring-1 after:ring-border"
        style={{ width: width * scale, height: height * scale }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-4xl">
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width, height, transform: `scale(${scale})` }}
          >
            {children}
          </div>
        </div>
      </div>
      <span
        data-slot="browser-device-size"
        className="absolute bottom-3 flex h-6 items-center rounded-full bg-background px-3 text-xs text-muted-foreground tabular-nums shadow-float"
      >
        {width} × {height} · {Math.round(scale * 100)}%
      </span>
    </div>
  )
}

/**
 * A web page in the browser: its frame or picture in the panel's size or
 * a device's, the agent at work over it, the reader pointing at an
 * element of it, its console under it; a page saying so where nothing
 * runs at its address.
 */
function BrowserWebPage({
  title,
  location,
  content,
  view,
  onViewChange,
  inspectElement,
  onPickElement,
  onTakeOver,
  onAskAgent,
  onRefreshNetwork,
  notRunningActions,
  recent,
  onOpenAddress,
  onOtherAddress,
  onRetry,
  labels,
}: {
  title: string
  /**
   * Where it is, as its address bar says, e.g. a dev server's address
   * where its `url` is the app's proxy of it: its host names it where
   * nothing runs or it did not load. By default its `url`.
   */
  location?: string | undefined
  content: BrowserWebContent
  view: BrowserWebView
  onViewChange: (change: Partial<BrowserWebView>) => void
  /** The element at a point of the page; by default the frame's own. */
  inspectElement?:
    | ((point: {
        x: number
        y: number
      }) => BrowserElement | undefined | Promise<BrowserElement | undefined>)
    | undefined
  onPickElement?:
    | ((
        element: BrowserElement,
        request: string,
        options: BrowserPickOptions
      ) => void)
    | undefined
  onTakeOver?: (() => void) | undefined
  onAskAgent?: ((message: BrowserConsoleMessage) => void) | undefined
  /** The Network tab's Refresh: the app reads the requests again. */
  onRefreshNetwork?: (() => void) | undefined
  /** Where nothing runs: the app's buttons, e.g. to start the server. */
  notRunningActions?: React.ReactNode
  recent?: BrowserRecent[] | undefined
  onOpenAddress?: ((address: string) => void) | undefined
  /** To type another address: e.g. focus the address bar. */
  onOtherAddress?: ((event: React.MouseEvent) => void) | undefined
  /** A page that did not load (`error`), loaded again. */
  onRetry?: (() => void) | undefined
  labels: BrowserWebLabels
}) {
  const [loading, setLoading] = React.useState(!content.screenshot)
  const frame = React.useRef<HTMLIFrameElement>(null)
  const host = hostOf(location ?? content.url)

  if (content.running === false)
    return (
      <BrowserWebNotice
        data-slot="browser-not-running"
        icon={<HugeiconsIcon icon={WebDesign01Icon} strokeWidth={2} />}
        title={labels.nothingRunning(host)}
        description={labels.nothingRunningHint}
        actions={notRunningActions}
        recent={recent}
        onOpenAddress={onOpenAddress}
        onOtherAddress={onOtherAddress}
        labels={labels}
      />
    )

  if (content.error !== undefined)
    return (
      <BrowserWebNotice
        data-slot="browser-load-failed"
        icon={<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />}
        title={labels.loadFailed(host)}
        description={
          content.error === true ? labels.loadFailedHint : content.error
        }
        actions={
          onRetry && (
            <Button onClick={onRetry}>
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
              {labels.retry}
            </Button>
          )
        }
        recent={recent}
        onOpenAddress={onOpenAddress}
        onOtherAddress={onOtherAddress}
        labels={labels}
      />
    )

  const agent = content.agent
  return (
    <div
      data-slot="browser-web-page"
      data-agent={agent ? "" : undefined}
      className="relative flex h-full min-h-0 flex-col"
    >
      {agent && (
        <div
          data-slot="browser-agent-bar"
          role="status"
          // The text's colour, against the panel in either theme, as the
          // ring round the page under it.
          className="flex h-9 shrink-0 items-center gap-2 bg-foreground ps-3 pe-1 text-xs text-background"
        >
          <HugeiconsIcon
            icon={Robot01Icon}
            strokeWidth={2}
            className="size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span className="min-w-0 truncate">
            <span className="font-medium">{labels.agentUsing}</span>
            {agent.action && (
              <span className="opacity-70"> · {agent.action}</span>
            )}
          </span>
          {onTakeOver && (
            <Button
              variant="default"
              size="xs"
              className={cn(
                "ms-auto bg-background/15 font-normal text-background shadow-none hover:bg-background/20",
                touch
              )}
              onClick={onTakeOver}
            >
              {labels.takeOver}
            </Button>
          )}
        </div>
      )}
      <BrowserStage device={view.device} rotated={view.rotated}>
        {content.screenshot ? (
          <img
            src={content.screenshot}
            alt={title}
            className="block w-full"
            draggable={false}
          />
        ) : (
          <iframe
            ref={frame}
            style={{ colorScheme: view.dark ? "dark" : undefined }}
            src={content.url}
            title={title}
            sandbox={
              content.sandbox ??
              "allow-scripts allow-same-origin allow-forms allow-popups"
            }
            {...(content.allow ? { allow: content.allow } : {})}
            onLoad={() => setLoading(false)}
            // A page's own canvas is white unless it paints its own, as in a
            // browser; not the app's, under which a dark theme hides its text.
            className="block size-full border-0 bg-white"
          />
        )}
        {agent && (
          // Its input waits while the agent drives it.
          <div
            data-slot="browser-agent-layer"
            className="absolute inset-0 cursor-not-allowed"
          >
            {agent.target && <BoxOutline box={agent.target} variant="agent" />}
            {agent.cursor && <AgentCursor cursor={agent.cursor} />}
          </div>
        )}
        {view.picking && onPickElement && (
          <PickLayer
            inspect={(point) =>
              inspectElement
                ? inspectElement(point)
                : inspectFrame(frame.current, point)
            }
            onPick={(element, request, options) => {
              onPickElement(element, request, options)
              onViewChange({ picking: false })
            }}
            onCancel={() => onViewChange({ picking: false })}
            labels={labels}
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <Spinner className="text-muted-foreground" />
          </div>
        )}
      </BrowserStage>
      {agent && (
        // Round the page, under the bar: the agent has it.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 ring-(length:--line-mark) ring-foreground ring-inset"
        />
      )}
      {view.console && (content.console || content.network) && (
        <BrowserConsole
          messages={content.console}
          network={content.network}
          tab={view.drawer}
          onTabChange={(drawer) => onViewChange({ drawer })}
          onClose={() => onViewChange({ console: false })}
          onAskAgent={onAskAgent}
          onRefreshNetwork={onRefreshNetwork}
          labels={labels}
        />
      )}
    </div>
  )
}

/**
 * Over the page while the reader points at an element: the element under
 * the pointer outlined and named; a click picks it, then the reader says
 * what to do with it, for the chat.
 */
function PickLayer({
  inspect,
  onPick,
  onCancel,
  labels,
}: {
  inspect: (point: {
    x: number
    y: number
  }) => BrowserElement | undefined | Promise<BrowserElement | undefined>
  onPick: (
    element: BrowserElement,
    request: string,
    options: BrowserPickOptions
  ) => void
  onCancel: () => void
  labels: BrowserWebLabels
}) {
  const [hovered, setHovered] = React.useState<BrowserElement>()
  const [picked, setPicked] = React.useState<BrowserElement>()
  const [request, setRequest] = React.useState("")
  const [screenshot, setScreenshot] = React.useState(false)
  const asked = React.useRef(0)
  const textarea = React.useRef<HTMLTextAreaElement>(null)
  const shown = picked ?? hovered

  // The point on the page: the layer is drawn at the page's size, scaled.
  const pointOf = (event: React.MouseEvent<HTMLElement>) => {
    const layer = event.currentTarget
    const box = layer.getBoundingClientRect()
    const scale = box.width / layer.offsetWidth || 1
    return {
      x: (event.clientX - box.left) / scale,
      y: (event.clientY - box.top) / scale,
    }
  }
  const look = async (point: { x: number; y: number }) => {
    const ask = ++asked.current
    const element = await inspect(point)
    if (ask === asked.current) setHovered(element)
  }

  React.useEffect(() => {
    if (picked) textarea.current?.focus()
  }, [picked])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      event.preventDefault()
      if (picked) setPicked(undefined)
      else onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [picked, onCancel])

  const send = () => {
    if (!picked) return
    onPick(picked, request.trim(), { screenshot })
  }

  return (
    <div
      data-slot="browser-pick-layer"
      className="absolute inset-0 cursor-crosshair"
      onPointerMove={(event) => {
        if (!picked) void look(pointOf(event))
      }}
      onPointerLeave={() => {
        if (!picked) {
          asked.current++
          setHovered(undefined)
        }
      }}
      onClick={async (event) => {
        if (picked) return
        const element = hovered ?? (await inspect(pointOf(event)))
        if (element) setPicked(element)
      }}
    >
      {shown && (
        <BoxOutline box={shown.box} variant="pick">
          <PageChip className="start-0 top-full mt-2">
            {shown.tag && <span>{shown.tag}</span>}
            <span className="font-mono font-normal opacity-70">
              {shown.selector.slice(shown.tag?.length ?? 0) || shown.selector}
            </span>
            <span className="tabular-nums">
              {round(shown.box.width)} × {round(shown.box.height)}
            </span>
          </PageChip>
        </BoxOutline>
      )}
      {picked && (
        <form
          data-slot="browser-pick-card"
          aria-label={picked.selector}
          // 304px, 16px under the element's chip (its outline's 4px, the
          // chip's 8px and 24px).
          className="absolute z-20 flex w-76 cursor-auto flex-col gap-2 rounded-lg bg-popover p-3 text-popover-foreground shadow-float"
          style={{
            left: Math.max(8, picked.box.x - 4),
            top: picked.box.y + picked.box.height + 52,
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <div className="flex items-center gap-1 text-xs text-subtle-foreground">
            <HugeiconsIcon
              icon={CursorMagicSelection02Icon}
              strokeWidth={2}
              className="size-3"
              aria-hidden="true"
            />
            <span className="truncate font-mono text-muted-foreground">
              {picked.selector}
            </span>
          </div>
          {/* The card is the field: words on it, no box round them. */}
          <textarea
            ref={textarea}
            data-slot="browser-pick-request"
            aria-label={labels.request}
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                send()
              }
            }}
            className="field-sizing-content max-h-40 min-h-10 w-full resize-none bg-transparent text-2sm leading-5 text-foreground outline-none"
          />
          <div className="flex items-center gap-1">
            <ViewerTool
              type="button"
              label={labels.withScreenshot}
              pressed={screenshot}
              onClick={() => setScreenshot(!screenshot)}
            >
              <HugeiconsIcon icon={Camera01Icon} strokeWidth={2} />
            </ViewerTool>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ms-auto"
              onClick={() => setPicked(undefined)}
            >
              {labels.cancel}
            </Button>
            <Button type="submit" size="sm" aria-keyshortcuts="Enter">
              {labels.addToChat}
              <Kbd
                aria-hidden="true"
                className="h-4 min-w-0 bg-transparent px-0 text-current opacity-60 pointer-coarse:hidden"
              >
                ↵
              </Kbd>
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

/** A request that failed: no response, or an error's status. */
const requestFailed = (request: BrowserNetworkRequest) =>
  request.status !== undefined &&
  (request.status === 0 || request.status >= 400)

/**
 * The page's console in a drawer under it: its messages, errors first
 * to the eye, filtered by their words; an error can go to the agent.
 * With the page's requests, a Network tab beside it lists them: method,
 * address, status, time and size, the failed ones darker; the app's
 * Refresh reads them again.
 */
function BrowserConsole({
  messages,
  network,
  tab,
  onTabChange,
  onClose,
  onAskAgent,
  onRefreshNetwork,
  labels,
}: {
  messages: BrowserConsoleMessage[] | undefined
  network: BrowserNetworkRequest[] | undefined
  /** The tab shown, where there are both. */
  tab: "console" | "network" | undefined
  onTabChange: (tab: "console" | "network") => void
  onClose: () => void
  onAskAgent: ((message: BrowserConsoleMessage) => void) | undefined
  onRefreshNetwork: (() => void) | undefined
  labels: BrowserWebLabels
}) {
  const [filter, setFilter] = React.useState("")
  const id = React.useId()
  const query = filter.trim().toLowerCase()
  const errors =
    messages?.filter((message) => message.level === "error").length ?? 0
  const filterInput = (
    <ViewerFilter
      label={labels.filter}
      clearLabel={labels.clearFilter}
      value={filter}
      onValueChange={setFilter}
      size="sm"
      className="ms-auto w-32 shrink"
    />
  )
  // Shown with the requests: on their own, or their tab.
  const shownNetwork = network && (!messages || tab === "network")
  const refresh = shownNetwork && onRefreshNetwork && (
    <ViewerTool label={labels.refreshNetwork} onClick={onRefreshNetwork}>
      <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
    </ViewerTool>
  )
  const close = (
    <ViewerTool label={labels.closeConsole} onClick={onClose}>
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
    </ViewerTool>
  )
  const count = (value: number) => (
    <span
      aria-hidden="true"
      className="text-xs font-normal text-muted-foreground tabular-nums"
    >
      {value}
    </span>
  )
  const consoleList = messages && (
    <ConsoleMessages
      messages={
        query
          ? messages.filter((message) =>
              `${message.text} ${message.source ?? ""}`
                .toLowerCase()
                .includes(query)
            )
          : messages
      }
      onAskAgent={onAskAgent}
      labels={labels}
      {...(network
        ? { "aria-label": labels.console(0) }
        : { "aria-labelledby": `${id}-title` })}
    />
  )
  const networkList = network && (
    <NetworkRequests
      requests={
        query
          ? network.filter((request) =>
              `${request.method} ${request.url} ${request.status ?? ""}`
                .toLowerCase()
                .includes(query)
            )
          : network
      }
      labels={labels}
    />
  )

  if (!messages || !network)
    return (
      <section
        data-slot="browser-console"
        aria-labelledby={`${id}-title`}
        className="flex h-64 min-h-0 shrink-0 flex-col border-t bg-background"
      >
        <div className="flex h-9 shrink-0 items-center gap-1 border-b ps-3 pe-1">
          <h3 id={`${id}-title`} className="text-xs font-medium">
            {messages ? labels.console(0) : labels.network}
          </h3>
          {messages
            ? errors > 0 && count(errors)
            : network && count(network.length)}
          {filterInput}
          {refresh}
          {close}
        </div>
        {consoleList ?? networkList}
      </section>
    )

  return (
    <Tabs
      data-slot="browser-console"
      render={<section aria-label={labels.console(0)} />}
      value={tab ?? "console"}
      onValueChange={(value: "console" | "network") => onTabChange(value)}
      className="h-64 min-h-0 shrink-0 gap-0 border-t bg-background"
    >
      <div className="flex h-9 shrink-0 items-center gap-1 border-b px-1">
        <TabsList className="h-7 shrink-0 gap-0.5 bg-transparent p-0">
          <TabsTrigger
            value="console"
            className="h-7 flex-none px-2 text-xs data-active:bg-muted data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-muted"
          >
            {labels.console(0)}
            {errors > 0 && count(errors)}
          </TabsTrigger>
          <TabsTrigger
            value="network"
            className="h-7 flex-none px-2 text-xs data-active:bg-muted data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-muted"
          >
            {labels.network}
            {count(network.length)}
          </TabsTrigger>
        </TabsList>
        {filterInput}
        {refresh}
        {close}
      </div>
      <TabsContent value="console" className="flex min-h-0 flex-col">
        {consoleList}
      </TabsContent>
      <TabsContent value="network" className="flex min-h-0 flex-col">
        {networkList}
      </TabsContent>
    </Tabs>
  )
}

/** A message's kind at its start, e.g. "TypeError:", or none. */
function kindOf(text: string) {
  return /^(?:Uncaught )?\w*(?:Error|Warning|Exception):/.exec(text)?.[0]
}

function ConsoleMessages({
  messages,
  onAskAgent,
  labels,
  ...props
}: React.ComponentProps<"ul"> & {
  messages: BrowserConsoleMessage[]
  onAskAgent: ((message: BrowserConsoleMessage) => void) | undefined
  labels: BrowserWebLabels
}) {
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto" {...props}>
      {messages.length === 0 && (
        <li className="px-3 py-2 text-xs text-muted-foreground">
          {labels.noMessages}
        </li>
      )}
      {messages.map((message) => (
        <li
          key={message.id}
          data-slot="browser-console-message"
          data-level={message.level}
          // One line each, 20px in a 28px row with its rule, as a
          // console's: the whole of it in its tooltip and when copied.
          className="group/message flex h-7 items-center gap-2 border-b ps-3 pe-2 font-mono text-xs/5 text-muted-foreground data-[level=error]:bg-muted data-[level=error]:text-foreground data-[level=warning]:text-foreground"
        >
          {message.level === "error" || message.level === "warning" ? (
            <HugeiconsIcon
              icon={Alert02Icon}
              strokeWidth={2}
              className="size-3.5 shrink-0"
              aria-label={message.level}
            />
          ) : (
            <HugeiconsIcon
              icon={InformationCircleIcon}
              strokeWidth={2}
              className="size-3.5 shrink-0"
              aria-label={message.level}
            />
          )}
          <span
            data-slot="browser-console-text"
            title={message.text}
            className="min-w-0 flex-1 truncate"
          >
            {/* Its kind ("TypeError:") first, heavier. */}
            {kindOf(message.text) ? (
              <>
                <span className="font-semibold">{kindOf(message.text)}</span>
                {message.text.slice(kindOf(message.text)!.length)}
              </>
            ) : (
              message.text
            )}
          </span>
          {message.count !== undefined && message.count > 1 && (
            // How many times, in a pill.
            <span
              data-slot="browser-console-count"
              className="flex h-4 shrink-0 items-center rounded-full bg-foreground/10 px-1 font-sans text-2xs font-medium text-muted-foreground tabular-nums"
            >
              {message.count}
            </span>
          )}
          {message.source && (
            <span className="shrink-0 font-sans text-muted-foreground group-focus-within/message:hidden group-hover/message:hidden">
              {message.source}
            </span>
          )}
          {onAskAgent && message.level === "error" && (
            // On a row's hover or focus; always under a finger.
            <Button
              variant="outline"
              size="xs"
              className={cn(
                "-my-0.5 font-sans not-group-hover/message:not-focus-visible:not-pointer-coarse:sr-only",
                touch
              )}
              onClick={() => onAskAgent(message)}
            >
              {labels.askAgent}
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

/** The page's requests as a table: the failed ones darker. */
function NetworkRequests({
  requests,
  labels,
}: {
  requests: BrowserNetworkRequest[]
  labels: BrowserWebLabels
}) {
  const columns = labels.requestColumns
  const head = "h-7 px-2 text-start font-normal first:ps-3 last:pe-3"
  const cell =
    "px-2 py-1 align-top first:ps-3 last:pe-3 group-data-failed/request:bg-muted"
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table
        aria-label={labels.network}
        data-slot="browser-network"
        className="w-full table-fixed border-collapse text-xs/5"
      >
        <thead className="sticky top-0 bg-background text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className={cn(head, "w-16")}>
              {columns.method}
            </th>
            <th scope="col" className={head}>
              {columns.url}
            </th>
            <th scope="col" className={cn(head, "w-18 text-end")}>
              {columns.status}
            </th>
            <th scope="col" className={cn(head, "w-16 text-end")}>
              {columns.time}
            </th>
            <th scope="col" className={cn(head, "w-18 text-end")}>
              {columns.size}
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 && (
            <tr>
              <td colSpan={5} className={cn(cell, "text-muted-foreground")}>
                {labels.noRequests}
              </td>
            </tr>
          )}
          {requests.map((request) => (
            <tr
              key={request.id}
              data-slot="browser-network-request"
              data-failed={requestFailed(request) || undefined}
              className="group/request border-b font-mono text-muted-foreground data-failed:text-foreground"
            >
              <td className={cn(cell, "font-medium")}>{request.method}</td>
              <td className={cn(cell, "truncate")} title={request.url}>
                {request.url}
              </td>
              <td className={cn(cell, "text-end tabular-nums")}>
                {request.status === undefined
                  ? labels.pending
                  : request.status === 0
                    ? labels.failed
                    : request.status}
              </td>
              <td className={cn(cell, "text-end tabular-nums")}>
                {request.time !== undefined && labels.duration(request.time)}
              </td>
              <td className={cn(cell, "text-end tabular-nums")}>
                {request.size !== undefined && labels.bytes(request.size)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * A web page with nothing to show, in its place: nothing runs at its
 * address, or it did not load. What happened, the buttons that help
 * (the app's to start the server, Retry), another address, and recent
 * ones.
 */
function BrowserWebNotice({
  icon,
  title,
  description,
  actions,
  recent,
  onOpenAddress,
  onOtherAddress,
  labels,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  icon: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  actions: React.ReactNode
  recent: BrowserRecent[] | undefined
  onOpenAddress: ((address: string) => void) | undefined
  onOtherAddress: ((event: React.MouseEvent) => void) | undefined
  labels: BrowserWebLabels
}) {
  const id = React.useId()
  return (
    <Empty className="h-full justify-start" {...props}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          {actions}
          {onOtherAddress && (
            <Button variant="outline" onClick={onOtherAddress}>
              {labels.openAnotherAddress}
            </Button>
          )}
        </div>
        {recent && recent.length > 0 && onOpenAddress && (
          <section
            aria-labelledby={`${id}-recent`}
            className="mt-4 flex w-full flex-col gap-1 text-start"
          >
            <h3
              id={`${id}-recent`}
              className="px-2 text-xs font-medium text-muted-foreground"
            >
              {labels.recent}
            </h3>
            <ul className="flex flex-col">
              {recent.map((item) => (
                <li key={item.address}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    onClick={() => onOpenAddress(item.address)}
                  >
                    <HugeiconsIcon
                      icon={Globe02Icon}
                      strokeWidth={2}
                      className="text-muted-foreground"
                    />
                    <span className="truncate">{item.address}</span>
                    {item.meta && (
                      <span className="ms-auto text-xs text-muted-foreground">
                        {item.meta}
                      </span>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </EmptyContent>
    </Empty>
  )
}

export {
  BrowserAddressStatus,
  BrowserWebPage,
  BrowserWebTools,
  defaultWebLabels,
  defaultWebView,
  inspectFrame,
  type BrowserAgent,
  type BrowserBox,
  type BrowserConsoleMessage,
  type BrowserDevice,
  type BrowserElement,
  type BrowserPickOptions,
  type BrowserNetworkRequest,
  type BrowserRecent,
  type BrowserWebContent,
  type BrowserWebLabels,
  type BrowserWebView,
}
