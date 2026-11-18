/**
 * Holds every image's `decode()` till `release()`: images as they load,
 * for as long as a story looks.
 */
export function holdDecode() {
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  const decode = HTMLImageElement.prototype.decode
  HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
    return held.then(() => decode.call(this))
  }
  return {
    release: () => release(),
    restore: () => {
      HTMLImageElement.prototype.decode = decode
    },
  }
}

/**
 * Holds the page's images' `load` events till `release()`, then fires
 * them again: an image as it loads, in place, for as long as a story
 * looks. Images not in the page (`new Image()`) are not held.
 */
export function holdLoad() {
  const held = new Set<HTMLImageElement>()
  let holding = true
  const hold = (event: Event) => {
    if (!holding || !(event.target instanceof HTMLImageElement)) return
    event.stopImmediatePropagation()
    held.add(event.target)
  }
  // The document's: an image's load never reaches the window.
  document.addEventListener("load", hold, true)
  const restore = () => {
    holding = false
    document.removeEventListener("load", hold, true)
  }
  return {
    release: () => {
      restore()
      for (const image of held) image.dispatchEvent(new Event("load"))
      held.clear()
    },
    restore,
  }
}
