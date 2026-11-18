import * as React from "react"

// agent-ui: useSyncExternalStore, not setState in an effect
// (react-hooks/set-state-in-effect). A phone is narrower than 640px,
// Tailwind's `sm` (`max-sm:` in a component), not 768px: a foldable or a
// tablet has the desktop's layout. Sizes for a finger follow
// `pointer: coarse` instead.

const MOBILE_BREAKPOINT = 640
const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
