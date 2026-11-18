import * as React from "react"

let callers = 0
let uninstall: (() => void) | undefined

function install() {
  const tracked = new Set<Element>()
  const forget = (element: Element) => {
    observer.unobserve(element)
    tracked.delete(element)
    element.removeAttribute("data-shimmer-paused")
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.target.isConnected) forget(entry.target)
      else if (entry.isIntersecting)
        entry.target.removeAttribute("data-shimmer-paused")
      else entry.target.setAttribute("data-shimmer-paused", "")
    }
  })
  const observe = (element: Element) => {
    if (tracked.has(element)) return
    tracked.add(element)
    observer.observe(element)
  }
  const start = (event: AnimationEvent) => {
    if (event.animationName === "tw-shimmer" && event.target instanceof Element)
      observe(event.target)
  }
  const stop = (event: AnimationEvent) => {
    if (event.animationName === "tw-shimmer" && event.target instanceof Element)
      forget(event.target)
  }
  document.addEventListener("animationstart", start, true)
  document.addEventListener("animationend", stop, true)
  document.addEventListener("animationcancel", stop, true)
  for (const animation of document.getAnimations()) {
    if (
      animation instanceof CSSAnimation &&
      animation.animationName === "tw-shimmer" &&
      animation.effect instanceof KeyframeEffect &&
      animation.effect.target instanceof Element
    )
      observe(animation.effect.target)
  }
  return () => {
    observer.disconnect()
    document.removeEventListener("animationstart", start, true)
    document.removeEventListener("animationend", stop, true)
    document.removeEventListener("animationcancel", stop, true)
    for (const element of tracked) element.removeAttribute("data-shimmer-paused")
    tracked.clear()
  }
}

/**
 * Pauses every shimmer on the page while out of view, including an app's own,
 * while at least one caller is mounted. All callers share one observer; no ref
 * is needed. Reduced motion already removes the animation. Chromium renders
 * no frames in a hidden tab, so it needs no handling here.
 */
export function useShimmerPause(): void {
  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    if (callers++ === 0) uninstall = install()
    return () => {
      if (--callers === 0) {
        uninstall?.()
        uninstall = undefined
      }
    }
  }, [])
}
