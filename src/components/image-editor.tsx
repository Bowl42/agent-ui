"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiImageEditIcon,
  Cancel01Icon,
  ImageNotFound01Icon,
  LassoTool01Icon,
  PaintBrush01Icon,
  SquareIcon,
  Undo02Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { nextZoom, zoomSteps } from "@/lib/zoom"
import {
  ViewerEditDocked,
  ViewerEditLabel,
  ViewerEditSlot,
} from "@/components/viewer"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** A point on the image, in its own pixels. */
type ImagePoint = { x: number; y: number }

/** An image's size, in its own pixels. */
type ImageSize = { width: number; height: number }

/**
 * An area marked on an image, in its own pixels: brushed (its size the
 * brush's width), circled with the lasso, or a rectangle.
 */
type ImageMark =
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "lasso"; points: ImagePoint[] }
  | { kind: "brush"; points: ImagePoint[]; size: number }

type ImageMarkTool = ImageMark["kind"]

// A viewer's steps, on to 2000% for the pixels.
const minScale = zoomSteps[0]!
const maxScale = zoomSteps.at(-1)!
// From 3×, the pixels themselves: smoothing them blurs.
const pixelated = 3
// Room around the image: none in a viewer, fitted to its edges.
const pads = { own: 12, embedded: 0 }
// A press that moves less is a click.
const slop = 4
// Brush widths on the screen, in pixels; on the image, as it is zoomed.
const brushes = [12, 28, 56]
// A mark smaller on the screen is a slip.
const smallest = 6
// A new point of a line no nearer, on the screen.
const step = 2

/**
 * A checkerboard under an image: where it is transparent shows as such,
 * in either theme. The stage's, in the editor and the viewer alike.
 */
const checkerboard = "bg-background bg-checkerboard"

// Where the pointer is a finger, a toolbar button's place is as large as
// one (44px), its look the same.
const touch =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-2"

// A toggle of only an icon, as square as `IconButton` (shadcn's toggle
// has no icon size), its place as large.
const iconToggle = cn("px-0", touch)

/**
 * Whether a touch began on a control inside `stage` (a side button, a
 * badge, a toolbar's or an overlay's button, a slider): its own, a tap
 * a click and never a gesture of the stage's.
 */
function onControl(stage: Element, event: TouchEvent) {
  const control =
    event.target instanceof Element
      ? event.target.closest(
          "button, a[href], input, select, textarea, label, [role=button], [role=slider], [role=link], [role=menuitem], [role=tab], [contenteditable=true]"
        )
      : null
  return control !== null && control !== stage && stage.contains(control)
}

/** Follows the pointer outside the frame, if it is one the page has. */
function capture(event: React.PointerEvent<HTMLElement>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId)
  } catch {
    // Not a pointer of the browser's, e.g. an event made by a script.
  }
}

const clampScale = (scale: number) =>
  Math.min(maxScale, Math.max(minScale, scale))
const zoomIn = (scale: number) => nextZoom(scale, 1, { max: maxScale })
const zoomOut = (scale: number) => nextZoom(scale, -1, { max: maxScale })

/** A pinch, or a wheel with Ctrl or Alt: in step with how far it moves. */
function wheelFactor(deltaY: number, deltaMode: number) {
  const pixels =
    deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY
  return Math.exp(-Math.max(-12, Math.min(12, pixels)) / 100)
}

/** Its scale to fit the frame; a small image is not made larger. */
function fitScale(image: ImageSize, frame: ImageSize, pad: number) {
  if (image.width <= 0 || image.height <= 0) return 1
  return Math.min(
    1,
    Math.max(0, frame.width - 2 * pad) / image.width,
    Math.max(0, frame.height - 2 * pad) / image.height
  )
}

/** Where the image starts: centered if smaller than the frame. */
const offset = (frame: number, image: number, pad: number) =>
  Math.max(pad, (frame - image) / 2)

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

