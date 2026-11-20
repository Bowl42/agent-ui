"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  CodeIcon,
  Search01Icon,
  TextWrapIcon,
} from "@hugeicons/core-free-icons"

import { CopyButton } from "@/components/copy-button"
import {
  markMatches,
  SearchMark,
  textMatches,
  type TextMatch,
} from "@/components/search-highlight"
import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { Toggle } from "@/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ViewerFind,
  ViewerFrame,
  ViewerStatusButton,
  ViewerStatusSeparator,
  ViewerStatusText,
  ViewerTool,
  viewerTool,
  type ViewerFrameProps,
} from "@/components/viewer"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"

/** Which lines fold: from a line (from 1) to the last it hides, with it. */
type FoldRanges = ReadonlyMap<number, number>

/** Past this many lines, nothing folds: finding them costs too much. */
const foldLimit = 20_000

const indentOf = (line: string) => {
  let width = 0
  for (const char of line) {
    if (char === " ") width += 1
    else if (char === "\t") width += 4
    else return width
  }
  // Blank: in whatever it is between.
  return undefined
}

/**
 * Where code folds, by its indentation, as VS Code's default: a line the
 * next is deeper than starts a range, to before the indentation is back.
 * Any language, without a grammar: JSON, YAML, Python, braces. A closing
 * `}` is at its opening's depth, left out, to be seen.
 */
function foldRanges(lines: readonly string[]): FoldRanges {
  const ranges = new Map<number, number>()
  if (lines.length > foldLimit) return ranges
  const open: { indent: number; line: number }[] = []
  let filled = 0
  const close = (indent: number) => {
    while (open.length > 0 && open.at(-1)!.indent >= indent) {
      const top = open.pop()!
      if (filled > top.line) ranges.set(top.line, filled)
    }
  }
  lines.forEach((line, index) => {
    const indent = indentOf(line)
    if (indent === undefined) return
    close(indent)
    open.push({ indent, line: index + 1 })
    filled = index + 1
  })
  close(-1)
  return ranges
}

/**
 * JSON indented by two, when it parses and is not so already; else none,
 * as a button to format it would do nothing.
 */
function formatJson(code: string) {
  try {
    const pretty = JSON.stringify(JSON.parse(code), null, 2)
    return pretty === code.trimEnd() ? undefined : pretty
  } catch {
    return undefined
  }
}

/** `:120` goes to line 120, as VS Code's "Go to Line". */
function lineOf(query: string, count: number) {
  const match = /^:\s*(\d+)$/.exec(query.trim())
  return match ? Math.min(Math.max(1, Number(match[1])), count) : undefined
}

const jsonLanguage = /^(json|jsonc|json5|geojson)$/i

type CodeViewerLabels = {
  find: string
  /** The find field's hint. */
  findHint: string
  previous: string
  next: string
  closeFind: string
  /** Where the find bar is: "3 of 12". */
  matches: (current: number, count: number) => string
  noMatches: string
  /** Gone to by `:120`: "Line 120". */
  line: (line: number) => string
  wrap: string
  format: string
  fold: string
  unfold: string
  copy: string
  copied: string
  /** Embedded, how long it is: "12 lines". */
  lines: (count: number) => string
}

const defaultLabels: CodeViewerLabels = {
  find: "Find",
  findHint: "Find, or :line",
  previous: "Previous match",
  next: "Next match",
  closeFind: "Close find",
  matches: (current, count) => `${current} of ${count}`,
  noMatches: "No results",
  line: (line) => `Line ${line.toLocaleString("en-US")}`,
  wrap: "Wrap lines",
  format: "Format JSON",
  fold: "Fold",
  unfold: "Unfold",
  copy: "Copy",
  copied: "Copied",
  lines: (count) =>
    count === 1 ? "1 line" : `${count.toLocaleString("en-US")} lines`,
}

type LineVariant = "added" | "removed" | "highlighted"

