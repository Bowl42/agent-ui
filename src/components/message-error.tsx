"use client"

import * as React from "react"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "cn"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type MessageErrorLabels = {
  retryNow: string
  /** While it waits to try again: "Retrying in 8s". */
  retryingIn: (seconds: number) => string
  /** Once the wait is over, until the app says how it went. */
  retrying: string
  /** Which try is next: "attempt 2 of 5". */
  attempt: (attempt: number, attempts: number | undefined) => string
}

const defaultMessageErrorLabels: MessageErrorLabels = {
  retryNow: "Retry now",
  retryingIn: (seconds) => `Retrying in ${seconds}s`,
  retrying: "Retrying…",
  attempt: (attempt, attempts) =>
    attempts === undefined
      ? `attempt ${attempt}`
      : `attempt ${attempt} of ${attempts}`,
}

/** The whole seconds left until `at` (a time in ms), counting down. */
function useSecondsLeft(at: number | undefined) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (at === undefined) return
    const tick = () => {
      const time = Date.now()
      setNow(time)
      if (time >= at) window.clearInterval(timer)
    }
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [at])
  return at === undefined ? 0 : Math.max(0, Math.ceil((at - now) / 1000))
}

/**
 * Why a turn failed and what comes next, in the conversation where the
 * answer would have gone: an alert's triangle, its reason in a line
 * ("Rate limited", "The connection dropped") and, under it, what it
 * means, or, while the app waits to try again (`retry`), a countdown to
 * it and which attempt that is. Its action at its end: "Retry now" with
 * `onRetry`, or the app's own (`action`, e.g. "Continue"). An outlined
 * card in the page's greys, not a colour: it says what happened, it is
 * not an alarm.
 */
function MessageError({
  title,
  description,
  retry,
  onRetry,
  action,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title" | "children"> & {
  /** What went wrong, in a line. */
  title: React.ReactNode
  /** What it means or what to do, under it; the countdown takes its place while retrying. */
  description?: React.ReactNode
  /** The next try the app has planned: when (a time in ms) and which. */
  retry?:
    | {
        at: number
        attempt?: number | undefined
        attempts?: number | undefined
      }
    | undefined
  /** Tries again now: a "Retry now" button. */
  onRetry?: (() => void) | undefined
  /** The app's action in its place, e.g. a "Continue" `Button`. */
  action?: React.ReactNode
  labels?: Partial<MessageErrorLabels> | undefined
}) {
  const labels = { ...defaultMessageErrorLabels, ...labelsProp }
  const seconds = useSecondsLeft(retry?.at)
  const detail = retry ? (
    <>
      {/* Read once, not every second: the countdown is for the eye. */}
      <span aria-hidden="true" className="tabular-nums">
        {seconds > 0 ? labels.retryingIn(seconds) : labels.retrying}
      </span>
      <span className="sr-only">{labels.retrying}</span>
      {retry.attempt !== undefined &&
        ` · ${labels.attempt(retry.attempt, retry.attempts)}`}
    </>
  ) : (
    description
  )
  return (
    <Alert
      data-slot="message-error"
      className={cn(
        // Its parts at the top: the button (the app's action) level with
        // the title, not centred on the title and its line under it.
        "flex items-start gap-2 rounded-lg bg-transparent p-3",
        className
      )}
      {...props}
    >
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div data-slot="message-error-title" className="font-medium">
          {title}
        </div>
        {detail && (
          <div
            data-slot="message-error-description"
            className="text-xs/5 text-subtle-foreground"
          >
            {detail}
          </div>
        )}
      </div>
      {action ??
        (onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onRetry}
          >
            {labels.retryNow}
          </Button>
        ))}
    </Alert>
  )
}

export { MessageError, type MessageErrorLabels }