/** The rectangle between two points, in the image, in whole pixels. */
function rectBetween(a: ImagePoint, b: ImagePoint, size: ImageSize) {
  const x1 = Math.round(clamp(Math.min(a.x, b.x), size.width))
  const y1 = Math.round(clamp(Math.min(a.y, b.y), size.height))
  const x2 = Math.round(clamp(Math.max(a.x, b.x), size.width))
  const y2 = Math.round(clamp(Math.max(a.y, b.y), size.height))
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

/**
 * The rectangle around marks, in the image, a brush's width included:
 * e.g. to say where they are.
 */
function markBounds(marks: readonly ImageMark[], size: ImageSize) {
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  const take = (point: ImagePoint, radius = 0) => {
    x1 = Math.min(x1, point.x - radius)
    y1 = Math.min(y1, point.y - radius)
    x2 = Math.max(x2, point.x + radius)
    y2 = Math.max(y2, point.y + radius)
  }
  for (const mark of marks) {
    if (mark.kind === "rect") {
      take(mark)
      take({ x: mark.x + mark.width, y: mark.y + mark.height })
    } else
      for (const point of mark.points)
        take(point, mark.kind === "brush" ? mark.size / 2 : 0)
  }
  return rectBetween({ x: x1, y: y1 }, { x: x2, y: y2 }, size)
}

/** Large enough on the screen not to be a slip. */
function large(mark: ImageMark, scale: number) {
  if (mark.kind === "brush") return true
  if (mark.kind === "rect")
    return mark.width * scale >= smallest && mark.height * scale >= smallest
  if (mark.points.length < 3) return false
  const xs = mark.points.map((point) => point.x)
  const ys = mark.points.map((point) => point.y)
  return (
    (Math.max(...xs) - Math.min(...xs)) * scale >= smallest &&
    (Math.max(...ys) - Math.min(...ys)) * scale >= smallest
  )
}

/**
 * What stands in for an image till it has loaded, as its background: its
 * thumbnail over its placeholder.
 */
function standIn(...layers: (string | undefined)[]) {
  const urls = layers.filter((url): url is string => !!url)
  return urls.length > 0
    ? {
        backgroundImage: urls
          .map((url) => `url(${JSON.stringify(url)})`)
          .join(", "),
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined
}

/**
 * Paints marks on a canvas, `scale` times their size; the canvas's fill,
 * stroke and compositing are the caller's.
 */
function paintMarks(
  context: CanvasRenderingContext2D,
  marks: readonly ImageMark[],
  scale = 1
) {
  context.lineCap = "round"
  context.lineJoin = "round"
  const trace = (points: readonly ImagePoint[]) => {
    points.forEach((point, index) =>
      index === 0
        ? context.moveTo(point.x * scale, point.y * scale)
        : context.lineTo(point.x * scale, point.y * scale)
    )
  }
  for (const mark of marks) {
    context.beginPath()
    if (mark.kind === "rect") {
      context.rect(
        mark.x * scale,
        mark.y * scale,
        mark.width * scale,
        mark.height * scale
      )
      context.fill()
    } else if (mark.kind === "lasso") {
      trace(mark.points)
      context.closePath()
      context.fill()
    } else if (mark.points.length === 1) {
      const [point] = mark.points as [ImagePoint]
      context.arc(
        point.x * scale,
        point.y * scale,
        (mark.size * scale) / 2,
        0,
        Math.PI * 2
      )
      context.fill()
    } else {
      trace(mark.points)
      context.lineWidth = mark.size * scale
      context.stroke()
    }
  }
}

function canvas(width: number, height: number) {
  const element = document.createElement("canvas")
  element.width = width
  element.height = height
  const context = element.getContext("2d")
  if (!context) throw new Error("No canvas to draw on")
  return { element, context }
}

const png = (element: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    element.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No image made"))),
      "image/png"
    )
  )

/**
 * The images marks make, from the image's bytes (fetched by the app, so
 * the canvas can be read): `mask`, as large as the image, transparent
 * where marked and black elsewhere, as image models take for an edit;
 * `annotated`, the image with the marks tinted over it, at most `edge`
 * pixels long, to show a model where they are.
 */
async function markImages(
  image: Blob,
  marks: readonly ImageMark[],
  {
    edge = 2048,
    tint = 0.45,
    color = "red",
  }: {
    /** The annotated image's longest side, at most. */
    edge?: number
    /** How much the marks cover the image under them. */
    tint?: number
    color?: string
  } = {}
) {
  const bitmap = await createImageBitmap(image)
  try {
    const k = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
    const shown = canvas(
      Math.round(bitmap.width * k),
      Math.round(bitmap.height * k)
    )
    shown.context.drawImage(
      bitmap,
      0,
      0,
      shown.element.width,
      shown.element.height
    )
    // Painted solid, then laid over at once: marks over each other are
    // no darker.
    const tinted = canvas(shown.element.width, shown.element.height)
    tinted.context.fillStyle = color
    tinted.context.strokeStyle = color
    paintMarks(tinted.context, marks, k)
    shown.context.globalAlpha = tint
    shown.context.drawImage(tinted.element, 0, 0)

    const mask = canvas(bitmap.width, bitmap.height)
    mask.context.fillStyle = "black"
    mask.context.fillRect(0, 0, bitmap.width, bitmap.height)
    mask.context.globalCompositeOperation = "destination-out"
    mask.context.strokeStyle = "black"
    paintMarks(mask.context, marks)

    return {
      annotated: await png(shown.element),
      mask: await png(mask.element),
    }
  } finally {
    bitmap.close()
  }
}

type ImageEditorLabels = {
  /** How the image is zoomed, for a screen reader. */
  zoomHint: string
  toolbar: string
  zoomIn: string
  zoomOut: string
  /** The zoom button: to the actual size, and back to fit. */
  zoom: (percent: string, fitted: boolean) => string
  fit: string
  actualSize: string
  /** The button to mark areas: its word, short (in a viewer, beside its icon). */
  mark: string
  /** Its tooltip: what it does, whole. */
  markHint: string
  /** The marking tools. */
  tools: string
  brush: string
  lasso: string
  rect: string
  undo: string
  clear: string
  /** The app's action on the marks, beside them: e.g. "Edit this". */
  send: string
  sending: string
  /** When the app's action fails without saying why. */
  sendFailed: string
  failed: string
}

const defaultLabels: ImageEditorLabels = {
  zoomHint:
    "Click to zoom in, Alt+click to zoom out; + and − zoom, 0 fits, 1 is the actual size",
  toolbar: "Image",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoom: (percent, fitted) => (fitted ? `Fit · ${percent}` : percent),
  fit: "Fit to the frame",
  actualSize: "Actual size",
  mark: "Mark",
  markHint: "Mark an area to edit",
  tools: "Marking",
  brush: "Brush ([ and ] change its width)",
  lasso: "Lasso",
  rect: "Rectangle",
  undo: "Undo",
  clear: "Clear marks",
  send: "Edit this",
  sending: "Preparing…",
  sendFailed: "Could not prepare the edit. Try again.",
  failed: "This image cannot be shown",
}

type Load =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; size: ImageSize }

