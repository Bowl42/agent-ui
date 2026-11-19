import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"

// agentui: on a phone a menu, a popover or a select's list opens as a
// sheet from the bottom, as the platform's action sheets do, not anchored
// to its trigger: across the screen, over a scrim that closes it when
// tapped, a handle to swipe it down by, its rows 44px tall, clear of the
// home indicator. It stays Base UI's popup (its roles, focus and keys);
// only where it is and how it looks change.

/** Whether a popup opens as a sheet: on a phone, unless `sheet` is false. */
function usePhoneSheet(sheet = true) {
  const phone = useIsMobile()
  return sheet && phone
}

/**
 * A row's look in a sheet, by the `data-phone-sheet` its popup carries:
 * 44px tall, for a finger.
 */
const phoneSheetRow = "in-data-phone-sheet:min-h-11"

/**
 * The positioner's style as a sheet: along the bottom of the screen,
 * over the coordinates it is given next to its anchor.
 */
const phoneSheetPositionerStyle: React.CSSProperties = {
  position: "fixed",
  top: "auto",
  right: 0,
  bottom: 0,
  left: 0,
  transform: "none",
}

/**
 * The popup's style as a sheet, under the app's: up to 6rem below the top
 * of the screen. Base UI's style may be a function of the popup's state.
 */
function phoneSheetPopupStyle<State>(
  style:
    | React.CSSProperties
    | ((state: State) => React.CSSProperties | undefined)
    | undefined
) {
  const sheet: React.CSSProperties = { maxHeight: "calc(100dvh - 6rem)" }
  return typeof style === "function"
    ? (state: State) => ({ ...sheet, ...style(state) })
    : { ...sheet, ...style }
}

/**
 * The popup's look as a sheet, after the app's classes: it slides up from
 * the bottom whichever side it was to open on, in place of the slide
 * from that side.
 */
const phoneSheetPopup =
  "w-full max-w-none min-w-0 rounded-t-xl rounded-b-none border-t pb-safe shadow-none motion-slide data-open:zoom-in-100 data-closed:slide-out-to-bottom data-closed:zoom-out-100 data-[side=bottom]:slide-in-from-bottom data-[side=inline-end]:slide-in-from-bottom data-[side=inline-start]:slide-in-from-bottom data-[side=left]:slide-in-from-bottom data-[side=right]:slide-in-from-bottom data-[side=top]:slide-in-from-bottom"

/** The scrim behind a sheet: tapping it closes the sheet. */
const phoneSheetBackdrop =
  "fixed inset-0 z-50 bg-black/10 motion-slide data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"

/** Closes the popup a sheet is part of, as Escape would. */
function dismiss(element: HTMLElement) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  )
}

/**
 * A sheet's top: the handle, then its `title` if it has one. Dragged
 * down far enough, or flicked, it closes the sheet; else it springs back.
 */
function PhoneSheetHeader({ title }: { title?: React.ReactNode }) {
  const drag = React.useRef<{
    popup: HTMLElement
    y: number
    at: number
  } | null>(null)
  const by = React.useRef(0)

  return (
    <div
      data-slot="phone-sheet-header"
      className="sticky top-0 z-10 flex touch-none flex-col items-center bg-popover pt-2 select-none"
      onPointerDown={(event) => {
        const popup = event.currentTarget.parentElement
        if (!popup) return
        // The moves go on reaching it off the handle. (A pointer a script
        // made has none to capture.)
        if (event.isTrusted)
          event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { popup, y: event.clientY, at: event.timeStamp }
        by.current = 0
        popup.style.transition = "none"
      }}
      onPointerMove={(event) => {
        const start = drag.current
        if (!start) return
        by.current = Math.max(0, event.clientY - start.y)
        start.popup.style.translate = `0 ${by.current}px`
      }}
      onPointerUp={(event) => {
        const start = drag.current
        drag.current = null
        if (!start) return
        start.popup.style.transition = ""
        const speed = by.current / Math.max(1, event.timeStamp - start.at)
        // A quarter of its height, or a flick of half a pixel a millisecond.
        if (by.current > start.popup.offsetHeight / 4 || speed > 0.5) {
          dismiss(start.popup)
        } else {
          start.popup.style.translate = ""
        }
      }}
      onPointerCancel={() => {
        const start = drag.current
        drag.current = null
        if (!start) return
        start.popup.style.transition = ""
        start.popup.style.translate = ""
      }}
    >
      <div aria-hidden="true" className="h-1 w-9 rounded-full bg-muted" />
      {title ? (
        <div
          data-slot="phone-sheet-title"
          className="w-full truncate px-3 py-2 text-center text-sm font-medium text-muted-foreground"
        >
          {title}
        </div>
      ) : (
        <div className="h-2" />
      )}
    </div>
  )
}

export {
  PhoneSheetHeader,
  phoneSheetBackdrop,
  phoneSheetPopup,
  phoneSheetPopupStyle,
  phoneSheetPositionerStyle,
  phoneSheetRow,
  usePhoneSheet,
}
