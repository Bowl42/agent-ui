import * as React from "react"
import { cn } from "cn"
import { encode } from "uqr"

type QrCodeLevel = "L" | "M" | "Q" | "H"

/** The quiet zone a scanner needs around a code, in modules. */
const QUIET_ZONE = 4

/** One path for all dark modules: a run of them in a row is one `h`. */
function modulesPath(matrix: boolean[][]) {
  let d = ""
  matrix.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue
      let end = x
      while (end + 1 < row.length && row[end + 1]) end++
      d += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h${end - x + 1}v1h${x - end - 1}z`
      x = end
    }
  })
  return d
}

/** Its words, for other languages. */
type QrCodeLabels = {
  /** Its default name for screen readers. */
  qrCode: string
}

/**
 * A string as an SVG QR code, e.g. a link for a phone to scan. Dark
 * modules sit on a white plate with the quiet zone in both themes: scanners
 * need dark on light, and many phone cameras fail on an inverted code, so
 * the plate does not follow the dark theme.
 */
function QrCode({
  value,
  size = 160,
  level = "M",
  label,
  labels,
  caption,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** What the code holds. */
  value: string
  /** Its side, in px, quiet zone included. */
  size?: number
  /** Error correction: more of it, a denser code. */
  level?: QrCodeLevel
  /** Its name for screen readers; never the value itself by default. */
  label?: string
  /** `qrCode` is the default name, for other languages. */
  labels?: Partial<QrCodeLabels>
  /** Under the plate, e.g. what to scan it with. */
  caption?: React.ReactNode
}) {
  const matrix = React.useMemo(
    () => encode(value, { ecc: level, border: 0, boostEcc: false }).data,
    [value, level]
  )
  const path = React.useMemo(() => modulesPath(matrix), [matrix])
  const side = matrix.length + QUIET_ZONE * 2

  return (
    <div
      data-slot="qr-code"
      className={cn("inline-flex flex-col items-center gap-2", className)}
      {...props}
    >
      <svg
        data-slot="qr-code-plate"
        role="img"
        aria-label={label ?? labels?.qrCode ?? "QR code"}
        viewBox={`0 0 ${side} ${side}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        className="rounded-lg bg-white text-black"
      >
        <path d={path} fill="currentColor" />
      </svg>
      {caption ? (
        <div
          data-slot="qr-code-caption"
          className="text-center text-xs text-muted-foreground"
        >
          {caption}
        </div>
      ) : null}
    </div>
  )
}

export { QrCode, type QrCodeLabels, type QrCodeLevel }