const noMatches: readonly TextMatch[] = []
const noFolds: FoldRanges = new Map()

/**
 * Its matches are drawn as CSS highlights, not marks: a keystroke in the
 * find bar renders no line again (marks rendered every line a short term
 * is in: 70 ms a keystroke at 3,500 lines, `pnpm perf`). Where the
 * browser has no highlights, marks.
 */
const supportsHighlights = () =>
  typeof CSS !== "undefined" && "highlights" in CSS

const matchHighlight = "code-viewer-match"
const currentHighlight = "code-viewer-current"
const highlightStyle = `::highlight(${matchHighlight}){background-color:var(--mark);color:inherit}::highlight(${currentHighlight}){background-color:var(--mark-current);color:inherit}`

// Every viewer's matches on the page, drawn as one highlight of each.
const viewerRanges = new Map<
  object,
  { all: Range[]; current: Range | undefined }
>()

function drawHighlights() {
  const all: Range[] = []
  const current: Range[] = []
  for (const each of viewerRanges.values()) {
    all.push(...each.all)
    if (each.current) current.push(each.current)
  }
  if (all.length > 0) CSS.highlights.set(matchHighlight, new Highlight(...all))
  else CSS.highlights.delete(matchHighlight)
  if (current.length > 0)
    CSS.highlights.set(currentHighlight, new Highlight(...current))
  else CSS.highlights.delete(currentHighlight)
}

/**
 * A line's matches as ranges over its text as rendered: its coloured
 * pieces' text nodes, past its fold button (which has none).
 */
function lineRanges(line: Element, matches: readonly TextMatch[]) {
  const content = line.querySelector("[data-slot=code-block-line-content]")
  if (!content) return []
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest("button,[aria-hidden=true]")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  })
  const ranges: Range[] = []
  let offset = 0
  let index = 0
  let range: Range | null = null
  for (
    let node = walker.nextNode() as Text | null;
    node && index < matches.length;
    node = walker.nextNode() as Text | null
  ) {
    const end = offset + node.data.length
    // Its matches that start or end in this node, in turn.
    while (index < matches.length) {
      const match = matches[index]!
      if (!range) {
        if (match.start >= end) break
        range = document.createRange()
        range.setStart(node, match.start - offset)
      }
      if (match.end > end) break
      range.setEnd(node, match.end - offset)
      ranges.push(range)
      range = null
      index++
    }
    offset = end
  }
  return ranges
}

/**
 * A line, rendered again only when what it shows changes: its props are
 * values, so a keystroke in the find bar renders the lines whose matches
 * changed, not all of them.
 */
const CodeViewerLine = React.memo(function CodeViewerLine({
  number,
  line,
  variant,
  matches,
  current,
  numbered,
  foldable,
  fold,
  foldLabel,
  onToggleFold,
}: {
  number: number
  line: React.ReactNode
  variant: LineVariant | "default"
  matches: readonly TextMatch[]
  /** Which of its matches is the one gone to, or -1. */
  current: number
  /** Numbered as it is, as lines before it are folded. */
  numbered: boolean
  /** Whether any line folds: a column for the buttons. */
  foldable: boolean
  fold: "open" | "closed" | undefined
  foldLabel: string
  onToggleFold: (line: number) => void
}) {
  return (
    <CodeBlockLine
      data-line={number}
      variant={variant}
      style={numbered ? { counterSet: `line ${number}` } : undefined}
    >
      {foldable && (
        // A fold's button at its first line, in a column of its own for
        // all lines: the code stays aligned.
        <span className="inline-flex w-5 align-top select-none">
          {fold !== undefined && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={foldLabel}
              // A line high, to keep the lines; its hit area larger for a
              // finger.
              className="relative size-[1lh] text-muted-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-2"
              onClick={() => onToggleFold(number)}
            >
              {fold === "closed" ? (
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              ) : (
                <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
              )}
            </Button>
          )}
        </span>
      )}
      {matches.length > 0
        ? markMatches(line, matches, (piece, which, key) => (
            <SearchMark key={key} current={current === which}>
              {piece}
            </SearchMark>
          ))
        : line || (foldable ? " " : "")}
      {fold === "closed" && (
        <span aria-hidden="true" className="text-muted-foreground">
          {" "}
          ⋯
        </span>
      )}
    </CodeBlockLine>
  )
})

