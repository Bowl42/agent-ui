import * as React from "react"
import { cn } from "cn"

/** Where a match is in a text: from `start` up to, not with, `end`. */
type TextMatch = { start: number; end: number }

const normalize = (text: string) => text.normalize("NFKC").toLowerCase()
const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

let graphemes: Intl.Segmenter | undefined
// ASCII text NFKC and lowercasing leave as it is, letter for letter.
// eslint-disable-next-line no-control-regex
const ascii = /^[\x00-\x7f]*$/

/**
 * Where the terms are in a text, as the reader would find them: in any
 * case, full-width or not (NFKC), a letter and its accents one; at the
 * text's own places, so it shows as written. Overlapping matches are one.
 */
function textMatches(text: string, terms: readonly string[]): TextMatch[] {
  const needles = [...new Set(terms.map(normalize).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  )
  if (needles.length === 0 || text === "") return []
  // Most lines have none: no need to cut them into letters.
  const whole = normalize(text)
  if (!needles.some((needle) => whole.includes(needle))) return []

  const pattern = new RegExp(needles.map(escape).join("|"), "gu")
  // Plain ASCII folds letter for letter, in place: no need to cut it
  // into graphemes (costly over a long text, e.g. a command's output).
  if (ascii.test(text)) {
    const matches: TextMatch[] = []
    for (const match of whole.matchAll(pattern)) {
      const start = match.index
      const end = start + match[0].length
      const previous = matches.at(-1)
      if (previous && start <= previous.end)
        previous.end = Math.max(previous.end, end)
      else matches.push({ start, end })
    }
    return matches
  }

  graphemes ??= new Intl.Segmenter(undefined, { granularity: "grapheme" })
  let normalized = ""
  const places: TextMatch[] = []
  for (const { segment, index } of graphemes.segment(text)) {
    const folded = normalize(segment)
    normalized += folded
    for (let each = 0; each < folded.length; each++)
      places.push({ start: index, end: index + segment.length })
  }
  const matches: TextMatch[] = []
  for (const match of normalized.matchAll(pattern)) {
    const start = places[match.index]?.start
    const end = places[match.index + match[0].length - 1]?.end
    if (start === undefined || end === undefined) continue
    const previous = matches.at(-1)
    if (previous && start <= previous.end)
      previous.end = Math.max(previous.end, end)
    else matches.push({ start, end })
  }
  return matches
}

/** The text in a node: its strings and numbers, in order. */
function nodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node))
    return nodeText(node.props.children)
  return ""
}

/**
 * A node with its matches marked, inside the elements they are in (e.g. a
 * line of code's coloured tokens): a match across elements is marked in
 * each. `mark` renders a match's piece; `index` is which match it is.
 */
function markMatches(
  node: React.ReactNode,
  matches: readonly TextMatch[],
  mark: (text: string, index: number, key: React.Key) => React.ReactNode
): React.ReactNode {
  if (matches.length === 0) return node
  let offset = 0
  const walk = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string" || typeof node === "number") {
      const text = String(node)
      const from = offset
      offset += text.length
      const pieces: React.ReactNode[] = []
      let at = 0
      matches.forEach((match, index) => {
        const start = Math.max(match.start - from, 0)
        const end = Math.min(match.end - from, text.length)
        if (end <= start) return
        if (start > at) pieces.push(text.slice(at, start))
        pieces.push(mark(text.slice(start, end), index, pieces.length))
        at = end
      })
      if (pieces.length === 0) return text
      if (at < text.length) pieces.push(text.slice(at))
      return pieces.map((piece, key) =>
        typeof piece === "string" ? (
          <React.Fragment key={key}>{piece}</React.Fragment>
        ) : (
          piece
        )
      )
    }
    if (Array.isArray(node))
      return node.map((child, key) => (
        <React.Fragment key={key}>{walk(child)}</React.Fragment>
      ))
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
      if (node.props.children === undefined) return node
      return React.cloneElement(node, undefined, walk(node.props.children))
    }
    return node
  }
  return walk(node)
}

/**
 * Text, or a node of text (e.g. coloured code), with where the terms are
 * marked: each a `mark`, the `current` one stronger, e.g. the one a find
 * bar went to. The rules of `textMatches`.
 */
function SearchHighlight({
  terms,
  current,
  children,
  className,
}: {
  terms: readonly string[]
  /** Which match is the one gone to, from 0. */
  current?: number | undefined
  children: React.ReactNode
  /** The marks' class. */
  className?: string
}) {
  const matches = React.useMemo(
    () => textMatches(nodeText(children), terms),
    [children, terms]
  )
  return markMatches(children, matches, (text, index, key) => (
    <SearchMark key={key} current={index === current} className={className}>
      {text}
    </SearchMark>
  ))
}

/**
 * A match, marked in greys: a tint of the text colour under it, its text
 * in that colour (so it stays legible on muted surfaces too), the current
 * one a darker tint with a hairline round it. A tint, not an outline: a
 * match across elements reads as one, and many (e.g. one letter in code)
 * are not boxes everywhere.
 */
function SearchMark({
  current = false,
  className,
  ...props
}: React.ComponentProps<"mark"> & { current?: boolean }) {
  return (
    <mark
      data-slot="search-mark"
      data-current={current || undefined}
      className={cn(
        "rounded-xs bg-foreground/10 box-decoration-clone font-semibold text-foreground data-current:bg-foreground/20 data-current:ring-1 data-current:ring-foreground/30",
        // On a tooltip's inverted surface, inverted too.
        "in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background",
        className
      )}
      {...props}
    />
  )
}

/**
 * Where a query is in an element's text, a range each, as `textMatches`
 * finds it: for the CSS Custom Highlight API, which marks the text as it
 * is, without elements added (a PDF's pages, a message being read).
 */
function textRanges(root: Node, query: string): Range[] {
  const term = query.trim()
  if (!term) return []
  const ranges: Range[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    for (const match of textMatches(text.data, [term])) {
      const range = document.createRange()
      range.setStart(text, match.start)
      range.setEnd(text, match.end)
      ranges.push(range)
    }
  }
  return ranges
}

export {
  SearchHighlight,
  SearchMark,
  markMatches,
  nodeText,
  textMatches,
  textRanges,
  type TextMatch,
}
