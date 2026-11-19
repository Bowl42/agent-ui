"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Image01Icon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import {
  ViewerFrameEnd,
  ViewerFrameTitlebar,
  ViewerTool,
} from "@/components/viewer"

type ViewerOverlayLabels = {
  close: string
  /** Moves it to the app's side panel. */
  openInPanel: string
  /** The strip of what else there is to view: its name. */
  items: string
  previous: string
  next: string
}

const defaultViewerOverlayLabels: ViewerOverlayLabels = {
  close: "Close",
  openInPanel: "Open in side panel",
  items: "Images",
  previous: "Previous image",
  next: "Next image",
}

/**
 * One of what there is to view: a thumbnail of it in the strip, or a
 * placeholder where it has none yet (e.g. an image not fetched, which
 * the app loads when it is picked).
 */
type ViewerOverlayItem = {
  id: string
  /** A small image of it; without one, a placeholder in its place. */
  thumbnail?: string | undefined
  /** It is being loaded: a spinner in its place. */
  loading?: boolean | undefined
  /** Its name, the thumbnail's. */
  label: string
}

// The buttons to the one before and after: by the stage's sides, as a
// viewer's own are; with a mouse, there while it points at the stage (or
// one has focus), the strip the way through; under a finger and on a
// phone, where the strip is not, always. Centred by their margins, not a
// translate, which a button's press replaces: it would leave the pointer.
const side =
  "absolute inset-y-0 z-10 my-auto rounded-full bg-background/80 shadow-float backdrop-blur-sm motion-safe:transition-opacity motion-safe:motion-fade pointer-fine:opacity-0 pointer-fine:group-hover/stage:opacity-100 pointer-fine:focus-visible:opacity-100"

// The strip's width (w-18) less, from where the window's own buttons end:
// the row's start past them, over the strip's top.
const pastWindowButtons =
  "max(0.75rem, calc(env(titlebar-area-x, var(--agent-app-titlebar-inset, 0px)) - 4.5rem + 0.75rem))"

/** Places a reader types in, menus and sliders: their arrow keys. */
const ownArrows =
  "input, textarea, select, [contenteditable=''], [contenteditable=true], [role=slider], [role=menu], [role=menuitem], [role=listbox], [role=option], [role=tablist], [role=tab], [role=radiogroup]"

/**
 * A viewer over the whole window, e.g. a conversation's image: to the
 * window's edges, one surface. The app's viewer (a `MediaViewer`) fills
 * it, its toolbar the window's top row (`ViewerFrameTitlebar`): its
 * name, then its own tools, this one's "Open in side panel" and close
 * at its end, the window dragged by it but by its controls. The strip
 * of the conversation's images at the start, under that row (a
 * placeholder for one with no thumbnail yet, a spinner for one
 * loading), gone on a phone; buttons to the one before and after by its
 * sides, with a mouse while it points at it, a phone's way through them
 * always (the app gives its viewer none of its own); and the app's
 * composer under it, to ask about what is shown. ← → go to the one
 * before and after, where focus is not in a field or a control with
 * arrows of its own.
 */