/**
 * An image to look at closely, and to mark areas of: as wide as its frame
 * at first (a small one at its size), zoomed by a click (Alt+click out),
 * a pinch, Ctrl or Alt and the wheel, its buttons or + − 0 1; moved by
 * scrolling or dragging. Where the app takes marks (`onMark`), the reader
 * brushes, circles or frames areas, and sends them by the button beside
 * them; what is done with them is the app's (`markImages` makes a mask).
 */
function ImageEditor({
  src,
  alt,
  crossOrigin,
  actions,
  onMark,
  marks: shownMarks,
  highlight,
  zoom: zoomProp,
  onZoomChange,
  onScaleChange,
  viewer = false,
  toolsContainer: toolsContainerProp,
  checkered = true,
  width: knownWidth,
  height: knownHeight,
  thumbnail,
  placeholder,
  markIcon,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  src: string
  /** What it shows, for those who do not see it. */
  alt: string
  crossOrigin?: "anonymous" | "use-credentials" | undefined
  /** The app's buttons in its toolbar: e.g. copy, download. */
  actions?: React.ReactNode
  /**
   * Takes the reader's marks, by the button beside them, e.g. to ask a
   * model to change those areas; with none, nothing can be marked. While
   * it runs the button waits; if it throws, its message shows. Done, the
   * marks are cleared.
   */
  onMark?:
    ((marks: ImageMark[], size: ImageSize) => Promise<void> | void) | undefined
  /** Marks to show while not marking, e.g. those sent. */
  marks?: readonly ImageMark[] | undefined
  /**
   * A mask of what changed, as `markImages` makes (transparent where it
   * did): the rest dims, then clears, as the image opens. Its URL must be
   * the page's to use, e.g. a blob's.
   */
  highlight?: string | undefined
  /** Its zoom, the app's: "fit", or a scale (1 is its own size). */
  zoom?: "fit" | number | undefined
  onZoomChange?: ((zoom: "fit" | number) => void) | undefined
  /** Told the scale it is drawn at, and the one that fits, as they change. */
  onScaleChange?: ((scale: number, fit: number) => void) | undefined
  /**
   * In a viewer (`MediaViewer`'s): no bar of its own under the image, the
   * zoom the app's (as `zoom` and `onScaleChange` give it), the image
   * drawn as the viewer draws one, and its marking tools in a floating
   * bar under the image, unless `toolsContainer` takes them.
   */
  viewer?: boolean | undefined
  /** Where its marking tools go instead, e.g. a toolbar; in a viewer. */
  toolsContainer?: HTMLElement | null | undefined
  /**
   * Whether it is drawn on a checkerboard, for its transparent parts; a
   * viewer knows by its pixels (`MediaViewer` says so).
   */
  checkered?: boolean | undefined
  /**
   * Its size, in its own pixels, if the app knows it: laid out at it
   * while it loads, its stand-in shown there.
   */
  width?: number | undefined
  height?: number | undefined
  /** A smaller copy of it, shown at its size till it has loaded. */
  thumbnail?: string | undefined
  /** A tiny stand-in, e.g. a ThumbHash's data URL, under the thumbnail. */
  placeholder?: string | undefined
  /** The mark button's icon, the app's; else an image with AI's sparkle. */
  markIcon?: React.ReactNode
  labels?: Partial<ImageEditorLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  // A viewer's: its tools in the viewer's floating bar of edits.
  const floatSlot = React.useContext(ViewerEditSlot)
  // On a viewer's island: Mark first, then its tools, clear and send.
  const docked = React.useContext(ViewerEditDocked)
  const toolsContainer =
    toolsContainerProp !== undefined
      ? toolsContainerProp
      : viewer
        ? floatSlot
        : undefined
  const embedded = viewer || toolsContainer !== undefined
  const pad = embedded ? pads.embedded : pads.own
  const frame = React.useRef<HTMLDivElement>(null)
  const [load, setLoad] = React.useState<Load>({ status: "loading" })
  const [view, setView] = React.useState<ImageSize>()
  const [ownZoom, setOwnZoom] = React.useState<"fit" | number>("fit")
  const zoom = zoomProp ?? ownZoom
  const setZoom = (next: "fit" | number) => {
    setOwnZoom(next)
    onZoomChange?.(next)
  }
  const [zoomingOut, setZoomingOut] = React.useState(false)
  const [grabbing, setGrabbing] = React.useState(false)
  const anchor = React.useRef<{ x: number; y: number; from: number }>(null)
  const drag = React.useRef<{
    id: number
    x: number
    y: number
    left: number
    top: number
    moved: boolean
  }>(null)

  // Laid out at the size the app says till it has loaded; marked once it
  // has.
  const loaded = load.status === "ready"
  const size = loaded
    ? load.size
    : knownWidth && knownHeight
      ? { width: knownWidth, height: knownHeight }
      : undefined
  const stand = loaded ? undefined : standIn(thumbnail, placeholder)
  const ready = size !== undefined && view !== undefined
  const fit = ready ? fitScale(size, view, pad) : 1
  const scale = zoom === "fit" ? fit : zoom
  const width = ready ? size.width * scale : 0
  const height = ready ? size.height * scale : 0
  const origin = ready
    ? {
        left: offset(view.width, width, pad),
        top: offset(view.height, height, pad),
      }
    : { left: 0, top: 0 }
  const content = ready
    ? {
        width: Math.max(view.width, width + 2 * pad),
        height: Math.max(view.height, height + 2 * pad),
      }
    : undefined

  // Marking.
  const [marking, setMarking] = React.useState(false)
  const [tool, setTool] = React.useState<ImageMarkTool>("brush")
  const [brush, setBrush] = React.useState(1)
  // The marks, and those before each change (a mark, or clearing them
  // all), to undo it.
  const [edit, setEdit] = React.useState<{
    marks: ImageMark[]
    past: ImageMark[][]
  }>({ marks: [], past: [] })
  const marks = edit.marks
  const change = (next: (marks: ImageMark[]) => ImageMark[]) =>
    setEdit(({ marks, past }) => {
      const value = next(marks)
      return value === marks
        ? { marks, past }
        : { marks: value, past: [...past, marks] }
    })
  const addMark = (mark: ImageMark) => change((marks) => [...marks, mark])
  const clearMarks = () => change((marks) => (marks.length > 0 ? [] : marks))
  const undo = () =>
    setEdit(({ marks, past }) =>
      past.length > 0
        ? { marks: past.at(-1)!, past: past.slice(0, -1) }
        : { marks, past }
    )
  const [drawing, setDrawing] = React.useState<ImageMark>()
  const [hover, setHover] = React.useState<ImagePoint>()
  const start = React.useRef<ImagePoint>(null)
  // The mark being drawn, as the events come: faster than renders.
  const stroke = React.useRef<ImageMark>(undefined)
  const draw = (mark: ImageMark | undefined) => {
    stroke.current = mark
    setDrawing(mark)
  }
  const brushSize = brushes[brush]! / scale
  const exitMarking = () => {
    setMarking(false)
    setEdit({ marks: [], past: [] })
    draw(undefined)
    setHover(undefined)
    start.current = null
  }

  function zoomTo(next: "fit" | number, pointer?: { x: number; y: number }) {
    const element = frame.current
    if (!element || !ready) return
    const rect = element.getBoundingClientRect()
    anchor.current = {
      x: pointer ? pointer.x - rect.left : element.clientWidth / 2,
      y: pointer ? pointer.y - rect.top : element.clientHeight / 2,
      from: scale,
    }
    setZoom(next === "fit" ? "fit" : clampScale(next))
  }

  // The point under the pointer stays under it as the scale changes; the
  // middle, where the app changes it.
  const drawnScale = React.useRef<number>(undefined)
  React.useLayoutEffect(() => {
    const element = frame.current
    if (!element || !ready) return
    const before = drawnScale.current
    drawnScale.current = scale
    const pending =
      anchor.current ??
      (before !== undefined && before !== scale && zoomProp !== undefined
        ? {
            x: element.clientWidth / 2,
            y: element.clientHeight / 2,
            from: before,
          }
        : null)
    if (!pending) return
    anchor.current = null
    const axis = (
      scroll: number,
      pointer: number,
      frame: number,
      natural: number
    ) => {
      const before = offset(frame, natural * pending.from, pad)
      const on = (scroll + pointer - before) / pending.from
      return Math.max(
        0,
        on * scale + offset(frame, natural * scale, pad) - pointer
      )
    }
    element.scrollLeft = axis(
      element.scrollLeft,
      pending.x,
      view.width,
      size.width
    )
    element.scrollTop = axis(
      element.scrollTop,
      pending.y,
      view.height,
      size.height
    )
  })

  // The frame's size, and the wheel: a pinch is Ctrl and the wheel, which
  // only a listener that is not passive can keep from zooming the page.
  const wheel = React.useEffectEvent(
    (factor: number, pointer: { x: number; y: number }) =>
      zoomTo(scale * factor, pointer)
  )
  React.useLayoutEffect(() => {
    const element = frame.current
    if (!element) return
    const measure = () =>
      setView({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.altKey) return
      event.preventDefault()
      if (event.deltaY === 0) return
      wheel(wheelFactor(event.deltaY, event.deltaMode), {
        x: event.clientX,
        y: event.clientY,
      })
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      observer.disconnect()
      element.removeEventListener("wheel", onWheel)
    }
  }, [load.status])

  // Fingers, while not marking: a pinch zooms about its middle, as far as
  // they go; a double tap fits it, or zooms in to 200% there. One finger
  // scrolls it; the page's own pinch is not taken (its `touch-action`).
  const touchZoom = React.useEffectEvent(
    (next: number | "toggle", at: { x: number; y: number }) => {
      if (marking) return
      zoomTo(next === "toggle" ? (zoom === "fit" ? 2 : "fit") : next, at)
    }
  )
  const touchScale = React.useEffectEvent(() => (marking ? null : scale))
  React.useEffect(() => {
    const element = frame.current
    if (!element) return
    let pinch: { distance: number; scale: number } | null = null
    let down: { x: number; y: number; time: number } | null = null
    let tap: { x: number; y: number; time: number } | null = null
    const between = (a: Touch, b: Touch) => ({
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
    })
    // A touch on a control is the control's, to its end.
    let control = false
    const start = (event: TouchEvent) => {
      if (onControl(element, event)) {
        control = true
        pinch = null
        down = null
        tap = null
        return
      }
      if (control && event.touches.length > 1) return
      control = false
      const scale = touchScale()
      if (scale === null) return
      if (event.touches.length === 2) {
        const at = between(event.touches[0]!, event.touches[1]!)
        pinch = { distance: at.distance || 1, scale }
        down = null
        tap = null
      } else if (event.touches.length === 1 && !pinch) {
        const finger = event.touches[0]!
        down = { x: finger.clientX, y: finger.clientY, time: event.timeStamp }
      } else down = null
    }
    const move = (event: TouchEvent) => {
      if (control || !pinch || event.touches.length < 2) return
      event.preventDefault()
      const at = between(event.touches[0]!, event.touches[1]!)
      touchZoom((pinch.scale * at.distance) / pinch.distance, at)
    }
    const end = (event: TouchEvent) => {
      if (control) {
        if (event.touches.length === 0) control = false
        return
      }
      if (pinch) {
        if (event.touches.length < 2) pinch = null
        return
      }
      const finger = event.changedTouches[0]
      if (!down || !finger || event.touches.length > 0) return
      const moved = Math.hypot(finger.clientX - down.x, finger.clientY - down.y)
      const quick = event.timeStamp - down.time < 300
      down = null
      if (moved >= 10 || !quick) return
      const again =
        tap &&
        event.timeStamp - tap.time < 300 &&
        Math.hypot(finger.clientX - tap.x, finger.clientY - tap.y) < 30
      tap = again
        ? null
        : { x: finger.clientX, y: finger.clientY, time: event.timeStamp }
      if (!again) return
      event.preventDefault()
      touchZoom("toggle", { x: finger.clientX, y: finger.clientY })
    }
    const cancel = () => {
      control = false
      pinch = null
      down = null
    }
    element.addEventListener("touchstart", start, { passive: true })
    element.addEventListener("touchmove", move, { passive: false })
    element.addEventListener("touchend", end, { passive: false })
    element.addEventListener("touchcancel", cancel)
    return () => {
      element.removeEventListener("touchstart", start)
      element.removeEventListener("touchmove", move)
      element.removeEventListener("touchend", end)
      element.removeEventListener("touchcancel", cancel)
    }
  }, [load.status])

  const onImage = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left + element.scrollLeft - origin.left) / scale,
      y: (event.clientY - rect.top + element.scrollTop - origin.top) / scale,
    }
  }

  function down(event: React.PointerEvent<HTMLDivElement>) {
    if (marking && size) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-slot=image-editor-mark-actions]")
      )
        return
      if (event.button !== 0) return
      capture(event)
      const point = onImage(event)
      start.current = point
      draw(
        tool === "rect"
          ? { kind: "rect", ...rectBetween(point, point, size) }
          : tool === "lasso"
            ? { kind: "lasso", points: [point] }
            : { kind: "brush", points: [point], size: brushSize }
      )
      return
    }
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    // Not on its scrollbars, nor a touch (it scrolls), nor Ctrl+click (a
    // Mac's right click).
    const onScrollbar =
      event.clientX >= rect.left + element.clientWidth ||
      event.clientY >= rect.top + element.clientHeight
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      onScrollbar ||
      event.pointerType === "touch"
    )
      return
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
      moved: false,
    }
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (marking) {
      const point = onImage(event)
      setHover(point)
      const from = start.current
      if (!from || !size) return
      const mark = stroke.current
      if (!mark) return
      if (mark.kind === "rect")
        return draw({ kind: "rect", ...rectBetween(from, point, size) })
      const last = mark.points.at(-1)!
      if (Math.hypot(point.x - last.x, point.y - last.y) * scale < step) return
      draw({ ...mark, points: [...mark.points, point] })
      return
    }
    setZoomingOut(event.altKey)
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (!current.moved && Math.hypot(dx, dy) < slop) return
    if (!current.moved) {
      capture(event)
      setGrabbing(true)
    }
    current.moved = true
    event.currentTarget.scrollLeft = current.left - dx
    event.currentTarget.scrollTop = current.top - dy
  }

  function up(event: React.PointerEvent<HTMLDivElement>) {
    if (marking) {
      if (!start.current) return
      start.current = null
      const mark = stroke.current
      if (mark && large(mark, scale)) addMark(mark)
      draw(undefined)
      return
    }
    const current = drag.current
    drag.current = null
    setGrabbing(false)
    if (!current || current.id !== event.pointerId || current.moved) return
    zoomTo(event.altKey ? zoomOut(scale) : zoomIn(scale), {
      x: event.clientX,
      y: event.clientY,
    })
  }

  function key(event: React.KeyboardEvent<HTMLDivElement>) {
    setZoomingOut(event.altKey)
    const command = event.metaKey || event.ctrlKey
    if (marking) {
      const act =
        command && event.key.toLowerCase() === "z"
          ? undo
          : command
            ? undefined
            : event.key === "Escape"
              ? () => (marks.length > 0 ? clearMarks() : exitMarking())
              : event.key === "["
                ? () => setBrush((brush) => Math.max(0, brush - 1))
                : event.key === "]"
                  ? () =>
                      setBrush((brush) =>
                        Math.min(brushes.length - 1, brush + 1)
                      )
                  : undefined
      if (act) {
        event.preventDefault()
        event.stopPropagation()
        act()
        return
      }
    }
    if (command) return
    const next =
      event.key === "+" || event.key === "="
        ? zoomIn(scale)
        : event.key === "-" || event.key === "_"
          ? zoomOut(scale)
          : event.key === "0" || event.key === "Escape"
            ? "fit"
            : event.key === "1"
              ? 1
              : undefined
    if (next === undefined || (event.key === "Escape" && zoom === "fit")) return
    event.preventDefault()
    event.stopPropagation()
    zoomTo(next)
  }

  const scaleChanged = React.useEffectEvent((scale: number, fit: number) =>
    onScaleChange?.(scale, fit)
  )
  React.useEffect(() => {
    if (ready) scaleChanged(scale, fit)
  }, [ready, scale, fit])

  const canZoom = zoomingOut ? scale > minScale : scale < maxScale
  const percent = `${Math.round(scale * 100)}%`

  // Under the image, a viewer's, as an image editor's own bar is: "Mark
  // an area" in words.
  const floating = embedded && toolsContainer === undefined
  const markToggle = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            size="sm"
            className={viewer ? touch : iconToggle}
            aria-label={labels.mark}
            pressed={marking}
            onPressedChange={(pressed) =>
              pressed ? setMarking(true) : exitMarking()
            }
          />
        }
      >
        {markIcon ?? <HugeiconsIcon icon={AiImageEditIcon} strokeWidth={2} />}
        {/* In words where the viewer has room for them. */}
        {viewer && <ViewerEditLabel>{labels.mark}</ViewerEditLabel>}
      </TooltipTrigger>
      <TooltipContent>{labels.markHint}</TooltipContent>
    </Tooltip>
  )
  const markTools = onMark && loaded && (
    <div
      role="group"
      aria-label={labels.tools}
      className="flex items-center gap-0.5"
    >
      {docked && markToggle}
      {marking && (
        <>
          <ToggleGroup
            value={[tool]}
            onValueChange={(value) => {
              const next = value[0] as ImageMarkTool | undefined
              if (next) setTool(next)
            }}
            size="sm"
            // As far apart as the toolbar's other buttons.
            spacing={0.5}
          >
            {(
              [
                [
                  "brush",
                  labels.brush,
                  <HugeiconsIcon
                    icon={PaintBrush01Icon}
                    strokeWidth={2}
                    key="b"
                  />,
                ],
                [
                  "lasso",
                  labels.lasso,
                  <HugeiconsIcon
                    icon={LassoTool01Icon}
                    strokeWidth={2}
                    key="l"
                  />,
                ],
                [
                  "rect",
                  labels.rect,
                  <HugeiconsIcon icon={SquareIcon} strokeWidth={2} key="r" />,
                ],
              ] as const
            ).map(([value, label, icon]) => (
              <Tooltip key={value}>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value={value}
                      aria-label={label}
                      className={iconToggle}
                    />
                  }
                >
                  {icon}
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
          <IconButton
            label={labels.undo}
            shortcut="Control+Z Meta+Z"
            disabled={edit.past.length === 0}
            onClick={undo}
          >
            <HugeiconsIcon icon={Undo02Icon} strokeWidth={2} />
          </IconButton>
          {docked && (
            <MarkActions
              labels={labels}
              disabled={marks.length === 0 || drawing !== undefined}
              onSend={async () => {
                await onMark(marks, size!)
                exitMarking()
              }}
              onClear={clearMarks}
            />
          )}
        </>
      )}
      {!docked && markToggle}
    </div>
  )

  if (load.status === "error")
    return (
      // As tall as it would be with the image: what it says, in the
      // middle, as a viewer says it cannot show a file.
      <Empty
        data-slot="image-editor"
        data-failed=""
        className={cn("h-full min-h-32 rounded-none", className)}
        {...props}
      >
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={ImageNotFound01Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>{labels.failed}</EmptyTitle>
          <EmptyDescription>{alt}</EmptyDescription>
        </EmptyHeader>
        {/* The app's still: e.g. to download the file, which may be fine. */}
        {actions && (
          <EmptyContent
            role="group"
            aria-label={labels.toolbar}
            data-slot="image-editor-toolbar"
            className="flex-row flex-wrap justify-center gap-1"
          >
            {actions}
          </EmptyContent>
        )}
      </Empty>
    )

  return (
    <div
      data-slot="image-editor"
      data-marking={marking ? "" : undefined}
      className={cn(
        "group/image-editor flex h-full min-h-0 flex-col",
        className
      )}
      {...props}
    >
      <div
        ref={frame}
        data-slot="image-editor-frame"
        role="group"
        aria-label={alt}
        aria-description={labels.zoomHint}
        tabIndex={0}
        // The zoomed image does not make its frame larger.
        className={cn(
          "relative min-h-32 flex-1 touch-pan-x touch-pan-y overflow-auto contain-size outline-none select-none focus-visible:inset-ring-2 focus-visible:inset-ring-ring/50",
          embedded && checkered && checkerboard,
          marking
            ? tool === "brush"
              ? "cursor-none touch-none"
              : "cursor-crosshair touch-none"
            : grabbing
              ? "cursor-grabbing"
              : !canZoom
                ? "cursor-default"
                : zoomingOut
                  ? "cursor-zoom-out"
                  : "cursor-zoom-in"
        )}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          drag.current = null
          start.current = null
          draw(undefined)
          setGrabbing(false)
        }}
        onPointerLeave={() => setHover(undefined)}
        onKeyDown={key}
        onKeyUp={(event) => setZoomingOut(event.altKey)}
      >
        <div className="relative min-h-full" style={content}>
          {load.status === "loading" && !(ready && stand) && (
            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Spinner />
            </span>
          )}
          <img
            src={src}
            alt={alt}
            draggable={false}
            {...(crossOrigin ? { crossOrigin } : {})}
            data-slot="image-editor-image"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget
              // An SVG with only a viewBox has no size: the frame's.
              const element = frame.current
              setLoad({
                status: "ready",
                size:
                  naturalWidth > 0 && naturalHeight > 0
                    ? { width: naturalWidth, height: naturalHeight }
                    : {
                        width: element?.clientWidth || 1,
                        height: element?.clientHeight || 1,
                      },
              })
            }}
            onError={() => setLoad({ status: "error" })}
            // A checkerboard shows where it is transparent: the stage's,
            // in a viewer.
            className={cn(
              "absolute max-w-none object-contain",
              !embedded && checkered && checkerboard
            )}
            style={
              ready
                ? {
                    left: origin.left,
                    top: origin.top,
                    width,
                    height,
                    imageRendering:
                      scale >= pixelated ? "pixelated" : undefined,
                    ...stand,
                  }
                : { visibility: "hidden" }
            }
          />
          {loaded && highlight && !marking && (
            <Highlight
              mask={highlight}
              style={{ left: origin.left, top: origin.top, width, height }}
            />
          )}
          {ready && (
            <Sketch
              marks={
                marking
                  ? drawing
                    ? [...marks, drawing]
                    : marks
                  : (shownMarks ?? [])
              }
              drawing={marking ? drawing : undefined}
              cursor={
                marking && tool === "brush" && hover
                  ? { ...hover, size: brushSize }
                  : undefined
              }
              size={size}
              scale={scale}
              origin={origin}
            />
          )}
          {ready &&
            marking &&
            onMark &&
            !docked &&
            marks.length > 0 &&
            !drawing && (
              <MarkActions
                bounds={markBounds(marks, size)}
                scale={scale}
                origin={origin}
                height={content!.height}
                labels={labels}
                onSend={async () => {
                  await onMark(marks, size)
                  exitMarking()
                }}
                onClear={clearMarks}
              />
            )}
        </div>
      </div>
      {embedded &&
        toolsContainer &&
        markTools &&
        createPortal(markTools, toolsContainer)}
      {ready && floating && markTools && (
        <div
          data-slot="image-editor-float"
          className={cn(
            "flex flex-none justify-center px-3 py-2",
            checkered && checkerboard
          )}
        >
          <div className="max-w-full rounded-xl bg-popover p-1 text-popover-foreground shadow-float">
            {markTools}
          </div>
        </div>
      )}
      {ready && !embedded && (
        <div className="@container flex flex-none justify-center px-3 py-2">
          <div
            role="group"
            aria-label={labels.toolbar}
            data-slot="image-editor-toolbar"
            className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl bg-popover p-1 text-popover-foreground shadow-float"
          >
            <div className="flex items-center gap-0.5">
              {/* Narrow while marking, its tools in their place: the zoom
                  just its percent (+ and − zoom it still). */}
              <IconButton
                className={narrowMarking}
                label={labels.zoomOut}
                disabled={scale <= minScale}
                onClick={() => zoomTo(zoomOut(scale))}
              >
                <HugeiconsIcon icon={ZoomOutAreaIcon} strokeWidth={2} />
              </IconButton>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-w-16 tabular-nums"
                      disabled={zoom === "fit" && fit >= 1}
                      onClick={() => zoomTo(zoom === "fit" ? 1 : "fit")}
                    />
                  }
                >
                  {labels.zoom(percent, zoom === "fit" && fit < 1)}
                </TooltipTrigger>
                <TooltipContent>
                  {zoom === "fit" ? labels.actualSize : labels.fit}
                </TooltipContent>
              </Tooltip>
              <IconButton
                className={narrowMarking}
                label={labels.zoomIn}
                disabled={scale >= maxScale}
                onClick={() => zoomTo(zoomIn(scale))}
              >
                <HugeiconsIcon icon={ZoomInAreaIcon} strokeWidth={2} />
              </IconButton>
            </div>
            {actions && (
              <div className="flex items-center gap-0.5">{actions}</div>
            )}
            {markTools}
          </div>
        </div>
      )}
    </div>
  )
}

