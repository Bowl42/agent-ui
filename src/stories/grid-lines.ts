import { expect } from "storybook/test"

/*
 * A region's tracks, measured: what is meant to start (or end) on one
 * line does, within a pixel. docs/grid.md has each region's tracks.
 */

/**
 * Where it is drawn: an svg's, a field's or a button's own edges; text's, its glyphs'
 * (its first line's start, its last's end), past its padding.
 */
export function ink(element: Element): DOMRect {
  if (
    element instanceof SVGElement ||
    element instanceof HTMLImageElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLButtonElement ||
    element.matches(
      "textarea, select, kbd, [role=switch], [role=combobox], [role=checkbox], [role=radio], [data-slot=avatar], [data-slot=kbd], [data-slot=select-trigger]"
    )
  )
    return element.getBoundingClientRect()
  const range = document.createRange()
  range.selectNodeContents(element)
  return range.getBoundingClientRect()
}

/** Where a field's or an editor's text starts: past its padding. */
export function textStart(element: HTMLElement): number {
  const box = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  return style.direction === "rtl"
    ? box.right - parseFloat(style.paddingRight)
    : box.left + parseFloat(style.paddingLeft)
}

type Mark = Element | number | null | undefined

/**
 * Each of `marks` (an element, by its ink, or an x already measured)
 * starts (or ends) on one line, within a pixel; those not there (null) are
 * left out, but at least `least` must be.
 */
export async function onOneLine(
  name: string,
  marks: Record<string, Mark>,
  { edge = "start", least = 2 }: { edge?: "start" | "end"; least?: number } = {}
) {
  const at: Record<string, number> = {}
  for (const [key, mark] of Object.entries(marks)) {
    if (mark === null || mark === undefined) continue
    if (typeof mark === "number") {
      at[key] = mark
      continue
    }
    const box = ink(mark)
    if (!box.width) continue
    at[key] = edge === "start" ? box.left : box.right
  }
  const xs = Object.values(at)
  await expect(
    xs.length,
    `${name}: ${JSON.stringify(at)}`
  ).toBeGreaterThanOrEqual(least)
  const spread = Math.max(...xs) - Math.min(...xs)
  await expect(spread, `${name}: ${JSON.stringify(at)}`).toBeLessThan(1)
}

/** Once what moves in it (a popup opening) has come to rest. */
export async function settled(element: Element) {
  await Promise.all(
    element.getAnimations({ subtree: true }).map((each) => each.finished)
  )
}

/**
 * Rows on one region's tracks: each part (found in each row) starts, or
 * with `end:` ends, on one line down them all.
 */
export async function onRows(
  name: string,
  rows: readonly Element[],
  parts: Record<string, (row: Element) => Mark>
) {
  for (const [key, find] of Object.entries(parts)) {
    const [edge, label] = key.startsWith("end:")
      ? (["end", key.slice(4)] as const)
      : (["start", key] as const)
    await onOneLine(
      `${name} ${label}`,
      Object.fromEntries(rows.map((row, index) => [index, find(row)])),
      { edge, least: Math.min(2, rows.length) }
    )
  }
}
