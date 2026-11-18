"use client"

import * as React from "react"
import { cn } from "cn"

import { FloatingButton } from "@/components/floating-button"
import { useMessageScrollerScrollable } from "@/components/ui/message-scroller"
import { Spinner } from "@/components/ui/spinner"

/**
 * Loads the messages before those a long conversation shows, so the
 * scroller has a bounded number to track: a button floating at the top of
 * a `MessageScroller`, shown while the reader is at the start, or while
 * they load. The app loads them in `onClick` and sets `loading` until they
 * are there; the scroller keeps the messages in view where they are as
 * they come in above. Render it only while there are earlier ones.
 */
function MessageScrollerLoadEarlier({
  loading = false,
  loadingLabel = "Loading earlier messages",
  children = "Load earlier messages",
  className,
  onClick,
  ref,
  ...props
}: React.ComponentProps<typeof FloatingButton> & {
  /** The earlier messages are on their way: a spinner, and no second load. */
  loading?: boolean
  /** Its words while they load. */
  loadingLabel?: React.ReactNode
}) {
  const { start } = useMessageScrollerScrollable()
  const active = !start || loading
  const button = React.useRef<HTMLButtonElement | null>(null)
  const setRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      button.current = node
      if (typeof ref === "function") return ref(node)
      if (ref) ref.current = node
    },
    [ref]
  )

  // Hidden once the messages came in above, it hands the focus to the
  // viewport, where the keyboard scrolls on, not to the page.
  React.useEffect(() => {
    const node = button.current
    if (active || !node || document.activeElement !== node) return
    node
      .closest("[data-slot=message-scroller]")
      ?.querySelector<HTMLElement>("[data-slot=message-scroller-viewport]")
      ?.focus({ preventScroll: true })
  }, [active])

  return (
    <FloatingButton
      ref={setRef}
      data-slot="message-scroller-load-earlier"
      data-active={active}
      inert={!active}
      aria-disabled={loading || undefined}
      onClick={(event) => {
        if (loading) return
        onClick?.(event)
      }}
      className={cn(
        "absolute inset-s-1/2 top-4 z-10 -translate-x-1/2 transition-[translate,opacity] motion-pop data-[active=false]:pointer-events-none data-[active=false]:-translate-y-full data-[active=false]:opacity-0 motion-reduce:transition-opacity motion-reduce:data-[active=false]:translate-y-0 rtl:translate-x-1/2",
        className
      )}
      {...props}
    >
      {loading && <Spinner aria-hidden="true" />}
      <span aria-live="polite">{loading ? loadingLabel : children}</span>
    </FloatingButton>
  )
}

export { MessageScrollerLoadEarlier }
