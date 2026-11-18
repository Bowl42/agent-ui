"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Tick02Icon,
  Copy01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CancelCircleIcon,
} from "@hugeicons/core-free-icons"

// agent-ui: a card's corners (rounded-xl) and a hairline border, not the
// rounded-lg and the heavy border-input of a form field. Code at 12px on
// 20px lines, as an interface at 13px reads it, not at the prose's 14px.
// Clipped, not hidden, so a header can stick while the block scrolls by.
const codeBlockVariants = cva(
  "group/code-block relative flex w-full min-w-0 flex-col overflow-clip rounded-xl border border-border text-xs has-[>[data-slot=code-block-content]:focus-visible]:ring-3 has-[>[data-slot=code-block-content]:focus-visible]:ring-ring/50 data-[size=sm]:text-xs",
  {
    variants: {
      variant: {
        // agent-ui: on the page's surface in both themes, not a lighter
        // panel in dark. The destructive block (failed output) is told in
        // greys, by weight: its text and title heavier, not red.
        default:
          "text-foreground has-[>[data-slot=code-block-content]:focus-visible]:border-ring",
        destructive:
          "font-medium text-foreground has-[>[data-slot=code-block-content]:focus-visible]:border-ring",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// agent-ui: a long block folds to `lines` lines in its own card.
type CodeBlockLabels = {
  /** The fold's bar, closed: "Show all". */
  more: string
  /** The fold's bar, open. */
  less: string
  /** Beside it: how many lines it has, "22 lines". */
  lines: (lines: number) => string
  /** The header's button that folds it again while open. */
  collapse: string
}

const codeBlockLabels: CodeBlockLabels = {
  more: "Show all",
  less: "Show less",
  lines: (lines) => `${lines} ${lines === 1 ? "line" : "lines"}`,
  collapse: "Collapse",
}

type CodeBlockFold = {
  /** Its lines of code, a diff's @@ lines (`data-diff="hunk"`) not counted. */
  total: number
  long: boolean
  /** How tall it is folded, and its fade, both in pixels. */
  height: number
  mask: string
  /** The content's id, for the buttons' aria-controls. */
  controls: string
}

const CodeBlockContext = React.createContext<{
  open: boolean
  close: () => void
  controls: string
  labels: CodeBlockLabels
} | null>(null)

// agent-ui: the lines its content renders (`cut`); the rest is one
// plain text (`CodeBlockRest`), hidden until found while folded.
const CodeBlockCutContext = React.createContext<{
  cut: number | undefined
  hidden: boolean
  /** The rest changed: the bar's count follows. */
  measure: () => void
  /** The rest is near the view: render more of it as lines. */
  grow: () => void
} | null>(null)

// agent-ui: open, a long block's lines are rendered this many at a time,
// a few screens', as the rest nears the view.
const codeBlockStep = 250

/**
 * The lines a block's content renders, the rest a `CodeBlockRest`:
 * folded, as many as it shows (its `lines`), so a folded block of
 * thousands of lines costs a dozen; open, those near the view, more as
 * it scrolls. Undefined with no fold: all of them.
 */
function useCodeBlockCut() {
  return React.useContext(CodeBlockCutContext)?.cut
}

/**
 * Plain text cut after `cut` lines: the lines to render and the rest, or
 * null with nothing past the cut.
 */
function cutLines(
  text: string,
  cut: number | undefined
): [head: string, rest: string | null] {
  if (cut === undefined) return [text, null]
  let at = -1
  for (let line = 0; line < cut; line++) {
    at = text.indexOf("\n", at + 1)
    if (at === -1) return [text, null]
  }
  return [text.slice(0, at), text.slice(at + 1)]
}

function countLines(text: string) {
  let lines = 1
  for (let at = text.indexOf("\n"); at !== -1; at = text.indexOf("\n", at + 1))
    lines++
  return lines
}

/** Text in parts of `size` lines: each part's first line, text, lines. */
function textParts(text: string, size: number) {
  const parts: { at: number; text: string; lines: number }[] = []
  for (let from = 0, line = 0; ; line += size) {
    let end = from - 1
    let count = 0
    while (count < size && (end = text.indexOf("\n", end + 1)) !== -1) count++
    if (end === -1) {
      parts.push({ at: line, text: text.slice(from), lines: count + 1 })
      return parts
    }
    parts.push({ at: line, text: text.slice(from, end), lines: size })
    from = end + 1
  }
}

// agent-ui: one observer for every folding block, its code: its callback
// runs after layout, so many blocks mounting at once force no layout, and
// they are all set in the one render after it.
const foldReaders = new Map<Element, () => void>()
let foldObserver: ResizeObserver | undefined

function observeFold(code: Element, read: () => void) {
  foldObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) foldReaders.get(entry.target)?.()
  })
  foldReaders.set(code, read)
  foldObserver.observe(code)
  return () => {
    foldReaders.delete(code)
    foldObserver?.unobserve(code)
  }
}

/**
 * How the code folds to `lines` lines on screen (a wrapped line counts
 * each it takes), cut at a line's end and never inside one; a diff's @@
 * lines between them are shown but not counted. Reads only the lines up
 * to the cut, so output streaming in costs the same for any length.
 */
function measureFold(code: HTMLElement, lines: number) {
  const content = code.parentElement!
  const style = getComputedStyle(content)
  const lineHeight = parseFloat(style.lineHeight) || 20
  const box = code.getBoundingClientRect()
  const items = code.children
  // Not in lines (`CodeBlockLine`): plain text, its lines as it shows them.
  const text = items[0]?.getAttribute("data-slot") !== "code-block-line"
  let shown = 0
  let cut = 0
  let more = false
  if (text) {
    const all = Math.round(box.height / lineHeight)
    cut = Math.min(lines, all) * lineHeight
    more = all > lines
  } else
    for (let index = 0; index < items.length; index++) {
      const item = items[index] as HTMLElement
      if (item.dataset.diff === "hunk") continue
      // The lines past the fold, not rendered as lines.
      if (item.dataset.slot === "code-block-rest") {
        more = true
        break
      }
      // A line past the cut: there is more.
      if (shown === lines) {
        more = true
        break
      }
      const rect = item.getBoundingClientRect()
      const own = Math.max(1, Math.round(rect.height / lineHeight))
      const taken = Math.min(own, lines - shown)
      cut = rect.top - box.top + taken * lineHeight
      shown += taken
      if (taken < own) {
        more = true
        break
      }
    }
  const rest = code.lastElementChild as HTMLElement | null
  const restLines =
    rest?.dataset.slot === "code-block-rest" ? Number(rest.dataset.lines) : 0
  const total = text
    ? Math.round(box.height / lineHeight)
    : items.length -
      code.querySelectorAll(":scope > [data-diff=hunk]").length -
      (restLines ? 1 : 0) +
      restLines
  const top = parseFloat(style.paddingTop)
  const end = top + cut
  // Its last two lines fade out; under them its padding and, where it
  // scrolls sideways, its scrollbar.
  const fade = Math.max(top, end - 2 * lineHeight)
  const bar = content.offsetHeight - content.clientHeight
  const height = end + parseFloat(style.paddingBottom) + bar
  const round = (value: number) => Math.round(value * 100) / 100
  return {
    total,
    more,
    width: content.clientWidth,
    height: round(height),
    mask: `linear-gradient(to bottom, #000 ${round(fade)}px, transparent ${round(end)}px${bar ? `, transparent ${round(height - bar)}px, #000 ${round(height - bar)}px` : ""})`,
    controls: content.id,
  }
}

function CodeBlock({
  className,
  variant = "default",
  size = "default",
  lines,
  tone,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  labels: labelsProp,
  style,
  children,
  onFocusCapture,
  onScrollCapture,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof codeBlockVariants> & {
    size?: "default" | "sm"
    // agent-ui: longer than `lines` lines, it shows those, fading out, and
    // a bar across its foot that shows it all, saying how many lines it
    // has; open, the bar folds it again, as does a button in its header,
    // which stays at the top while the block scrolls by.
    lines?: number | undefined
    /**
     * agent-ui: its code's colours: the theme's syntax colours (by
     * default), or greys ("graphite": keywords by weight, strings a step
     * lighter). `data-code-tone="graphite"` on any element sets it for
     * the code in it.
     */
    tone?: "color" | "graphite" | undefined
    open?: boolean | undefined
    defaultOpen?: boolean | undefined
    onOpenChange?: ((open: boolean) => void) | undefined
    /** The fold's words, for other languages. */
    labels?: Partial<CodeBlockLabels> | undefined
  }) {
  const labels = { ...codeBlockLabels, ...labelsProp }
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolled
  // Opened by find in the page: for two frames its rest stays the plain
  // text the browser found the match in, shown, while it scrolls to it;
  // then its lines take its place, line for line.
  const [found, setFound] = React.useState(false)
  // Open, the lines rendered past `lines`; folded, back to one step.
  const [grown, setGrown] = React.useState(codeBlockStep)
  if (!open && grown !== codeBlockStep) setGrown(codeBlockStep)
  const root = React.useRef<HTMLDivElement>(null)
  const [fold, setFold] = React.useState<CodeBlockFold | null>(null)
  // How wide it was when last found longer than `lines`, while it is long.
  const longAt = React.useRef<number | null>(null)
  const shown = lines !== undefined && fold?.long ? fold : null
  const long = shown !== null
  const folded = long && !open
  // Until it is measured, cut at `lines` lines of code, so a long block
  // never shows whole for a frame.
  const pending = lines !== undefined && fold === null && !open

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }
  // Folding keeps its start in view, e.g. folded from the header far
  // down a long block; its first part where it is, folded, still taller
  // than the view.
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => {
      const options = { block: "nearest", behavior: "instant" } as const
      root.current?.scrollIntoView(options)
      root.current?.firstElementChild?.scrollIntoView(options)
    })
  }

  const read = React.useEffectEvent((code: HTMLElement) => {
    if (lines === undefined) return
    const measured = measureFold(code, lines)
    if (measured.more) longAt.current = measured.width
    // Fitting only once wider than where it did not, it stays long: being
    // long may be what widened it (a scrollbar of the page gone with its
    // lines), and the two would take turns every frame.
    else if (longAt.current === null || measured.width <= longAt.current)
      longAt.current = null
    const next: CodeBlockFold = {
      total: measured.total,
      long: longAt.current !== null,
      height: measured.height,
      mask: measured.mask,
      controls: measured.controls,
    }
    setFold((last) =>
      last &&
      last.total === next.total &&
      last.long === next.long &&
      last.height === next.height &&
      last.mask === next.mask &&
      last.controls === next.controls
        ? last
        : next
    )
  })

  // The code it folds, looked for again after each render: the app may
  // render its content later, or another in its place.
  const observed = React.useRef<{
    code: HTMLElement
    lines: number
    measure: () => void
    stop: () => void
  } | null>(null)
  // Watched until it is gone, its fold forgotten then.
  const watch = (code: HTMLElement, lines: number) => {
    const measure = () => read(code)
    const stop = observeFold(code, measure)
    return {
      code,
      lines,
      measure,
      stop: () => {
        stop()
        setFold(null)
      },
    }
  }
  React.useLayoutEffect(() => {
    const code =
      lines === undefined
        ? null
        : (root.current?.querySelector<HTMLElement>(
            ":scope > [data-slot=code-block-content] > [data-slot=code-block-code]"
          ) ?? null)
    const was = observed.current
    if (was?.code === code && was?.lines === lines) return
    was?.stop()
    longAt.current = null
    observed.current = code && lines !== undefined ? watch(code, lines) : null
  })
  React.useEffect(
    () => () => {
      observed.current?.stop()
      observed.current = null
    },
    []
  )

  // agent-ui: find in the page reaching its rest (hidden until found)
  // opens it, before the browser scrolls to what it found.
  const reveal = React.useEffectEvent((event: Event) => {
    const code = observed.current?.code
    if (open || !code?.contains(event.target as Node)) return
    flushSync(() => {
      setFound(true)
      setOpen(true)
    })
  })
  React.useEffect(() => {
    const node = root.current
    node?.addEventListener("beforematch", reveal)
    return () => node?.removeEventListener("beforematch", reveal)
  }, [])
  React.useEffect(() => {
    if (!found) return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setFound(false))
    })
    return () => cancelAnimationFrame(frame)
  }, [found])

  const context = shown && { open, close, controls: shown.controls, labels }
  const measure = React.useCallback(() => observed.current?.measure(), [])
  const grow = React.useCallback(
    () => setGrown((grown) => grown + codeBlockStep),
    []
  )
  const cut = React.useMemo(
    () => ({
      cut:
        lines === undefined
          ? undefined
          : !open || found
            ? lines
            : lines + grown,
      hidden: lines !== undefined && !open,
      measure,
      grow,
    }),
    [lines, open, found, grown, measure, grow]
  )

  return (
    <div
      ref={root}
      data-slot="code-block"
      data-code-tone={tone}
      data-variant={variant}
      data-size={size}
      data-fold={
        long ? (open ? "open" : "closed") : pending ? "pending" : undefined
      }
      className={cn(codeBlockVariants({ variant }), className)}
      style={
        shown
          ? ({
              "--code-block-fold": `${shown.height}px`,
              "--code-block-fold-mask": shown.mask,
              ...style,
            } as React.CSSProperties)
          : pending
            ? ({
                "--code-block-fold": `${lines}lh`,
                ...style,
              } as React.CSSProperties)
            : style
      }
      // agent-ui: something focused in the folded part, or scrolled to
      // there (find in the page), opens it (WCAG 2.4.11).
      onFocusCapture={(event) => {
        onFocusCapture?.(event)
        const content = observed.current?.code.parentElement
        if (!folded || !content?.contains(event.target)) return
        const bottom =
          event.target.getBoundingClientRect().bottom -
          content.getBoundingClientRect().top +
          content.scrollTop
        if (bottom > content.clientHeight + 1) setOpen(true)
      }}
      onScrollCapture={(event) => {
        onScrollCapture?.(event)
        const content = observed.current?.code.parentElement
        if (folded && event.target === content && content.scrollTop > 0)
          setOpen(true)
      }}
      {...props}
    >
      <CodeBlockContext value={context}>
        <CodeBlockCutContext value={cut}>{children}</CodeBlockCutContext>
      </CodeBlockContext>
      {shown && (
        <button
          type="button"
          data-slot="code-block-fold"
          aria-expanded={open}
          aria-controls={shown.controls || undefined}
          onClick={() => (open ? close() : setOpen(true))}
          className="flex h-9 w-full shrink-0 cursor-pointer items-center gap-1 rounded-b-xl border-t border-border ps-3 pe-2 text-start text-xs text-muted-foreground outline-none group-data-[size=sm]/code-block:h-8 group-data-[size=sm]/code-block:ps-2 hover:bg-sidebar focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset dark:hover:bg-muted/50 pointer-coarse:h-11 [&_svg]:size-3.5 [&_svg]:shrink-0"
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            aria-hidden="true"
            className="transition-transform in-aria-expanded:rotate-180 motion-reduce:transition-none"
          />
          <span className="font-medium text-foreground">
            {open ? labels.less : labels.more}
          </span>{" "}
          <span className="truncate tabular-nums">
            {labels.lines(shown.total)}
          </span>
        </button>
      )}
    </div>
  )
}

function CodeBlockHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const fold = React.useContext(CodeBlockContext)
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        // agent-ui: a 36px bar (32px small) over a divider, not loose
        // text above the code. A long block open, it stays at the top of
        // what scrolls while the block passes under it.
        "flex h-9 min-w-0 shrink-0 items-center gap-2 border-b border-border ps-3 pe-2 text-muted-foreground group-data-[fold=open]/code-block:sticky group-data-[fold=open]/code-block:top-0 group-data-[fold=open]/code-block:z-10 group-data-[fold=open]/code-block:bg-background group-data-[size=sm]/code-block:h-8 group-data-[size=sm]/code-block:ps-2 group-data-[size=sm]/code-block:pe-1 *:has-[>[data-slot=code-block-title]]:min-w-0",
        className
      )}
      {...props}
    >
      {children}
      {fold?.open && (
        <Button
          data-slot="code-block-collapse"
          variant="ghost"
          size="icon-sm"
          aria-label={fold.labels.collapse}
          aria-controls={fold.controls || undefined}
          onClick={fold.close}
          className="touch-target relative ms-auto [[data-slot=code-block-actions]~&]:-ms-1"
        >
          <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
        </Button>
      )}
    </div>
  )
}

function CodeBlockTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-title"
      className={cn(
        // agent-ui: the file or language in grey mono, a label of the
        // code, not a heading in the foreground.
        "min-w-0 truncate font-mono text-xs text-muted-foreground group-data-[variant=destructive]/code-block:font-medium group-data-[variant=destructive]/code-block:text-foreground [&_svg]:pointer-events-none [&_svg]:inline-block [&_svg]:align-middle [&_svg:not([class*='size-'])]:size-3.5 *:[svg]:me-1",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-actions"
      className={cn(
        // agent-ui: one size for its buttons and toggles, 28px with 16px
        // icons, not each its own; pressed, tinted by the foreground, as
        // the muted tint is the dark theme's surface here and vanished.
        // agent-ui: with no header they float over the code, raised by
        // shadow-float as everything that floats, not a ring.
        "ms-auto flex shrink-0 items-center gap-1 [&>[aria-pressed]]:px-1 [&>[aria-pressed]_svg:not([class*='size-'])]:size-4 [&>[data-slot][aria-pressed=true]]:bg-foreground/5 dark:[&>[data-slot][aria-pressed=true]]:bg-foreground/10 [[data-slot=code-block]>&]:absolute [[data-slot=code-block]>&]:end-2 [[data-slot=code-block]>&]:top-2 [[data-slot=code-block]>&]:z-10 [[data-slot=code-block]>&]:m-0 [[data-slot=code-block]>&]:opacity-0 [[data-slot=code-block]>&]:transition-opacity [[data-slot=code-block]>&]:group-focus-within/code-block:opacity-100 [[data-slot=code-block]>&]:group-hover/code-block:opacity-100 group-data-[size=sm]/code-block:[[data-slot=code-block]>&]:end-1 group-data-[size=sm]/code-block:[[data-slot=code-block]>&]:top-1 [[data-slot=code-block]>&]:pointer-coarse:opacity-100 [[data-slot=code-block]>&]:*:[button]:bg-background [[data-slot=code-block]>&]:*:[button]:shadow-float dark:[[data-slot=code-block]>&]:*:[button]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

// agent-ui: the copy button's words' type, exported, so an app's
// translation names every key.
type CodeBlockCopyButtonLabels = {
  copy: string
  copied: string
  /** The clipboard refused, or the page has none. */
  failed: string
}


function CodeBlockCopyButton({
  value,
  variant = "ghost",
  // agent-ui: the size of the header's other buttons (as the app's
  // CopyButton), not smaller than them.
  size = "icon-sm",
  className,
  onClick,
  labels,
  ...props
}: React.ComponentProps<typeof Button> & {
  value: string
  // agent-ui: the button's name and the announcement, for other languages.
  labels?: Partial<CodeBlockCopyButtonLabels>
}) {
  // agent-ui: what was copied or refused, so a value that has changed since
  // (e.g. streaming) is not announced as copied, even if the copy finishes
  // late. A failure is said, as CopyButton says it.
  const [result, setResult] = React.useState<{
    value: string
    copied: boolean
  } | null>(null)
  const copied = result?.value === value && result.copied
  const failed = result?.value === value && !result.copied
  const label = copied
    ? (labels?.copied ?? "Copied")
    : failed
      ? (labels?.failed ?? "Could not copy")
      : (labels?.copy ?? "Copy")

  React.useEffect(() => {
    if (result === null) {
      return
    }

    const timeout = setTimeout(() => setResult(null), 2000)
    return () => clearTimeout(timeout)
  }, [result])

  return (
    <>
      <Button
        data-slot="code-block-copy-button"
        data-copied={copied || undefined}
        data-failed={failed || undefined}
        variant={variant}
        size={size}
        aria-label={label}
        className={cn(className)}
        onClick={(event) => {
          onClick?.(event)
          // agent-ui: in a promise, so a page without a clipboard (plain
          // http is not a secure context) fails as a refusal does, not
          // with a throw.
          Promise.resolve()
            .then(() => navigator.clipboard.writeText(value))
            .then(
              () => setResult({ value, copied: true }),
              () => setResult({ value, copied: false })
            )
        }}
        {...props}
      >
        {copied ? (
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        ) : failed ? (
          <HugeiconsIcon
            icon={CancelCircleIcon}
            strokeWidth={2}
            className="text-destructive"
          />
        ) : (
          <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
        )}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied || failed ? label : ""}
      </span>
    </>
  )
}

function CodeBlockContent({
  id,
  className,
  children,
  style,
  wrap = false,
  lineNumbers = false,
  startLine = 1,
  ...props
}: React.ComponentProps<"pre"> & {
  wrap?: boolean
  lineNumbers?: boolean
  startLine?: number
}) {
  const cut = useCodeBlockCut()
  let lines: React.ReactNode[] | undefined
  let count = 0
  if (lineNumbers && typeof children === "string") {
    const [head, rest] = cutLines(children.replace(/\n$/, ""), cut)
    lines = head
      .split("\n")
      .map((line, index) => <CodeBlockLine key={index}>{line}</CodeBlockLine>)
    count = lines.length
    if (rest !== null) {
      const restLines = countLines(rest)
      count += restLines
      lines.push(
        <CodeBlockRest key="rest" lines={restLines}>
          {rest}
        </CodeBlockRest>
      )
    }
  } else
    React.Children.forEach(children, (child) => {
      if (child === null || typeof child === "boolean") return
      // The rest counts its lines, for the gutter's width.
      count +=
        React.isValidElement<React.ComponentProps<typeof CodeBlockRest>>(
          child
        ) && child.type === CodeBlockRest
          ? (child.props.lines ?? countLines(child.props.children))
          : 1
    })
  // agent-ui: an id of its own, for a fold's buttons to name what they
  // show and hide.
  const ownId = React.useId()
  return (
    <pre
      id={id ?? ownId}
      data-slot="code-block-content"
      data-wrap={wrap || undefined}
      data-numbered={lineNumbers || undefined}
      dir="ltr"
      // agent-ui: code, output and diffs are not prose: a page translator
      // (Chrome's) leaves them as they are, not rewritten into nonsense.
      translate="no"
      tabIndex={0}
      style={{ counterReset: `line ${startLine - 1}`, ...style }}
      className={cn(
        // agent-ui: the header and footer are matched as children (has-[>…]),
        // not anywhere inside: with a descendant :has(), every line added
        // makes the browser search and restyle the whole block.
        // agent-ui: it fades at the edges it scrolls past, both ways
        // (wrapped or not): the masks of both fades, each animated by its
        // own axis; with one fade a block that scrolls down was cut off.
        "[--scroll-fade-mask:var(--scroll-fade-inline),var(--scroll-fade-block)] supports-[animation-timeline:scroll()]:[animation-name:scroll-fade-reveal-s,scroll-fade-reveal-e,scroll-fade-reveal-t,scroll-fade-reveal-b] supports-[animation-timeline:scroll()]:[animation-timeline:scroll(self_inline),scroll(self_inline),scroll(self_y),scroll(self_y)]",
        // agent-ui: folded, as tall as its block measured, its last lines
        // fading out, its sideways fades kept; before it is measured, its
        // code as tall as the lines it shows folded.
        "group-data-[fold=closed]/code-block:max-h-(--code-block-fold) group-data-[fold=closed]/code-block:overflow-y-hidden group-data-[fold=closed]/code-block:[--scroll-fade-mask:var(--scroll-fade-inline),var(--code-block-fold-mask)] group-data-[fold=pending]/code-block:box-content group-data-[fold=pending]/code-block:max-h-(--code-block-fold) group-data-[fold=pending]/code-block:overflow-y-hidden",
        "min-h-0 min-w-0 scroll-fade-x scroll-fade-y scrollbar-thin overflow-auto px-3 py-3 text-start font-mono leading-5 outline-none group-has-[>[data-slot=code-block-footer]]/code-block:pb-2 group-has-[>[data-slot=code-block-header]]/code-block:pt-2 group-data-[size=sm]/code-block:px-2 group-data-[size=sm]/code-block:py-2 group-data-[size=sm]/code-block:group-has-[>[data-slot=code-block-header]]/code-block:pt-1 data-wrap:wrap-break-word data-wrap:whitespace-pre-wrap",
        className
      )}
      {...props}
    >
      {/* agent-ui: blocks, not a grid, with or without numbers: a grid
          of every line is laid out again on each line added, many times
          slower as code streams in. The numbers are in a gutter as wide
          as the last one's digits, and at least
          `--code-block-gutter-min` (24px), e.g. narrower for a short
          snippet in prose. */}
      <code
        data-slot="code-block-code"
        className="block min-h-lh min-w-max in-data-wrap:min-w-0"
        style={
          lineNumbers
            ? ({
                "--code-block-gutter": `max(var(--code-block-gutter-min, 1.5rem), ${String(startLine - 1 + count).length}ch)`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {lines ?? children}
      </code>
    </pre>
  )
}

const codeBlockLineVariants = cva(
  "relative -mx-3 block min-h-lh px-3 group-data-[size=sm]/code-block:-mx-2 group-data-[size=sm]/code-block:px-2 before:text-end before:text-muted-foreground/70 after:absolute after:start-1 after:top-0 after:text-muted-foreground after:select-none in-data-numbered:ps-[calc(var(--code-block-gutter)+1.5rem)] in-data-numbered:[counter-increment:line] in-data-numbered:before:absolute in-data-numbered:before:start-3 in-data-numbered:before:top-0 in-data-numbered:before:w-(--code-block-gutter) group-data-[size=sm]/code-block:in-data-numbered:ps-[calc(var(--code-block-gutter)+1.25rem)] group-data-[size=sm]/code-block:in-data-numbered:before:start-2 in-data-numbered:before:content-[counter(line)] in-data-numbered:before:select-none in-data-numbered:supports-[content:counter(line)_/_'']:before:content-[counter(line)_/_'']",
  {
    variants: {
      variant: {
        default: "",
        // agent-ui: a diff in greys, as the theme is, not red and green:
        // an added line is told by its + and a light grey, a removed one
        // by its −, struck through in the faintest grey on no tint, as
        // text that is gone. Every syntax and ANSI colour stays at 4.5:1
        // on the added tint; the + is in the foreground.
        added: "bg-foreground/5 after:text-foreground after:content-['+']",
        removed:
          "text-subtle-foreground line-through decoration-subtle-foreground after:text-subtle-foreground after:content-['−']",
        // agent-ui: tinted by the foreground: the muted tint is the dark
        // theme's surface here, and vanished; a step over an added line's.
        highlighted: "bg-foreground/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function CodeBlockLine({
  className,
  variant = "default",
  number,
  style,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof codeBlockLineVariants> & {
    // agent-ui: its own number, in a numbered block (e.g. a diff's line
    // in its file), not only the next one; the lines after it go on from
    // it. Also `data-number`, for a gutter of the app's own.
    number?: number | undefined
  }) {
  // An empty line holds a newline so copying a selection keeps blank lines.
  const empty =
    children === undefined ||
    children === null ||
    children === "" ||
    (Array.isArray(children) && children.length === 0)

  return (
    <span
      data-slot="code-block-line"
      data-variant={variant}
      data-number={number}
      className={cn(codeBlockLineVariants({ variant }), className)}
      style={
        number === undefined
          ? style
          : { counterSet: `line ${number - 1}`, ...style }
      }
      {...props}
    >
      <span data-slot="code-block-line-content" className="min-w-0">
        {empty ? "\n" : children}
      </span>
    </span>
  )
}

// agent-ui: a line whose props are unchanged is not rendered again, so
// output that streams in renders only its new lines, not every line.
const MemoCodeBlockLine = React.memo(CodeBlockLine)

/**
 * agent-ui: the lines past a fold as one plain text, not a line each: a
 * folded block of thousands costs what it shows. Hidden until found, so
 * find in the page reaches it and opens the block. Open, it is shown in
 * line with the lines, and turns into them a step at a time as it nears
 * the view, each line where its text was. Its `lines` are counted from
 * its text unless given (e.g. a diff's, its @@ lines not counted).
 */
function CodeBlockRest({
  className,
  children,
  lines,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  children: string
  lines?: number | undefined
}) {
  const fold = React.useContext(CodeBlockCutContext)
  const ref = React.useRef<HTMLSpanElement>(null)
  // In parts of a step's lines, keyed by their place in the block: as
  // the lines grow into the rest, the parts after are left as they were.
  const parts = textParts(children, codeBlockStep)
  const start = fold?.cut ?? 0
  const count = lines ?? parts.reduce((sum, part) => sum + part.lines, 0)
  const hidden = fold?.hidden ?? false
  // React sets `hidden` only as true or false.
  React.useLayoutEffect(() => {
    if (hidden) ref.current?.setAttribute("hidden", "until-found")
    else ref.current?.removeAttribute("hidden")
  }, [hidden])
  const measure = fold?.measure
  React.useLayoutEffect(() => measure?.(), [count, measure])
  // Shown, within a screen of the view's foot: more lines. Looked at
  // again on scrolling and after each step, so a jump far down fills in.
  const grow = fold?.grow
  React.useEffect(() => {
    if (hidden || !grow) return
    let frame = 0
    const look = () => {
      frame = 0
      const top = ref.current?.getBoundingClientRect().top
      if (top !== undefined && top < 2 * window.innerHeight) grow()
    }
    const later = () => {
      frame ||= requestAnimationFrame(look)
    }
    later()
    const options = { capture: true, passive: true }
    window.addEventListener("scroll", later, options)
    window.addEventListener("resize", later)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", later, options)
      window.removeEventListener("resize", later)
    }
  }, [hidden, grow, children])
  return (
    <span
      ref={ref}
      data-slot="code-block-rest"
      data-lines={count}
      className={cn(
        "-mx-3 block px-3 group-data-[size=sm]/code-block:-mx-2 group-data-[size=sm]/code-block:px-2 in-data-numbered:ps-[calc(var(--code-block-gutter)+1.5rem)] group-data-[size=sm]/code-block:in-data-numbered:ps-[calc(var(--code-block-gutter)+1.25rem)]",
        className
      )}
      {...props}
    >
      {/* Each part laid out only near the view, as tall as its lines
          until it is. */}
      {parts.map((part) => (
        <span
          key={start + part.at}
          className="block"
          style={{
            contentVisibility: "auto",
            containIntrinsicBlockSize: `auto ${part.lines}lh`,
          }}
        >
          {part.text}
        </span>
      ))}
    </span>
  )
}

function CodeBlockFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-footer"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2 px-3 pb-3 text-muted-foreground group-data-[size=sm]/code-block:px-2 group-data-[size=sm]/code-block:pb-2",
        className
      )}
      {...props}
    />
  )
}

export {
  CodeBlock,
  type CodeBlockLabels,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  type CodeBlockCopyButtonLabels,
  CodeBlockContent,
  MemoCodeBlockLine as CodeBlockLine,
  CodeBlockRest,
  CodeBlockFooter,
  useCodeBlockCut,
  cutLines,
}
