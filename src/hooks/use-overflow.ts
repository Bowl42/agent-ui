import * as React from "react"

/**
 * Whether an element's content is taller or wider than it, kept as it and
 * its content change: e.g. to make a scrolling region reachable by
 * keyboard (`tabIndex={overflows ? 0 : undefined}`) only while it
 * scrolls, as its arrow keys and Page Down need it focused (WCAG 2.1.1).
 * Give the element the ref callback.
 */
export function useOverflow<T extends HTMLElement>(): [
  (element: T | null) => void,
  boolean,
] {
  const [overflows, setOverflows] = React.useState(false)
  const ref = React.useCallback((element: T | null) => {
    if (!element) return
    const read = () =>
      setOverflows(
        element.scrollHeight > element.clientHeight + 1 ||
          element.scrollWidth > element.clientWidth + 1
      )
    const resize = new ResizeObserver(read)
    const watch = () => {
      resize.disconnect()
      resize.observe(element)
      for (const child of element.children) resize.observe(child)
      read()
    }
    const mutation = new MutationObserver(watch)
    mutation.observe(element, { childList: true })
    watch()
    return () => {
      resize.disconnect()
      mutation.disconnect()
    }
  }, [])
  return [ref, overflows]
}
