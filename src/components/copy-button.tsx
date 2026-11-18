"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CancelCircleIcon,
  Copy01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * What is copied besides text: e.g. an image, as `{ type: "image/png",
 * data: () => fetch(src).then((r) => r.blob()) }`. `data` is asked for on
 * the press (the clipboard is written in it, as Safari needs).
 */
type CopyData = { type: string; data: () => Promise<Blob> }

/** Its words, for other languages. */
type CopyButtonLabels = {
  copy: string
  copied: string
  /** The clipboard refused, or the page has none. */
  failed: string
}

/** An icon of the three, swapped by fading and growing. */
const swap = "transition-[opacity,scale] motion-fade"

/**
 * An icon button that copies a value, e.g. a reply or an image: its tooltip and name
 * say "Copied" for a while after (the tooltip stays open through the
 * press to say so), and screen readers hear it. A value that
 * has changed since (e.g. streaming) is not claimed as copied; when the
 * clipboard refuses, it says so. With `showLabel`, its word beside the
 * icon ("Copy", then "Copied"), as wide as the wider of them so it
 * does not jump, and no tooltip.
 */
function CopyButton({
  value,
  variant = "ghost",
  size = "icon-sm",
  labels,
  showLabel = false,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children" | "value"> & {
  /** Text, or `CopyData` (keep it the same object while it is the same). */
  value: string | CopyData
  /** The button's name and the announcement, for other languages. */
  labels?: Partial<CopyButtonLabels>
  /** Its word shown beside its icon, not in a tooltip. */
  showLabel?: boolean
}) {
  const [result, setResult] = React.useState<{
    value: string | CopyData
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
    if (result === null) return
    const timeout = setTimeout(() => setResult(null), 2000)
    return () => clearTimeout(timeout)
  }, [result])

  // Its words in one place, as wide as "Copy" and "Copied"; the rarer
  // failure's only while it is said.
  const words = [
    labels?.copy ?? "Copy",
    labels?.copied ?? "Copied",
    ...(failed ? [label] : []),
  ]
  const button = (
    <Button
      data-slot="copy-button"
      data-copied={copied || undefined}
      data-failed={failed || undefined}
      variant={variant}
      size={showLabel && size === "icon-sm" ? "sm" : size}
      aria-label={showLabel ? undefined : label}
      onClick={(event) => {
        onClick?.(event)
        Promise.resolve()
          .then(() =>
            typeof value === "string"
              ? navigator.clipboard.writeText(value)
              : navigator.clipboard.write([
                  new ClipboardItem({ [value.type]: value.data() }),
                ])
          )
          .then(
            () => setResult({ value, copied: true }),
            () => setResult({ value, copied: false })
          )
      }}
      {...props}
    />
  )
  // The three in one place, the one that says it shown: each fades and
  // grows into the other.
  const icons = (
    <span aria-hidden="true" className="grid *:col-start-1 *:row-start-1">
      <HugeiconsIcon
        icon={Copy01Icon}
        strokeWidth={2}
        className={cn(swap, (copied || failed) && "scale-75 opacity-0")}
      />
      <HugeiconsIcon
        icon={Tick02Icon}
        strokeWidth={2}
        className={cn(swap, !copied && "scale-75 opacity-0")}
      />
      {/* A failure, not "close": a crossed circle in the error colour. */}
      <HugeiconsIcon
        icon={CancelCircleIcon}
        strokeWidth={2}
        className={cn(
          swap,
          "text-destructive",
          !failed && "scale-75 opacity-0"
        )}
      />
    </span>
  )
  return (
    <>
      {showLabel ? (
        React.cloneElement(
          button,
          undefined,
          icons,
          // The one that says it read, the others hidden from everyone.
          <span
            data-slot="copy-button-label"
            className="grid text-start *:col-start-1 *:row-start-1"
          >
            {words.map((word) => (
              <span
                key={word}
                aria-hidden={word === label ? undefined : true}
                className={cn(word !== label && "invisible")}
              >
                {word}
              </span>
            ))}
          </span>
        )
      ) : (
        <Tooltip>
          <TooltipTrigger
            // Pressed, its tooltip stays to say "Copied", not closes.
            closeOnClick={false}
            render={button}
          >
            {icons}
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      )}
      <span aria-live="polite" className="sr-only">
        {copied || failed ? label : ""}
      </span>
    </>
  )
}

export { CopyButton, type CopyButtonLabels, type CopyData }
