"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"

/** A box on the page, in its CSS pixels from its viewport's corner. */
type BrowserRemoteBox = { x: number; y: number; width: number; height: number }

/** A picture of the page's viewport, as the remote browser drew it. */
type BrowserRemoteFrame = {
  /** A data or blob URL of the picture. */
  src: string
  /** The viewport's size, in the page's CSS pixels. */
  width: number
  height: number
}

/** An option of a native select the page opened. */
type BrowserRemoteOption = {
  label: string
  value: string
  disabled?: boolean | undefined
  selected?: boolean | undefined
}

/** A native select's popup, open on the page. */
type BrowserRemoteSelect = {
  /** The select's box, the popup under it. */
  box: BrowserRemoteBox
  options: readonly BrowserRemoteOption[]
  multiple?: boolean | undefined
}

/** A dialog the page's script opened: alert, confirm, prompt, or leaving. */
type BrowserRemoteDialog = {
  type: "alert" | "confirm" | "prompt" | "beforeunload"
  message: string
  /** A prompt's text at first. */
  defaultText?: string | undefined
}

/**
 * A page a remote browser draws, as the app streams it: its latest
 * frame, the cursor over it, where its caret is (for an input method's
 * window), and a select or a dialog it opened.
 */
type BrowserRemote = {
  /** The latest frame; none yet: a spinner. */
  frame?: BrowserRemoteFrame | undefined
  /** The page's cursor, a CSS keyword ("pointer", "text"). */
  cursor?: string | undefined
  /** The focused field's caret, where text typed in an IME composes. */
  caret?: BrowserRemoteBox | undefined
  select?: BrowserRemoteSelect | undefined
  dialog?: BrowserRemoteDialog | undefined
}

type BrowserModifiers = {
  alt: boolean
  ctrl: boolean
  meta: boolean
  shift: boolean
}

/**
 * The reader's input on a remote page, for the app to send to its
 * browser; points in the page's CSS pixels.
 */
type BrowserRemoteInput =
  | {
      type: "pointer"
      action: "move" | "down" | "up"
      x: number
      y: number
      /** The button pressed or let go, as a MouseEvent's: 0 the main. */
      button: number
      /** The buttons held, as a MouseEvent's. */
      buttons: number
      /** 1 a click, 2 a double click…; 0 for a move. */
      clickCount: number
      pointerType: string
      modifiers: BrowserModifiers
    }
  | {
      type: "wheel"
      x: number
      y: number
      deltaX: number
      deltaY: number
      /** 0 pixels, 1 lines, 2 pages, as a WheelEvent's. */
      deltaMode: number
      modifiers: BrowserModifiers
    }
  | {
      type: "key"
      action: "down" | "up"
      key: string
      code: string
      keyCode: number
      repeat: boolean
      /** The text the key types, if any ("a", "\r" for Enter). */
      text?: string | undefined
      modifiers: BrowserModifiers
    }
  | {
      /** An input method's composition, separate from the keys. */
      type: "composition"
      action: "start" | "update" | "end"
      /** Composing: the text so far; at its end, the text committed. */
      text: string
      selectionStart?: number | undefined
      selectionEnd?: number | undefined
    }
  /** Text from no key: dictation, an emoji picker. */
  | { type: "text"; text: string }
  | { type: "paste"; text: string }
  /** The page's room changed: size the remote viewport to it. */
  | { type: "resize"; width: number; height: number; devicePixelRatio: number }
  | { type: "select"; values: string[] }
  | { type: "select-cancel" }
  | { type: "dialog"; accept: boolean; text?: string | undefined }

type BrowserRemoteLabels = {
  /** A dialog's title: "example.com says". */
  pageSays: (host: string) => string
  ok: string
  cancel: string
  /** A page that asks before it is left: its buttons. */
  leave: string
  stay: string
  leaveTitle: string
  /** A multiple select's button that sends the choice. */
  done: string
  /** Before the first frame. */
  connecting: string
}

const defaultRemoteLabels: BrowserRemoteLabels = {
  pageSays: (host) => (host ? `${host} says` : "This page says"),
  ok: "OK",
  cancel: "Cancel",
  leave: "Leave",
  stay: "Stay",
  leaveTitle: "Leave this page?",
  done: "Done",
  connecting: "Connecting",
}

const modifiersOf = (event: {
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}): BrowserModifiers => ({
  alt: event.altKey,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
  shift: event.shiftKey,
})

/** How long the room stays still before its size is said: 150ms. */
const resizeWait = 150