function ViewerOverlay({
  open,
  onOpenChange,
  label,
  items,
  value,
  onValueChange,
  onOpenInPanel,
  dock,
  labels: labelsProp,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What is shown: the overlay's name. */
  label: string
  /** The conversation's images, in order: the strip, even of one. */
  items?: readonly ViewerOverlayItem[] | undefined
  /** The `id` of the one shown. */
  value?: string | undefined
  onValueChange?: ((id: string) => void) | undefined
  /** Closes this, for the app to show it in its side panel. */
  onOpenInPanel?: (() => void) | undefined
  /** The app's composer, under the viewer. */
  dock?: React.ReactNode
  labels?: Partial<ViewerOverlayLabels> | undefined
  className?: string
  /** The viewer: a `ViewerFrame`'s, as a `MediaViewer` is. */
  children: React.ReactNode
}) {
  const labels = { ...defaultViewerOverlayLabels, ...labelsProp }
  const popup = React.useRef<HTMLDivElement>(null)
  const strip = items && items.length > 0 ? items : undefined
  const at = strip ? strip.findIndex((item) => item.id === value) : -1
  // Its own buttons, where the viewer has no toolbar to take them.
  const [taken, setTaken] = React.useState(true)

  const panel = onOpenInPanel && (
    <ViewerTool
      label={labels.openInPanel}
      data-slot="viewer-overlay-panel"
      onClick={onOpenInPanel}
    >
      <HugeiconsIcon icon={SidebarRightIcon} strokeWidth={2} />
    </ViewerTool>
  )
  const close = (
    <ViewerTool
      label={labels.close}
      data-slot="viewer-overlay-close"
      onClick={() => onOpenChange(false)}
    >
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
    </ViewerTool>
  )
  const tools = (
    <>
      {panel}
      {close}
    </>
  )

  React.useLayoutEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const element = popup.current
      if (!element) return
      setTaken(
        !!element.querySelector(
          "[data-slot=viewer-toolbar] [data-slot=viewer-overlay-close]"
        )
      )
    })
    return () => cancelAnimationFrame(frame)
  }, [open, children])

  // The one shown in the strip's view.
  React.useEffect(() => {
    if (!open || at < 0) return
    popup.current
      ?.querySelector(`[data-slot=viewer-overlay-item][aria-current]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [open, at])

  const go = (by: 1 | -1) => {
    if (!strip || at < 0) return
    const next = strip[Math.min(strip.length - 1, Math.max(0, at + by))]
    if (next && next.id !== value) onValueChange?.(next.id)
  }

  // Its own row, where the viewer has no toolbar to be it.
  const ownRow = !taken && (
    <div
      data-slot="viewer-overlay-bar"
      data-titlebar=""
      className="flex h-[var(--agent-app-titlebar,--spacing(11))] shrink-0 items-center gap-3 pe-3"
      style={{
        paddingInlineStart: strip ? pastWindowButtons : undefined,
      }}
    >
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <div className="flex shrink-0 items-center gap-0.5">{tools}</div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={popup}
        showCloseButton={false}
        sheet={false}
        initialFocus={popup}
        data-slot="viewer-overlay"
        className={cn(
          "inset-0 top-0 left-0 flex w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 text-foreground ring-0 sm:max-w-none",
          // Past a phone's status bar.
          "max-sm:pt-safe",
          className
        )}
        onKeyDown={(event) => {
          if (!strip || event.defaultPrevented) return
          if ((event.target as Element).closest(ownArrows)) return
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
          if (event.key === "ArrowLeft") go(rtl ? 1 : -1)
          else if (event.key === "ArrowRight") go(rtl ? -1 : 1)
          else return
          event.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <div className="flex min-h-0 flex-1">
          {strip && (
            <nav
              aria-label={labels.items}
              data-slot="viewer-overlay-items"
              // Under the top row: its top the row's, dragging the window.
              className="hidden w-18 shrink-0 flex-col sm:flex"
            >
              <div
                data-slot="viewer-overlay-items-top"
                data-titlebar=""
                className="h-[var(--agent-app-titlebar,--spacing(11))] shrink-0"
              />
              <ul className="flex min-h-0 flex-1 scrollbar-thin flex-col items-center gap-2 overflow-y-auto py-1">
                {strip.map((item) => {
                  const current = item.id === value
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-slot="viewer-overlay-item"
                        aria-label={item.label}
                        aria-current={current || undefined}
                        aria-busy={item.loading || undefined}
                        onClick={() => onValueChange?.(item.id)}
                        className={cn(
                          "flex size-12 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground opacity-60 ring-1 ring-foreground/10 outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-opacity motion-safe:motion-fade",
                          current && "opacity-100 ring-2 ring-foreground"
                        )}
                      >
                        {item.loading ? (
                          <Spinner />
                        ) : item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            draggable={false}
                            className="size-full object-cover"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={Image01Icon}
                            strokeWidth={2}
                            className="size-6"
                          />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
          <div
            data-slot="viewer-overlay-stage"
            className="group/stage relative flex min-h-0 min-w-0 flex-1 flex-col *:min-h-0 *:flex-1 [&>[data-titlebar]]:flex-none"
            style={
              strip
                ? ({
                    "--viewer-titlebar-start": pastWindowButtons,
                  } as React.CSSProperties)
                : undefined
            }
          >
            {ownRow}
            <ViewerFrameTitlebar value>
              <ViewerFrameEnd value={tools}>{children}</ViewerFrameEnd>
            </ViewerFrameTitlebar>
            {strip && strip.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={labels.previous}
                  disabled={at <= 0}
                  data-slot="viewer-overlay-previous"
                  className={cn(side, "start-3")}
                  onClick={() => go(-1)}
                >
                  <HugeiconsIcon
                    icon={ArrowLeft01Icon}
                    strokeWidth={2}
                    className="rtl:-scale-x-100"
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={labels.next}
                  disabled={at < 0 || at >= strip.length - 1}
                  data-slot="viewer-overlay-next"
                  className={cn(side, "end-3")}
                  onClick={() => go(1)}
                >
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="rtl:-scale-x-100"
                  />
                </Button>
              </>
            )}
          </div>
        </div>
        {dock && (
          <div
            data-slot="viewer-overlay-dock"
            className="mx-auto w-full max-w-column shrink-0 px-4 pt-2 pb-3"
          >
            {dock}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export {
  ViewerOverlay,
  defaultViewerOverlayLabels,
  type ViewerOverlayItem,
  type ViewerOverlayLabels,
}
