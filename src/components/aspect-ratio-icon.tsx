import * as React from "react"
import { cn } from "cn"

/** A ratio's width and height, from "16:9", "16/9", "16x9" or 1.78. */
function parseRatio(
  ratio: string | number | undefined
): { width: number; height: number } | undefined {
  if (typeof ratio === "number")
    return Number.isFinite(ratio) && ratio > 0
      ? { width: ratio, height: 1 }
      : undefined
  const [width, height, ...rest] = (ratio ?? "")
    .split(/\s*[:/x×]\s*/)
    .map(Number)
  if (rest.length > 0 || width === undefined || height === undefined)
    return undefined
  return width > 0 && height > 0 ? { width, height } : undefined
}

/**
 * A shape's aspect ratio as an icon, e.g. beside "16:9" in a choice of
 * an image's or video's size: a frame of that shape, its long side the
 * icon's. A ratio it cannot read (e.g. "auto", to follow the source) is a
 * dashed square. An icon as Hugeicons' are, so it sizes and colours as they
 * do in buttons, menus and toggles, and is hidden from screen readers:
 * the ratio's text names it.
 */
function AspectRatioIcon({
  ratio,
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children"> & {
  ratio: string | number | undefined
}) {
  const known = parseRatio(ratio)
  // In Hugeicons' 24 × 24, its frame inside the same 2 of margin.
  const long = 20
  const short = 6
  const scale = known ? long / Math.max(known.width, known.height) : 0
  const width = known ? Math.max(short, known.width * scale) : 16
  const height = known ? Math.max(short, known.height * scale) : 16
  return (
    <svg
      data-slot="aspect-ratio-icon"
      data-ratio={known ? `${known.width}:${known.height}` : undefined}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect
        x={(24 - width) / 2}
        y={(24 - height) / 2}
        width={width}
        height={height}
        rx={2}
        strokeDasharray={known ? undefined : "3 3"}
      />
    </svg>
  )
}

export { AspectRatioIcon, parseRatio }