// Hidden where the toolbar is narrow while marking.
const narrowMarking = "@max-sm:group-data-marking/image-editor:hidden"

function IconButton({
  label,
  shortcut,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; shortcut?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn(touch, className)}
            {...(shortcut ? { "aria-keyshortcuts": shortcut } : {})}
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

const pointsOf = (points: readonly ImagePoint[]) =>
  points.map((point) => `${point.x},${point.y}`).join(" ")

/**
 * The marks, drawn in the image's pixels over it, with the brush's
 * outline where the pointer is: they zoom and scroll with it.
 */
function Sketch({
  marks,
  drawing,
  cursor,
  size,
  scale,
  origin,
}: {
  marks: readonly ImageMark[]
  drawing: ImageMark | undefined
  cursor: (ImagePoint & { size: number }) | undefined
  size: ImageSize
  scale: number
  origin: { left: number; top: number }
}) {
  if (marks.length === 0 && !cursor) return null
  return (
    <svg
      aria-hidden="true"
      data-slot="image-editor-marks"
      // Ink, not a state's colour: marking is no error. A white halo
      // round each keeps it seen on a dark image.
      className="pointer-events-none absolute overflow-visible text-neutral-900"
      style={{
        left: origin.left,
        top: origin.top,
        width: size.width * scale,
        height: size.height * scale,
      }}
      viewBox={`0 0 ${size.width} ${size.height}`}
    >
      {/* Under a brush's stroke, wider: its halo. */}
      <g
        opacity={0.5}
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {marks.map((mark, index) =>
          mark.kind !== "brush" ? null : mark.points.length === 1 ? (
            <circle
              key={index}
              cx={mark.points[0]!.x}
              cy={mark.points[0]!.y}
              r={mark.size / 2 + 2 / scale}
              fill="white"
              stroke="none"
            />
          ) : (
            <polyline
              key={index}
              points={pointsOf(mark.points)}
              strokeWidth={mark.size + 4 / scale}
            />
          )
        )}
      </g>
      {/* One opacity for them all: over each other, no darker. */}
      <g
        data-slot="image-editor-mark-fills"
        opacity={0.35}
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {marks.map((mark, index) =>
          mark.kind === "rect" ? (
            <rect
              key={index}
              x={mark.x}
              y={mark.y}
              width={mark.width}
              height={mark.height}
              stroke="none"
            />
          ) : mark.kind === "lasso" ? (
            <polygon key={index} points={pointsOf(mark.points)} stroke="none" />
          ) : mark.points.length === 1 ? (
            <circle
              key={index}
              cx={mark.points[0]!.x}
              cy={mark.points[0]!.y}
              r={mark.size / 2}
              stroke="none"
            />
          ) : (
            <polyline
              key={index}
              points={pointsOf(mark.points)}
              fill="none"
              strokeWidth={mark.size}
            />
          )
        )}
      </g>
      {/* Outlined, as thin at any zoom, on a white halo; in forced
          colors, they show. */}
      <g
        fill="none"
        stroke="white"
        strokeOpacity={0.8}
        strokeWidth={4}
        strokeLinejoin="round"
      >
        {marks.map((mark, index) =>
          mark.kind === "rect" ? (
            <rect
              key={index}
              x={mark.x}
              y={mark.y}
              width={mark.width}
              height={mark.height}
              vectorEffect="non-scaling-stroke"
            />
          ) : mark.kind === "lasso" ? (
            <polyline
              key={index}
              points={pointsOf(
                mark === drawing
                  ? mark.points
                  : [...mark.points, mark.points[0]!]
              )}
              vectorEffect="non-scaling-stroke"
            />
          ) : null
        )}
        {cursor && (
          <circle
            cx={cursor.x}
            cy={cursor.y}
            r={cursor.size / 2}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth={1.5}>
        {marks.map((mark, index) =>
          mark.kind === "rect" ? (
            <rect
              key={index}
              x={mark.x}
              y={mark.y}
              width={mark.width}
              height={mark.height}
              vectorEffect="non-scaling-stroke"
            />
          ) : mark.kind === "lasso" ? (
            mark === drawing ? (
              <polyline
                key={index}
                points={pointsOf(mark.points)}
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <polygon
                key={index}
                points={pointsOf(mark.points)}
                vectorEffect="non-scaling-stroke"
              />
            )
          ) : null
        )}
      </g>
      {cursor && (
        <circle
          data-slot="image-editor-brush"
          cx={cursor.x}
          cy={cursor.y}
          r={cursor.size / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

/** The app's action on the marks, below them, or above where no room. */
function MarkActions({
  bounds,
  scale = 1,
  origin = { left: 0, top: 0 },
  height = 0,
  disabled = false,
  labels,
  onSend,
  onClear,
}: {
  /** Where the marks are, for it to be by them; else in its bar's row. */
  bounds?: { x: number; y: number; width: number; height: number }
  scale?: number
  origin?: { left: number; top: number }
  height?: number
  disabled?: boolean
  labels: ImageEditorLabels
  onSend: () => Promise<void>
  onClear: () => void
}) {
  const [busy, setBusy] = React.useState(false)
  const [problem, setProblem] = React.useState("")
  const bar = 36
  const top = bounds ? origin.top + bounds.y * scale : 0
  const below = bounds ? top + bounds.height * scale + 6 : 0
  const clear = (
    <IconButton
      label={labels.clear}
      className="rounded-full"
      disabled={busy || disabled}
      onClick={onClear}
    >
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
    </IconButton>
  )
  return (
    <div
      data-slot="image-editor-mark-actions"
      className={cn(
        bounds
          ? "absolute flex cursor-default items-center gap-1 rounded-full bg-popover p-1 text-popover-foreground shadow-float"
          : "flex items-center gap-0.5",
        // Its lines, if a problem takes more than one.
        bounds && problem && "rounded-2xl"
      )}
      style={
        bounds
          ? {
              left: origin.left + bounds.x * scale,
              // Above, it grows up, as tall as what it says.
              ...(below + bar > height
                ? { bottom: height - Math.max(bar, top - 6) }
                : { top: below }),
            }
          : undefined
      }
    >
      {/* In a bar's row, after its tools: clear, then send. */}
      {!bounds && clear}
      <Button
        size="sm"
        className="rounded-full"
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true)
          setProblem("")
          try {
            await onSend()
          } catch (error) {
            setProblem(
              error instanceof Error && error.message
                ? error.message
                : labels.sendFailed
            )
            setBusy(false)
          }
        }}
      >
        {busy && <Spinner data-icon="inline-start" />}
        {busy ? labels.sending : labels.send}
      </Button>
      {bounds && clear}
      {problem && (
        <span
          role="alert"
          // A sentence or two, whole: on up to three lines.
          className="my-1 line-clamp-3 max-w-56 pe-2 text-sm leading-5 wrap-break-word text-destructive"
        >
          {problem}
        </span>
      )}
    </div>
  )
}

/** What changed, as the image opens: the rest dims, then clears. */
function Highlight({
  mask,
  style,
}: {
  mask: string
  style: React.CSSProperties
}) {
  const element = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const animation = element.current?.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 1, offset: 0.99 }, { opacity: 0 }]
        : [{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }],
      { duration: 2000, fill: "forwards" }
    )
    return () => animation?.cancel()
  }, [mask])
  return (
    <div
      ref={element}
      data-slot="image-editor-highlight"
      aria-hidden="true"
      className="pointer-events-none absolute rounded-md bg-background/70"
      style={{
        ...style,
        maskImage: `url(${JSON.stringify(mask)})`,
        maskSize: "100% 100%",
      }}
    />
  )
}

export {
  checkerboard,
  ImageEditor,
  markBounds,
  markImages,
  paintMarks,
  type ImageEditorLabels,
  type ImageMark,
  type ImageMarkTool,
  type ImagePoint,
  type ImageSize,
}
