/** A story's viewport as a phone's, 390x844, where popups open as sheets. */
export const onAPhone = {
  parameters: {
    viewport: {
      options: {
        phone: {
          name: "Phone",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
} as const

/** A window of a size, the story's tests run at too. */
export function windowOf(name: string, width: number, height: number) {
  return {
    parameters: {
      viewport: {
        options: {
          [name]: {
            name,
            styles: { width: `${width}px`, height: `${height}px` },
            type: width < 600 ? "mobile" : "desktop",
          },
        },
      },
    },
    globals: { viewport: { value: name, isRotated: false } },
  } as const
}

/** Drags a sheet's handle down by `by` pixels, over `steps` moves. */
export async function swipeDown(handle: Element, by: number, steps = 6) {
  const box = handle.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  const at = (dy: number, type: string) =>
    handle.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        pointerType: "touch",
        clientX: x,
        clientY: y + dy,
      })
    )
  at(0, "pointerdown")
  for (let step = 1; step <= steps; step++) {
    await new Promise(requestAnimationFrame)
    at((by * step) / steps, "pointermove")
  }
  at(by, "pointerup")
}

/** Checks a sheet: across the screen, at its bottom, rows 44px tall. */
export function sheetGeometry(popup: HTMLElement, rows: HTMLElement[]) {
  const box = popup.getBoundingClientRect()
  return {
    across: Math.round(box.left) === 0 && Math.round(box.right) === innerWidth,
    atBottom: Math.round(box.bottom) === innerHeight,
    rows: rows.map((row) => Math.round(row.getBoundingClientRect().height)),
  }
}

/** Once a popup's opening animations have run. */
export async function opened(popup: HTMLElement) {
  // One cancelled (a popup opened again while it was closing) rejects:
  // it is over all the same.
  await Promise.all(
    popup
      .getAnimations()
      .map((animation) => animation.finished.catch(() => undefined))
  )
  return popup
}

/** What a tap near the top of the screen lands on: a sheet's scrim. */
export function aboveTheSheet() {
  return document.elementFromPoint(20, 40)!
}
