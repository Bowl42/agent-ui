import * as React from "react"
import { cn } from "cn"

/**
 * A short code read out to be typed elsewhere (a sign-in's one-time code,
 * a device's pairing code): large (`text-readout`, 32px on 40px lines),
 * monospaced, its characters in groups (`group`, 4 by default: "ABCD
 * EFGH") apart by a space's width that is not a space, so it is copied
 * and selected whole. Read out character by character to a screen
 * reader, its `label` first ("Your code").
 */
function CodeReadout({
  value,
  group = 4,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** The code, as it is typed: "ABCD1234". */
  value: string
  /** Characters to a group; 0 for none. */
  group?: number
  /** What the code is, for a screen reader: "Your code". */
  label?: string | undefined
}) {
  const groups =
    group > 0 ? (value.match(new RegExp(`.{1,${group}}`, "gu")) ?? []) : [value]
  const spoken = [...value].join(" ")
  return (
    <div
      role="img"
      aria-label={label ? `${label}: ${spoken}` : spoken}
      data-slot="code-readout"
      className={cn(
        "font-mono text-readout font-medium tracking-wider whitespace-nowrap tabular-nums select-all",
        className
      )}
      {...props}
    >
      {groups.map((part, index) => (
        // Inline, apart by a margin: copied as one word, no spaces or
        // line breaks between its groups.
        <span key={index} aria-hidden="true" className="not-last:me-3">
          {part}
        </span>
      ))}
    </div>
  )
}

export { CodeReadout }