/**
 * Whether a screen's keyboard is up: the visual viewport is shorter than
 * the window by more than a bar's height.
 */
function keyboardShown() {
  const viewport = window.visualViewport
  return viewport !== null && viewport.height < window.innerHeight - 120
}

/**
 * A remote browser's page: its latest frame, drawn once decoded so
 * frames never flicker; the reader's pointer, wheel and keys on it sent
 * in the page's CSS pixels; text through a hidden field at the page's
 * caret, so an input method composes there; its cursor; and the page's
 * own select popups and script dialogs, drawn by agentui. By touch, the
 * screen's keyboard comes up only while the page has a caret (a field of
 * its has the focus), not for a tap anywhere else.
 */
function BrowserRemotePage({
  title,
  host,
  remote,
  inert = false,
  onInput,
  copySelection,
  shortcut,
  labels: labelsProp,
}: {
  title: string
  /** The page's host, for a dialog's title. */
  host: string
  remote: BrowserRemote
  /** While the agent drives it: its input waits. */
  inert?: boolean
  onInput: (input: BrowserRemoteInput) => void
  /** The page's selected text, for a copy. */
  copySelection?: (() => Promise<string | undefined>) | undefined
  /** A key that is the app's (a shortcut): true, and it is not sent. */
  shortcut?: ((event: KeyboardEvent) => boolean) | undefined
  labels?: Partial<BrowserRemoteLabels> | undefined
}) {
  const labels = { ...defaultRemoteLabels, ...labelsProp }
  const root = React.useRef<HTMLDivElement>(null)
  const picture = React.useRef<HTMLImageElement>(null)
  const field = React.useRef<HTMLTextAreaElement>(null)
  const send = React.useEffectEvent(onInput)
  // By touch (or a pen), the field keeps the focus for a keyboard's keys
  // but asks for no keyboard on the screen (inputmode none) until the
  // page has a caret.
  const [touch, setTouch] = React.useState(false)
  const typing = !touch || remote.caret !== undefined
  const wasTyping = React.useRef(typing)
  React.useEffect(() => {
    if (wasTyping.current === typing) return
    wasTyping.current = typing
    const element = field.current
    // Focused again, as the keyboard is asked for on focus: up for the
    // caret, down without one.
    if (!element || document.activeElement !== element) return
    element.blur()
    element.focus({ preventScroll: true })
  }, [typing])
  const isShortcut = React.useEffectEvent(
    (event: KeyboardEvent) => shortcut?.(event) ?? false
  )
  const frame = remote.frame

  // The frame shown: the latest, once decoded, so the last stays until
  // the next can be drawn whole.
  const [decoded, setDecoded] = React.useState(frame)
  React.useEffect(() => {
    if (!frame) return
    let current = true
    const next = new Image()
    next.src = frame.src
    next
      .decode()
      .catch(() => {})
      .then(() => {
        if (current) setDecoded(frame)
      })
    return () => {
      current = false
    }
  }, [frame])
  // None while the app has none: pending again.
  const shown = frame ? decoded : undefined

  // Its room, said at once and then once it stays still.
  React.useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    let timer = 0
    let said = ""
    const say = () => {
      const size = {
        width: element.offsetWidth,
        height: element.offsetHeight,
        devicePixelRatio: window.devicePixelRatio,
      }
      const key = `${size.width}x${size.height}@${size.devicePixelRatio}`
      if (key === said || size.width === 0 || size.height === 0) return
      said = key
      send({ type: "resize", ...size })
    }
    say()
    const later = () => {
      clearTimeout(timer)
      timer = window.setTimeout(say, resizeWait)
    }
    const observer = new ResizeObserver(later)
    observer.observe(element)
    let ratio = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    const rescaled = () => {
      ratio.removeEventListener("change", rescaled)
      ratio = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      ratio.addEventListener("change", rescaled)
      later()
    }
    ratio.addEventListener("change", rescaled)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
      ratio.removeEventListener("change", rescaled)
    }
  }, [])

  // A point of the window on the page, in its CSS pixels.
  const pageAt = React.useEffectEvent((clientX: number, clientY: number) => {
    const image = picture.current
    if (!image || !shown) return null
    const rect = image.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      x: ((clientX - rect.left) / rect.width) * shown.width,
      y: ((clientY - rect.top) / rect.height) * shown.height,
    }
  })

  // Wheel: not the panel's scroll, the page's.
  React.useEffect(() => {
    const element = root.current
    if (!element || inert) return
    const wheel = (event: WheelEvent) => {
      const at = pageAt(event.clientX, event.clientY)
      if (!at) return
      event.preventDefault()
      send({
        type: "wheel",
        ...at,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        modifiers: modifiersOf(event),
      })
    }
    element.addEventListener("wheel", wheel, { passive: false })
    return () => element.removeEventListener("wheel", wheel)
  }, [inert])

  // A press after another, near it and soon: a double click, and so on.
  const clicks = React.useRef({ count: 0, time: 0, x: 0, y: 0, button: -1 })
  // Moves sent once a frame, the latest.
  const moving = React.useRef<{ input: BrowserRemoteInput; frame: number }>(
    null
  )
  const flushMove = () => {
    const pending = moving.current
    if (!pending) return
    cancelAnimationFrame(pending.frame)
    moving.current = null
    send(pending.input)
  }
  React.useEffect(
    () => () => {
      if (moving.current) cancelAnimationFrame(moving.current.frame)
    },
    []
  )

  const pointer = (
    event: React.PointerEvent<HTMLDivElement>,
    action: "move" | "down" | "up"
  ) => {
    const at = pageAt(event.clientX, event.clientY)
    if (!at) return
    let clickCount = 0
    if (action === "down") {
      const last = clicks.current
      const again =
        last.button === event.button &&
        event.timeStamp - last.time < 500 &&
        Math.hypot(event.clientX - last.x, event.clientY - last.y) < 5
      clickCount = again ? last.count + 1 : 1
      clicks.current = {
        count: clickCount,
        time: event.timeStamp,
        x: event.clientX,
        y: event.clientY,
        button: event.button,
      }
    } else if (action === "up") clickCount = clicks.current.count
    const input: BrowserRemoteInput = {
      type: "pointer",
      action,
      ...at,
      button: action === "move" ? -1 : event.button,
      buttons: event.buttons,
      clickCount,
      pointerType: event.pointerType,
      modifiers: modifiersOf(event),
    }
    if (action === "move") {
      if (moving.current) {
        moving.current.input = input
        return
      }
      moving.current = {
        input,
        frame: requestAnimationFrame(() => {
          const pending = moving.current
          moving.current = null
          if (pending) send(pending.input)
        }),
      }
      return
    }
    flushMove()
    send(input)
  }

  const key = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    action: "down" | "up"
  ) => {
    const native = event.nativeEvent
    if (isShortcut(native)) return
    // An input method's: its composition says it.
    if (native.isComposing || event.keyCode === 229) return
    const command = event.metaKey || event.ctrlKey
    if (action === "down" && command && !event.altKey) {
      const letter = event.key.toLowerCase()
      // Pasting: the paste event says what.
      if (letter === "v") return
      if (letter === "c" && copySelection) {
        event.preventDefault()
        void copySelection().then((text) => {
          if (text) void navigator.clipboard?.writeText(text).catch(() => {})
        })
        return
      }
    }
    // The page's, not the panel's: Tab, the arrows, Enter.
    event.preventDefault()
    const text =
      action === "down" && !command
        ? event.key === "Enter"
          ? "\r"
          : event.key.length === 1
            ? event.key
            : undefined
        : undefined
    send({
      type: "key",
      action,
      key: event.key,
      code: event.code,
      keyCode: event.keyCode,
      repeat: event.repeat,
      ...(text !== undefined ? { text } : {}),
      modifiers: modifiersOf(event),
    })
  }

  // On the page itself: not in its select or dialog, whose events come
  // up through React from their portals.
  const onPage = (event: React.SyntheticEvent) =>
    event.target instanceof Node && event.currentTarget.contains(event.target)

  const caret = remote.caret
  const select = remote.select
  const dialog = remote.dialog
  const percent = (value: number, of: number) => `${(value / of) * 100}%`

  return (
    <div
      ref={root}
      data-slot="browser-remote"
      data-pending={shown ? undefined : ""}
      className="relative size-full overflow-hidden bg-white outline-none"
      style={{ cursor: remote.cursor ?? "default" }}
      onPointerDown={(event) => {
        if (inert || !onPage(event)) return
        // The field takes the keys, and an input method's text.
        event.preventDefault()
        const touching =
          event.pointerType === "touch" || event.pointerType === "pen"
        if (touching !== touch) setTouch(touching)
        const element = field.current
        if (element) {
          // Set now, before the focus, not when it renders.
          const keyboard = !touching || caret !== undefined
          element.inputMode = keyboard ? "text" : "none"
          wasTyping.current = keyboard
          // A tap in the page's field with the keyboard put away (iOS
          // brings it up only on a focus in a tap): focused again.
          if (
            touching &&
            keyboard &&
            document.activeElement === element &&
            !keyboardShown()
          )
            element.blur()
          element.focus({ preventScroll: true })
        }
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Not a pointer of the browser's, e.g. an event made by a script.
        }
        pointer(event, "down")
      }}
      onPointerMove={(event) => {
        if (!inert && onPage(event)) pointer(event, "move")
      }}
      onPointerUp={(event) => {
        if (!inert && onPage(event)) pointer(event, "up")
      }}
      onContextMenu={(event) => {
        // The page's own menu, by its right button.
        if (!inert && onPage(event)) event.preventDefault()
      }}
    >
      {shown && (
        <img
          ref={picture}
          src={shown.src}
          alt={title}
          draggable={false}
          className="pointer-events-none block w-full select-none"
        />
      )}
      {!shown && (
        <div
          role="status"
          aria-label={labels.connecting}
          className="absolute inset-0 flex items-center justify-center bg-background"
        >
          <Spinner className="text-muted-foreground" />
        </div>
      )}
      <textarea
        ref={field}
        data-slot="browser-remote-input"
        aria-label={title}
        inputMode={typing ? "text" : "none"}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        tabIndex={inert ? -1 : 0}
        // At the page's caret, unseen: an input method's window there.
        className="pointer-events-none absolute size-px resize-none overflow-hidden border-0 bg-transparent p-0 text-transparent caret-transparent opacity-0 outline-none"
        style={
          caret && shown
            ? {
                left: percent(caret.x, shown.width),
                top: percent(caret.y, shown.height),
                height: percent(Math.max(caret.height, 1), shown.height),
              }
            : { left: 0, top: 0 }
        }
        onKeyDown={(event) => {
          if (!inert) key(event, "down")
        }}
        onKeyUp={(event) => {
          if (!inert) key(event, "up")
        }}
        onCompositionStart={() =>
          send({ type: "composition", action: "start", text: "" })
        }
        onCompositionUpdate={(event) => {
          const element = event.currentTarget
          send({
            type: "composition",
            action: "update",
            text: event.data,
            selectionStart: element.selectionStart,
            selectionEnd: element.selectionEnd,
          })
        }}
        onCompositionEnd={(event) => {
          send({ type: "composition", action: "end", text: event.data })
          event.currentTarget.value = ""
        }}
        onInput={(event) => {
          const native = event.nativeEvent as InputEvent
          const element = event.currentTarget
          // What composes is the composition's; what came of no key, text.
          if (native.isComposing) return
          if (native.inputType === "insertText" && native.data)
            send({ type: "text", text: native.data })
          element.value = ""
        }}
        onPaste={(event) => {
          event.preventDefault()
          if (inert) return
          const text = event.clipboardData.getData("text/plain")
          if (text) send({ type: "paste", text })
        }}
      />
      {select && shown && (
        <RemoteSelect
          key={select.options.map((option) => option.value).join("\n")}
          select={select}
          box={{
            left: percent(select.box.x, shown.width),
            top: percent(select.box.y, shown.height),
            width: percent(select.box.width, shown.width),
            height: percent(select.box.height, shown.height),
          }}
          onChoose={(values) => send({ type: "select", values })}
          onCancel={() => send({ type: "select-cancel" })}
          labels={labels}
        />
      )}
      {dialog && (
        <RemoteDialog
          key={`${dialog.type}\n${dialog.message}`}
          dialog={dialog}
          host={host}
          onAnswer={(accept, text) =>
            send({
              type: "dialog",
              accept,
              ...(text !== undefined ? { text } : {}),
            })
          }
          labels={labels}
        />
      )}
    </div>
  )
}