type CodeViewerProps = Omit<
  React.ComponentProps<"div">,
  "children" | "title"
> & {
  code: string
  /** Its language, for its colours; else by the title's extension. */
  language?: string
  /** Its name in its header, e.g. its path. */
  title?: React.ReactNode
  /** Its lines wrapped; the app's to keep, e.g. for every file. */
  wrap?: boolean
  defaultWrap?: boolean
  onWrapChange?: (wrap: boolean) => void
  /** JSON shown formatted at first. */
  defaultFormatted?: boolean
  /**
   * A line's look, the app's: e.g. the lines an edit changed. Of the
   * code as given, not while it is shown formatted.
   */
  lineVariant?: (line: number) => LineVariant | undefined
  /** More buttons in its header (embedded, its frame's toolbar), before its own. */
  actions?: React.ReactNode
  /**
   * Embedded, the app's controls in its status bar after Wrap, e.g. one
   * that quotes the lines picked into the conversation.
   */
  controls?: React.ReactNode
  /**
   * Folds by indentation (the default); off for what is not code, e.g.
   * a log or a pasted text, its indented lines not blocks.
   */
  folding?: boolean
  labels?: Partial<CodeViewerLabels>
  /**
   * `embedded`: a viewer's, in a `ViewerFrame` of its own (`frame`'s path
   * and the app's actions), borderless to its edges, its tools in the
   * frame's toolbar, Wrap and what it is (its language, how many lines)
   * in its status bar.
   */
  variant?: "default" | "embedded"
  /** Embedded, its frame: its name (else the title), path and actions. */
  frame?: ViewerFrameProps | undefined
}

/**
 * A file's code to read: coloured, its lines numbered, folding by
 * indentation, wrapped or not, JSON formatted or as written, and a find
 * bar: Ctrl+F or ⌘F while the focus is in it (not the page's own), Enter
 * and Shift+Enter to the next and previous match, `:120` to line 120,
 * Escape to close. `embedded`, it is a viewer's, as a diff is.
 */
