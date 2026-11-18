/** Measures of a folding `CodeBlock`, for the stories that check one. */

/**
 * The block's lines as the reader sees them, a wrapped line each it
 * takes (`CodeBlockLine`s, a diff's @@ lines apart), against the part of
 * its content that shows: how many show whole, how many are cut, and
 * whether an @@ line is cut.
 */
function foldedLines(block: HTMLElement) {
  const content = block.querySelector<HTMLElement>(
    ":scope > [data-slot=code-block-content]"
  )!
  const style = getComputedStyle(content)
  const lineHeight = parseFloat(style.lineHeight)
  const box = content.getBoundingClientRect()
  // Where its code stops showing: over its padding and scrollbar.
  const end =
    box.top +
    content.clientHeight -
    parseFloat(style.paddingBottom) -
    content.scrollTop
  let whole = 0
  let cut = 0
  let hunkCut = false
  for (const line of content.querySelectorAll<HTMLElement>(
    "[data-slot=code-block-line]"
  )) {
    const rect = line.getBoundingClientRect()
    if (line.dataset.diff === "hunk") {
      if (rect.top < end - 0.5 && rect.bottom > end + 0.5) hunkCut = true
      continue
    }
    const count = Math.round(rect.height / lineHeight)
    for (let at = 0; at < count; at++) {
      const top = rect.top + at * lineHeight
      const bottom = top + lineHeight
      if (bottom <= end + 0.5) whole++
      else if (top < end - 0.5) cut++
    }
  }
  return { whole, cut, hunkCut, lineHeight }
}

/** Whether `inner`'s box is inside `outer`'s border, to half a pixel. */
function insideBorder(inner: Element, outer: Element) {
  const a = inner.getBoundingClientRect()
  const b = outer.getBoundingClientRect()
  const style = getComputedStyle(outer)
  return (
    a.left >= b.left + parseFloat(style.borderLeftWidth) - 0.5 &&
    a.right <= b.right - parseFloat(style.borderRightWidth) + 0.5 &&
    a.top >= b.top + parseFloat(style.borderTopWidth) - 0.5 &&
    a.bottom <= b.bottom - parseFloat(style.borderBottomWidth) + 0.5
  )
}

/** The next frames, so a fold that would take turns has the time to. */
async function frames(count: number) {
  for (let at = 0; at < count; at++)
    await new Promise((resolve) => requestAnimationFrame(resolve))
}

export { foldedLines, frames, insideBorder }
