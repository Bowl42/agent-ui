"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Pdf01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { textRanges } from "@/components/search-highlight"
import {
  ViewerFind,
  ViewerFrame,
  ViewerStatusValue,
  ViewerTool,
  ViewerZoom,
  nextZoom,
  type ViewerFrameProps,
  type ViewerLabels,
} from "@/components/viewer"

/**
 * A page as the app rendered it, e.g. with PDF.js: its canvas and its text
 * layer (the find bar searches the text), at its size at 100%.
 */
type PdfPage = {
  content: React.ReactNode
  /** Its small picture in the pages' rail; by default a blank page. */
  thumbnail?: React.ReactNode
  /** Its size at 100%, in CSS pixels. */
  width: number
  height: number
}

type PdfViewerLabels = {
  find: string
  previousMatch: string
  nextMatch: string
  closeFind: string
  /** "2 of 5"; none found. */
  matches: (current: number, total: number) => string
  noMatches: string
  previousPage: string
  nextPage: string
  /** "2 / 12", and for a screen reader "Page 2 of 12". */
  page: (page: number, count: number | undefined) => string
  pageName: (page: number, count: number | undefined) => string
  pages: string
  /** The facts: "12 pages". */
  pageCount: (count: number) => string
}

const defaultLabels: PdfViewerLabels = {
  find: "Find",
  previousMatch: "Previous match",
  nextMatch: "Next match",
  closeFind: "Close find",
  matches: (current, total) => `${current} of ${total}`,
  noMatches: "No matches",
  previousPage: "Previous page",
  nextPage: "Next page",
  page: (page, count) => (count ? `${page} / ${count}` : `${page}`),
  pageName: (page, count) =>
    count ? `Page ${page} of ${count}` : `Page ${page}`,
  pages: "Pages",
  pageCount: (count) => `${count} ${count === 1 ? "page" : "pages"}`,
}

// The find's marks, by the CSS Custom Highlight API: on the app's text as
// it is, no elements added. In greys, as the page's ink (pages are white in
// either theme): a tint of it under each match, a darker one under the
// current one, its text the page's own.
const findHighlight = "viewer-find"
const currentHighlight = "viewer-find-current"
const ink = "oklch(0.21 0.006 285.885)"
const highlightStyle = `::highlight(${findHighlight}){background-color:color-mix(in oklab,${ink} 14%,transparent)}::highlight(${currentHighlight}){background-color:color-mix(in oklab,${ink} 30%,transparent)}`

const gap = 16

/**
 * A PDF to read. With the app's `pages` (rendered as it likes, e.g. by
 * PDF.js): the pages' rail, the pages one under another, going from page
 * to page, zoom, and a find bar (Ctrl or Cmd+F) marking what it finds in
 * their text. With only a `src`: the browser's own PDF viewer in a frame,
 * told the page and zoom.
 */
