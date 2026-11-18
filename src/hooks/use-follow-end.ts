import * as React from "react"

const upKeys = new Set(["ArrowUp", "PageUp", "Home"])

/**
 * Keeps a scrolling element at its end while what is in it grows, such as
 * a command's output, until the reader scrolls away from the end; back at
 * the end, it follows again. Put `ref` on the element that scrolls (e.g.
 * `CodeBlockContent` with a maximum height).
 */
export function useFollowEnd<T extends HTMLElement = HTMLElement>({
  threshold = 24,
}: {
  /** How close to the end, in pixels, still counts as at the end. */
  threshold?: number
} = {}) {
  const [atEnd, setAtEnd] = React.useState(true)
  const [follower] = React.useState(() => createFollower<T>(setAtEnd))
  const ref = React.useCallback(
    (element: T | null) => (element ? follower.attach(element, threshold) : undefined),
    [follower, threshold]
  )
  return { ref, atEnd, scrollToEnd: follower.scrollToEnd }
}

function createFollower<T extends HTMLElement>(
  setAtEnd: (atEnd: boolean) => void
) {
  let current: T | null = null
  let pinned = true
  const pin = (next: boolean) => {
    if (next === pinned) return
    pinned = next
    setAtEnd(next)
  }

  return {
    /** Goes to the end and follows again, e.g. from a "Jump to end" button. */
    scrollToEnd() {
      if (!current) return
      pin(true)
      current.scrollTop = current.scrollHeight
    },

    attach(element: T, threshold: number) {
      current = element
      pin(true)
      // A pointer held down on the scrollbar, or a finger on a touch
      // screen, may be about to scroll: wait for it to let go.
      let holding: number | null = null
      let lastTop = element.scrollTop

      const visible = () => element.getClientRects().length > 0
      const distance = () =>
        element.scrollHeight - element.scrollTop - element.clientHeight
      let frame = 0
      const toEnd = () => {
        if (pinned && holding === null && visible()) {
          element.scrollTop = element.scrollHeight
        }
      }
      // Once now, and once more after layout: a child that has grown may
      // not have grown the scroll height yet.
      const follow = () => {
        toEnd()
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(toEnd)
      }
      const leave = () => {
        if (element.scrollHeight > element.clientHeight) pin(false)
      }

      // Away from the end, it stops following; it follows again only when
      // scrolled down to the end, not on the way up (a smooth scroll up
      // starts close to the end).
      const onScroll = () => {
        const top = element.scrollTop
        const down = top >= lastTop
        lastTop = top
        if (holding !== null) return
        if (distance() <= threshold) {
          if (down) pin(true)
        } else if (pinned && down) {
          // Following, a scroll down short of the end is not the reader
          // leaving it: e.g. shown again, the browser restores where it
          // was before what was added while hidden. Go on to the end.
          follow()
        } else pin(false)
      }
      const onWheel = (event: WheelEvent) => {
        if (event.deltaY < 0) leave()
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (upKeys.has(event.key)) leave()
      }
      const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === "touch" || event.target === element) {
          holding = event.pointerId
        }
      }
      const onPointerUp = (event: PointerEvent) => {
        if (event.pointerId !== holding) return
        holding = null
        if (visible()) pin(distance() <= threshold)
        follow()
      }

      // It grows as lines are added or highlighted, or as it is shown again.
      const resized = new ResizeObserver(follow)
      const observe = () => {
        resized.disconnect()
        resized.observe(element)
        for (const child of element.children) resized.observe(child)
      }
      const added = new MutationObserver(() => {
        observe()
        follow()
      })
      observe()
      added.observe(element, { childList: true })

      element.addEventListener("scroll", onScroll, { passive: true })
      element.addEventListener("wheel", onWheel, { passive: true })
      element.addEventListener("keydown", onKeyDown)
      element.addEventListener("pointerdown", onPointerDown)
      window.addEventListener("pointerup", onPointerUp)
      window.addEventListener("pointercancel", onPointerUp)
      follow()

      return () => {
        cancelAnimationFrame(frame)
        resized.disconnect()
        added.disconnect()
        element.removeEventListener("scroll", onScroll)
        element.removeEventListener("wheel", onWheel)
        element.removeEventListener("keydown", onKeyDown)
        element.removeEventListener("pointerdown", onPointerDown)
        window.removeEventListener("pointerup", onPointerUp)
        window.removeEventListener("pointercancel", onPointerUp)
        if (current === element) current = null
      }
    },
  }
}