function CodeViewer({
  variant = "default",
  frame,
  code,
  language,
  title,
  wrap: wrapProp,
  defaultWrap = false,
  onWrapChange,
  defaultFormatted = false,
  lineVariant,
  actions,
  controls,
  folding = true,
  labels: labelsProp,
  className,
  onKeyDown,
  ...props
}: CodeViewerProps) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [ownWrap, setOwnWrap] = React.useState(defaultWrap)
  const wrap = wrapProp ?? ownWrap
  const named = title ?? frame?.name
  const lang =
    language ??
    (typeof named === "string" && named.includes(".")
      ? named.split(".").pop()!
      : "")

  const pretty = React.useMemo(
    () => (jsonLanguage.test(lang) ? formatJson(code) : undefined),
    [code, lang]
  )
  const [formattedOwn, setFormatted] = React.useState(defaultFormatted)
  const formatted = formattedOwn && pretty !== undefined
  const text = formatted ? pretty : code
  const lines = React.useMemo(() => text.replace(/\n$/, "").split("\n"), [text])
  const colored = useHighlightedCode(text, lang)
  const ranges = React.useMemo(
    () => (folding ? foldRanges(lines) : noFolds),
    [folding, lines]
  )
  // Folded by the text they are of: another text, none.
  const [folds, setFolds] = React.useState<{
    text: string
    folded: ReadonlySet<number>
  }>({ text, folded: new Set() })
  const folded = React.useMemo(
    () => (folds.text === text ? folds.folded : new Set<number>()),
    [folds, text]
  )

  const [finding, setFinding] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [step, setStep] = React.useState(0)
  const content = React.useRef<HTMLPreElement>(null)
  const input = React.useRef<HTMLInputElement>(null)

  // What is found follows the field when there is time: typing stays
  // quick in a long file, its matches a moment later.
  const found = React.useDeferredValue(query)
  const goto = finding ? lineOf(found, lines.length) : undefined
  const term = found.trim()
  const terms = React.useMemo(
    () => (finding && goto === undefined && term ? [term] : []),
    [finding, goto, term]
  )
  const matches = React.useMemo(
    () =>
      lines.map((line) => {
        if (terms.length === 0) return noMatches
        const each = textMatches(line, terms)
        return each.length > 0 ? each : noMatches
      }),
    [lines, terms]
  )
  // Each match, by its line and which in it.
  const hits = React.useMemo(
    () =>
      matches.flatMap((each, index) =>
        each.map((_, which) => ({ line: index + 1, which }))
      ),
    [matches]
  )
  const at =
    hits.length > 0 ? ((step % hits.length) + hits.length) % hits.length : -1
  const hit = hits[at]
  const current = goto ?? hit?.line

  // A fold the line gone to is in opens.
  const shownFolded = React.useMemo(() => {
    if (current === undefined) return folded
    const open = [...folded].filter(
      (start) => !(start < current && current <= (ranges.get(start) ?? 0))
    )
    return open.length === folded.size ? folded : new Set(open)
  }, [current, folded, ranges])
  const hidden = React.useMemo(() => {
    const hidden = new Set<number>()
    for (const start of shownFolded)
      for (let line = start + 1; line <= (ranges.get(start) ?? 0); line++)
        hidden.add(line)
    return hidden
  }, [ranges, shownFolded])

  // Drawn as highlights where the browser has them: the ranges of the
  // lines in sight and a screen either side (and of the match gone to),
  // made again as the matches or the lines shown change, and as it
  // scrolls. A short term in every line of a long file costs its screen.
  const [highlights] = React.useState(supportsHighlights)
  const [owner] = React.useState(() => ({}))
  // The current match's, for the scroll to it after (a layout effect's,
  // before the effects).
  const currentRange = React.useRef<Range | undefined>(undefined)
  const paint = React.useEffectEvent(() => {
    const code = content.current
    const all: Range[] = []
    let gone: Range | undefined
    if (code && hits.length > 0) {
      const lines = [...code.querySelectorAll<HTMLElement>("[data-line]")]
      const box = code.getBoundingClientRect()
      const top = Math.max(box.top, 0)
      const bottom = Math.min(box.bottom, window.innerHeight)
      const screen = Math.max(bottom - top, 0)
      // In the code's own coordinates (its lines' offsetTop).
      const from = top - box.top + code.scrollTop - screen
      const to = bottom - box.top + code.scrollTop + screen
      const add = (line: HTMLElement) => {
        const number = Number(line.dataset.line)
        const each = matches[number - 1]
        if (!each || each.length === 0) return
        lineRanges(line, each).forEach((range, which) => {
          if (hit?.line === number && hit.which === which) gone = range
          else all.push(range)
        })
      }
      // The first line ending past `from`, then on to `to`.
      let low = 0
      let high = lines.length
      while (low < high) {
        const middle = (low + high) >> 1
        const line = lines[middle]!
        if (line.offsetTop + line.offsetHeight < from) low = middle + 1
        else high = middle
      }
      for (let index = low; index < lines.length; index++) {
        const line = lines[index]!
        if (line.offsetTop > to) break
        add(line)
      }
      if (hit && !gone) {
        const line = code.querySelector<HTMLElement>(
          `[data-line="${hit.line}"]`
        )
        const range =
          line && lineRanges(line, matches[hit.line - 1]!)[hit.which]
        if (range) gone = range
      }
    }
    viewerRanges.set(owner, { all, current: gone })
    drawHighlights()
    currentRange.current = gone
  })
  React.useLayoutEffect(() => {
    if (highlights) paint()
  }, [highlights, matches, hits, hit, hidden, colored])
  React.useEffect(() => {
    if (!highlights || hits.length === 0) return
    let frame = 0
    const later = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0
        paint()
      })
    }
    const options = { capture: true, passive: true }
    window.addEventListener("scroll", later, options)
    window.addEventListener("resize", later)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", later, options)
      window.removeEventListener("resize", later)
    }
  }, [highlights, hits])
  React.useEffect(
    () => () => {
      if (!viewerRanges.delete(owner)) return
      drawHighlights()
    },
    [owner]
  )

  // To the match, or the line, gone to: in the middle, if it scrolls.
  React.useEffect(() => {
    if (current === undefined) return
    const code = content.current
    const line = code?.querySelector(`[data-line="${current}"]`)
    const range = currentRange.current
    if (!highlights || !range || !code) {
      const target =
        line?.querySelector("[data-slot=search-mark][data-current]") ?? line
      target?.scrollIntoView?.({ block: "center", inline: "nearest" })
      return
    }
    line?.scrollIntoView?.({ block: "center", inline: "nearest" })
    // Then across to it, if it is out of sight sideways.
    const match = range.getBoundingClientRect()
    const view = code.getBoundingClientRect()
    if (match.left < view.left || match.right > view.right)
      code.scrollLeft += match.left - view.left - view.width / 2
  }, [current, at, highlights])

  // Opened, or again while open: its field focused, its text selected,
  // before the next key.
  const [opens, setOpens] = React.useState(0)
  React.useLayoutEffect(() => {
    if (opens > 0) input.current?.select()
  }, [opens])
  const openFind = () => {
    setFinding(true)
    setOpens((opens) => opens + 1)
  }
  const closeFind = () => {
    setFinding(false)
    content.current?.focus()
  }
  // One function for every line's button, so a line's props stay equal.
  const toggleFold = React.useCallback(
    (line: number) =>
      setFolds((folds) => {
        const next = new Set(folds.text === text ? folds.folded : [])
        if (next.has(line)) next.delete(line)
        else next.add(line)
        return { text, folded: next }
      }),
    [text]
  )
  const status =
    term === ""
      ? ""
      : goto !== undefined
        ? labels.line(goto)
        : hits.length === 0
          ? labels.noMatches
          : labels.matches(at + 1, hits.length)

  const tip = (label: string, trigger: React.ReactElement) => (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
  const embedded = variant === "embedded"
  const setWrap = (next: boolean) => {
    setOwnWrap(next)
    onWrapChange?.(next)
  }

  // Floats over the code's top end, as the PDF viewer's find does: the
  // code does not move as it opens. Below a block's header.
  const find = finding && (
    <ViewerFind
      ref={input}
      value={query}
      onValueChange={(value) => {
        setQuery(value)
        setStep(0)
      }}
      status={status}
      onStep={(by) => setStep((step) => step + by)}
      canStep={hits.length > 0}
      onClose={closeFind}
      label={labels.find}
      placeholder={labels.findHint}
      previousLabel={labels.previous}
      nextLabel={labels.next}
      closeLabel={labels.closeFind}
      className={embedded ? undefined : "top-11"}
    />
  )
  const body = (
    <CodeBlockContent
      ref={content}
      wrap={wrap}
      lineNumbers
      // A viewer's: to its edges, as a diff, its focus ring inside them.
      className={cn(
        embedded &&
          "flex-1 text-xs/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      )}
    >
      {lines.map((_, index) => {
        const number = index + 1
        if (hidden.has(number)) return null
        const closed = shownFolded.has(number)
        const variant =
          number === current
            ? "highlighted"
            : formatted
              ? undefined
              : lineVariant?.(number)
        return (
          <CodeViewerLine
            key={number}
            number={number}
            line={colored[index] ?? lines[index]}
            variant={variant ?? "default"}
            matches={highlights ? noMatches : matches[index]!}
            current={!highlights && hit?.line === number ? hit.which : -1}
            numbered={hidden.size > 0}
            foldable={ranges.size > 0}
            fold={ranges.has(number) ? (closed ? "closed" : "open") : undefined}
            foldLabel={closed ? labels.unfold : labels.fold}
            onToggleFold={toggleFold}
          />
        )
      })}
    </CodeBlockContent>
  )
  const root = (children: React.ReactNode) => (
    <div
      data-slot="code-viewer"
      data-variant={variant}
      className={cn(
        "relative flex min-h-0 min-w-0 flex-col",
        embedded && "flex-1",
        className
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (
          (event.metaKey || event.ctrlKey) &&
          !event.shiftKey &&
          !event.altKey &&
          event.key.toLowerCase() === "f"
        ) {
          event.preventDefault()
          // Not the page's find, or the app's.
          event.stopPropagation()
          openFind()
        }
      }}
      {...props}
    >
      {highlights && (
        <style href="agentui-code-viewer-find" precedence="default">
          {highlightStyle}
        </style>
      )}
      {find}
      {children}
    </div>
  )

  if (embedded) {
    const { details = [], ...rest } = frame ?? {
      name: typeof title === "string" ? title : "",
    }
    return (
      <ViewerFrame
        {...rest}
        tools={
          <>
            {actions}
            {pretty !== undefined && (
              <ViewerTool
                label={labels.format}
                pressed={formatted}
                onClick={() => setFormatted(!formatted)}
              >
                <HugeiconsIcon icon={CodeIcon} strokeWidth={2} />
              </ViewerTool>
            )}
            <ViewerTool
              label={labels.find}
              aria-expanded={finding}
              onClick={openFind}
            >
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </ViewerTool>
            <CopyButton
              value={text}
              labels={{ copy: labels.copy, copied: labels.copied }}
              className={viewerTool}
            />
          </>
        }
        controls={
          <>
            {/* The line gone to, or the match's. */}
            {current !== undefined && (
              <>
                <ViewerStatusText>{labels.line(current)}</ViewerStatusText>
                <ViewerStatusSeparator />
              </>
            )}
            <ViewerStatusButton
              aria-pressed={wrap}
              onClick={() => setWrap(!wrap)}
            >
              {labels.wrap}
            </ViewerStatusButton>
            {controls && (
              <>
                <ViewerStatusSeparator />
                {controls}
              </>
            )}
          </>
        }
        facts={[lang.toUpperCase(), labels.lines(lines.length), ...details]}
      >
        {root(body)}
      </ViewerFrame>
    )
  }

  return root(
    <CodeBlock className="min-h-0 flex-1">
      <CodeBlockHeader>
        {title !== undefined && <CodeBlockTitle>{title}</CodeBlockTitle>}
        <CodeBlockActions>
          {actions}
          {pretty !== undefined &&
            tip(
              labels.format,
              <Toggle
                size="sm"
                aria-label={labels.format}
                pressed={formatted}
                onPressedChange={setFormatted}
              >
                <HugeiconsIcon icon={CodeIcon} strokeWidth={2} />
              </Toggle>
            )}
          {tip(
            labels.wrap,
            <Toggle
              size="sm"
              aria-label={labels.wrap}
              pressed={wrap}
              onPressedChange={setWrap}
            >
              <HugeiconsIcon icon={TextWrapIcon} strokeWidth={2} />
            </Toggle>
          )}
          {tip(
            labels.find,
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.find}
              aria-expanded={finding}
              onClick={openFind}
            >
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </Button>
          )}
          <CodeBlockCopyButton
            value={text}
            labels={{ copy: labels.copy, copied: labels.copied }}
          />
        </CodeBlockActions>
      </CodeBlockHeader>
      {body}
    </CodeBlock>
  )
}

export {
  CodeViewer,
  foldRanges,
  formatJson,
  type CodeViewerLabels,
  type FoldRanges,
}