function PdfViewer({
  src,
  pages,
  pageCount: pageCountProp,
  page: pageProp,
  onPageChange,
  details = [],
  labels: labelsProp,
  icon = <HugeiconsIcon icon={Pdf01Icon} strokeWidth={2} />,
  ...frame
}: ViewerFrameProps & {
  /** The file, for the browser's viewer where the app has no `pages`. */
  src?: string | undefined
  pages?: readonly PdfPage[] | undefined
  /** How many pages it has, if the app knows (its `pages` say so). */
  pageCount?: number | undefined
  /** The page shown, from 1: the viewer's own, or the app's. */
  page?: number | undefined
  onPageChange?: ((page: number) => void) | undefined
  labels?: Partial<PdfViewerLabels & ViewerLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const count = pages?.length ?? pageCountProp
  const [ownPage, setOwnPage] = React.useState(1)
  const page = pageProp ?? ownPage
  const [zoom, setZoom] = React.useState<number | "fit">(pages ? "fit" : 1)

  const scroller = React.useRef<HTMLDivElement>(null)
  const sheets = React.useRef<HTMLDivElement>(null)
  const [room, setRoom] = React.useState(0)
  React.useLayoutEffect(() => {
    const node = scroller.current
    if (!node) return
    const measure = () => {
      if (node.getClientRects().length > 0) setRoom(node.clientWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const widest = Math.max(0, ...(pages ?? []).map((each) => each.width))
  const fitted =
    widest && room ? Math.min(1, Math.max(0.1, (room - gap * 2) / widest)) : 1
  const scale = zoom === "fit" ? fitted : zoom

  // The page in view as the reader scrolls: the one across the middle.
  const going = React.useRef(false)
  const setPage = (next: number) => {
    setOwnPage(next)
    onPageChange?.(next)
  }
  const goTo = (next: number) => {
    const target = Math.min(count ?? next, Math.max(1, next))
    setPage(target)
    const sheet = sheets.current?.children[target - 1] as
      HTMLElement | undefined
    const node = scroller.current
    if (sheet && node) {
      going.current = true
      node.scrollTop = sheet.offsetTop - gap
      requestAnimationFrame(() => (going.current = false))
    }
  }

  // Find.
  const [finding, setFinding] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [hit, setHit] = React.useState(0)
  const [ranges, setRanges] = React.useState<Range[]>([])
  const input = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    const root = sheets.current
    if (!root || !finding) {
      setRanges([])
      return
    }
    setRanges(textRanges(root, query))
  }, [finding, query, pages])
  const current = ranges.length
    ? ((hit % ranges.length) + ranges.length) % ranges.length
    : -1
  React.useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return
    const registry = CSS.highlights
    registry.set(findHighlight, new Highlight(...ranges))
    const range = ranges[current]
    if (range) {
      registry.set(currentHighlight, new Highlight(range))
      // In view: the match, and its page.
      const node = scroller.current
      const box = range.getBoundingClientRect()
      const view = node?.getBoundingClientRect()
      if (node && view && (box.top < view.top || box.bottom > view.bottom))
        node.scrollTop += box.top - view.top - view.height / 3
    } else registry.delete(currentHighlight)
    return () => {
      registry.delete(findHighlight)
      registry.delete(currentHighlight)
    }
  }, [ranges, current])
  const openFind = () => {
    setFinding(true)
    requestAnimationFrame(() => input.current?.select())
  }
  const closeFind = () => {
    setFinding(false)
    setQuery("")
    scroller.current?.focus()
  }

  // The browser's own viewer, told the page and zoom by the address.
  const native = !pages && src !== undefined
  const address = native
    ? `${src}#page=${page}&zoom=${Math.round(scale * 100)}&toolbar=0&navpanes=0`
    : undefined

  return (
    <ViewerFrame
      data-viewer="pdf"
      icon={icon}
      labels={labelsProp}
      tools={
        pages && (
          <ViewerTool
            label={labels.find}
            pressed={finding}
            onClick={() => (finding ? closeFind() : openFind())}
          >
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          </ViewerTool>
        )
      }
      controls={
        <>
          <ViewerTool
            label={labels.previousPage}
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              strokeWidth={2}
              className="rtl:rotate-180"
            />
          </ViewerTool>
          <ViewerStatusValue
            aria-label={labels.pageName(page, count)}
            className="min-w-12"
          >
            {labels.page(page, count)}
          </ViewerStatusValue>
          <ViewerTool
            label={labels.nextPage}
            disabled={count !== undefined && page >= count}
            onClick={() => goTo(page + 1)}
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="rtl:rotate-180"
            />
          </ViewerTool>
        </>
      }
      zoom={
        <ViewerZoom
          zoom={scale}
          fit={zoom === "fit"}
          onZoomChange={setZoom}
          {...(pages ? { onFit: () => setZoom("fit") } : {})}
          labels={labelsProp ?? {}}
        />
      }
      facts={["PDF", count && labels.pageCount(count), ...details]}
      {...frame}
    >
      {native ? (
        <iframe
          src={address}
          title={frame.name}
          data-slot="pdf-viewer-frame"
          className="block size-full flex-1 border-0 bg-muted"
        />
      ) : (
        <div
          className="@container flex min-h-0 flex-1 bg-muted/50 dark:bg-background"
          onKeyDown={(event) => {
            if (
              (event.metaKey || event.ctrlKey) &&
              !event.shiftKey &&
              !event.altKey &&
              event.key.toLowerCase() === "f"
            ) {
              event.preventDefault()
              event.stopPropagation()
              openFind()
            }
          }}
        >
          <style href="agent-ui-viewer-find" precedence="default">
            {highlightStyle}
          </style>
          {pages && pages.length > 1 && (
            <nav
              aria-label={labels.pages}
              data-slot="pdf-viewer-rail"
              className="hidden w-21 shrink-0 flex-col items-center gap-3 overflow-y-auto border-e py-3 @lg:flex"
            >
              {pages.map((each, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={labels.pageName(index + 1, count)}
                  aria-current={index + 1 === page ? "page" : undefined}
                  className="group/thumb flex flex-col items-center gap-1 rounded-sm text-2xs text-muted-foreground outline-none aria-[current]:text-foreground"
                  onClick={() => goTo(index + 1)}
                >
                  <span
                    className="block w-13 overflow-hidden rounded-xs bg-white ring-1 ring-border group-focus-visible/thumb:ring-3 group-focus-visible/thumb:ring-ring/50 group-aria-[current]/thumb:outline-2 group-aria-[current]/thumb:outline-offset-2 group-aria-[current]/thumb:outline-foreground"
                    style={{ aspectRatio: `${each.width} / ${each.height}` }}
                  >
                    {each.thumbnail}
                  </span>
                  <span aria-hidden="true">{index + 1}</span>
                </button>
              ))}
            </nav>
          )}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              ref={scroller}
              role="document"
              tabIndex={0}
              aria-label={frame.name}
              data-slot="pdf-viewer-pages"
              className="min-h-0 flex-1 overflow-auto outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              onScroll={(event) => {
                if (going.current) return
                const node = event.currentTarget
                const middle = node.scrollTop + node.clientHeight / 3
                const children = Array.from(
                  sheets.current?.children ?? []
                ) as HTMLElement[]
                const index = children.findLastIndex(
                  (child) => child.offsetTop <= middle
                )
                if (index >= 0 && index + 1 !== page) setPage(index + 1)
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.altKey || event.ctrlKey || event.metaKey) return
                if (event.key === "+" || event.key === "=")
                  setZoom(nextZoom(scale, 1))
                else if (event.key === "-") setZoom(nextZoom(scale, -1))
                else if (event.key === "0" && pages) setZoom("fit")
                else return
                event.preventDefault()
              }}
            >
              <div
                ref={sheets}
                className="relative flex w-max min-w-full flex-col items-center"
                style={{ gap, padding: `${gap + 4}px ${gap}px` }}
              >
                {pages?.map((each, index) => (
                  <div
                    key={index}
                    role="region"
                    aria-label={labels.pageName(index + 1, count)}
                    data-slot="pdf-viewer-page"
                    className="shrink-0 overflow-hidden rounded-xs bg-white text-neutral-900 shadow-float"
                    style={{
                      width: each.width * scale,
                      height: each.height * scale,
                    }}
                  >
                    <div
                      style={{
                        width: each.width,
                        height: each.height,
                        zoom: scale,
                      }}
                    >
                      {each.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {finding && (
              <ViewerFind
                ref={input}
                value={query}
                onValueChange={(value) => {
                  setQuery(value)
                  setHit(0)
                }}
                status={
                  ranges.length === 0
                    ? labels.noMatches
                    : labels.matches(current + 1, ranges.length)
                }
                onStep={(by) => setHit((hit) => hit + by)}
                canStep={ranges.length > 0}
                onClose={closeFind}
                label={labels.find}
                previousLabel={labels.previousMatch}
                nextLabel={labels.nextMatch}
                closeLabel={labels.closeFind}
              />
            )}
          </div>
        </div>
      )}
    </ViewerFrame>
  )
}

export { PdfViewer, type PdfPage, type PdfViewerLabels }