/** A native select's popup as agentui draws one, under its box. */
function RemoteSelect({
  select,
  box,
  onChoose,
  onCancel,
  labels,
}: {
  select: BrowserRemoteSelect
  box: React.CSSProperties
  onChoose: (values: string[]) => void
  onCancel: () => void
  labels: BrowserRemoteLabels
}) {
  const anchor = React.useRef<HTMLDivElement>(null)
  const list = React.useRef<HTMLDivElement>(null)
  const [chosen, setChosen] = React.useState(
    () =>
      new Set(
        select.options
          .filter((option) => option.selected)
          .map((option) => option.value)
      )
  )
  const answered = React.useRef(false)
  const answer = (values: string[] | null) => {
    if (answered.current) return
    answered.current = true
    if (values) onChoose(values)
    else onCancel()
  }
  const options = () =>
    Array.from(
      list.current?.querySelectorAll<HTMLElement>(
        "[role=option]:not([aria-disabled=true])"
      ) ?? []
    )
  return (
    <>
      <div
        ref={anchor}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={box}
      />
      <Popover
        open
        onOpenChange={(open) => {
          if (!open) answer(null)
        }}
      >
        <PopoverContent
          data-slot="browser-remote-select"
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={4}
          initialFocus={() =>
            list.current?.querySelector<HTMLElement>(
              "[role=option][aria-selected=true]:not([aria-disabled=true])"
            ) ??
            options()[0] ??
            true
          }
          className="max-h-(--available-height) w-auto min-w-(--anchor-width) gap-0 overflow-y-auto p-1"
        >
          <div
            ref={list}
            role="listbox"
            aria-multiselectable={select.multiple || undefined}
            className="flex flex-col"
            onKeyDown={(event) => {
              const all = options()
              const at = all.indexOf(document.activeElement as HTMLElement)
              const to =
                event.key === "ArrowDown"
                  ? Math.min(all.length - 1, at + 1)
                  : event.key === "ArrowUp"
                    ? Math.max(0, at - 1)
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? all.length - 1
                        : null
              if (to === null) return
              event.preventDefault()
              all[to]?.focus()
            }}
          >
            {select.options.map((option) => {
              const selected = chosen.has(option.value)
              const choose = () => {
                if (option.disabled) return
                if (!select.multiple) return answer([option.value])
                setChosen((current) => {
                  const next = new Set(current)
                  if (next.has(option.value)) next.delete(option.value)
                  else next.add(option.value)
                  return next
                })
              }
              return (
                <div
                  key={option.value}
                  role="option"
                  tabIndex={-1}
                  aria-selected={selected}
                  aria-disabled={option.disabled || undefined}
                  onClick={choose}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return
                    event.preventDefault()
                    choose()
                  }}
                  className="flex min-h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-hidden motion-hover select-none hover:bg-accent focus-visible:bg-accent aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2}
                    aria-hidden
                    className={cn("size-4 shrink-0", !selected && "invisible")}
                  />
                </div>
              )
            })}
          </div>
          {select.multiple && (
            <div className="flex justify-end border-t p-1 pt-2">
              <Button size="sm" onClick={() => answer([...chosen])}>
                {labels.done}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}

/** A page script's dialog as agentui draws one. */
function RemoteDialog({
  dialog,
  host,
  onAnswer,
  labels,
}: {
  dialog: BrowserRemoteDialog
  host: string
  onAnswer: (accept: boolean, text?: string) => void
  labels: BrowserRemoteLabels
}) {
  const field = React.useRef<HTMLInputElement>(null)
  const answered = React.useRef(false)
  const answer = (accept: boolean) => {
    if (answered.current) return
    answered.current = true
    onAnswer(
      accept,
      dialog.type === "prompt" && accept
        ? (field.current?.value ?? dialog.defaultText ?? "")
        : undefined
    )
  }
  const leaving = dialog.type === "beforeunload"
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) answer(false)
      }}
    >
      <AlertDialogContent data-slot="browser-remote-dialog" size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {leaving ? labels.leaveTitle : labels.pageSays(host)}
          </AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere whitespace-pre-wrap">
            {dialog.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.type === "prompt" && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              answer(true)
            }}
          >
            <Input
              ref={field}
              autoFocus
              aria-label={dialog.message || labels.pageSays(host)}
              defaultValue={dialog.defaultText ?? ""}
            />
          </form>
        )}
        <AlertDialogFooter>
          {dialog.type !== "alert" && (
            <AlertDialogCancel onClick={() => answer(false)}>
              {leaving ? labels.stay : labels.cancel}
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={() => answer(true)}>
            {leaving ? labels.leave : labels.ok}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export {
  BrowserRemotePage,
  defaultRemoteLabels,
  type BrowserModifiers,
  type BrowserRemote,
  type BrowserRemoteBox,
  type BrowserRemoteDialog,
  type BrowserRemoteFrame,
  type BrowserRemoteInput,
  type BrowserRemoteLabels,
  type BrowserRemoteOption,
  type BrowserRemoteSelect,
}
