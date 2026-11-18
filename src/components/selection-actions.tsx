"use client"

import * as React from "react"
import { Toolbar } from "@base-ui/react/toolbar"
import { HugeiconsIcon } from "@hugeicons/react"
import { QuoteDownIcon } from "@hugeicons/core-free-icons"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent } from "@/components/ui/popover"

/** What an action gets: the selection as Markdown, and a copy of its range. */
type SelectionActionsSelection = { text: string; range: Range }
type SelectionActionsLabels = {
  /** The toolbar's accessible name. */
  toolbar: string
  /** Shown instead of actions past maxLength. */
  tooLong: string
}

type SelectionQuoteLabels = { quote: string }
const defaults: SelectionActionsLabels = {
  toolbar: "Selection actions",
  tooLong: "Selection is too long to quote",
}

const defaultQuoteLabels: SelectionQuoteLabels = { quote: "Quote" }
// How long a touch selection must hold still before the toolbar shows, so
// it comes after the OS's handles settle and not during the drag.
const touchSettle = 300
const selectionToolbar =
  "w-auto flex-row items-center gap-0.5 p-1 data-anchor-hidden:invisible motion-reduce:animate-none"
const Context = React.createContext<{
  selection: SelectionActionsSelection
  done: () => void
} | null>(null)
const field = (node: Node | null) => {
  const element = node instanceof Element ? node : node?.parentElement
  return !!element?.closest(
    'input, textarea, [contenteditable]:not([contenteditable="false"])'
  )
}

/** Plain Markdown for the selected fragment, without the answer's controls. */
function selectionMarkdown(range: Range): string {
  const skip =
    'button, svg, [aria-hidden="true"], [hidden], script, style, [data-slot="copy-button"], .select-none, .sr-only'
  const ancestor =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
  if (ancestor?.closest(skip)) return ""
  const walk = (node: Node, depth = 0): string => {
    if (node.nodeType === Node.TEXT_NODE)
      return (node.textContent ?? "").replace(/[^\S\n]+|\n/g, " ")
    if (!(node instanceof Element) && !(node instanceof DocumentFragment))
      return ""
    if (node instanceof Element && node.matches(skip)) return ""
    const tag = node instanceof Element ? node.tagName.toLowerCase() : ""
    const children = () =>
      Array.from(node.childNodes)
        .map((child) => walk(child, depth))
        .join("")
    if (tag === "pre") {
      const pre = node as Element
      const code = pre.querySelector("code")
      // A Markdown CodeBlock says its fence's language (`data-language`);
      // other code, by a `language-*` class.
      const language =
        pre.getAttribute("data-language") ??
        code?.className.match(/(?:^|\s)language-(\S+)/)?.[1] ??
        ""
      // A CodeBlock's lines are blocks with no newline between them; the
      // rest of a folded one is one text.
      const body = pre.querySelector("[data-slot=code-block-line]")
        ? Array.from(code?.children ?? [], (part) =>
            part.matches("[hidden]")
              ? null
              : (part.textContent ?? "").replace(/\n$/, "")
          )
            .filter((part) => part !== null)
            .join("\n")
        : (pre.textContent ?? "").replace(/\n$/, "")
      return `\n\n\`\`\`${language}\n${body}\n\`\`\`\n\n`
    }
    if (tag === "ul" || tag === "ol") {
      const start = Number((node as Element).getAttribute("start") ?? 1)
      const items = Array.from(node.children).filter(
        (child) => child.tagName === "LI"
      )
      return (
        "\n" +
        items
          .map((item, index) => {
            if (item.matches(skip)) return ""
            const body = Array.from(item.childNodes)
              .map((child) => walk(child, depth + 1))
              .join("")
              .trim()
            return (
              "  ".repeat(depth) +
              (tag === "ol" ? `${start + index}. ` : "- ") +
              body
            )
          })
          .filter(Boolean)
          .join("\n") +
        "\n"
      )
    }
    const text = children()
    if (tag === "br") return "\n"
    if (tag === "code") return `\`${text}\``
    // Streamdown's bold is a span.
    if (
      tag === "strong" ||
      tag === "b" ||
      (node instanceof Element && node.matches("[data-streamdown=strong]"))
    )
      return `**${text}**`
    if (tag === "em" || tag === "i") return `_${text}_`
    if (tag === "a") {
      const href = (node as Element).getAttribute("href")
      return href && text !== href ? `[${text}](${href})` : text
    }
    if (tag === "blockquote")
      return (
        "\n\n" +
        text
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n") +
        "\n\n"
      )
    if (tag === "tr")
      return (
        "\n\n" +
        Array.from(node.children)
          .map((cell) => walk(cell, depth).trim())
          .join(" | ") +
        "\n\n"
      )
    if (/^h[1-6]$/.test(tag))
      return `\n\n${"#".repeat(Number(tag[1]))} ${text.trim()}\n\n`
    if (/^(p|div|pre|table|hr)$/.test(tag)) return `\n\n${text.trim()}\n\n`
    return text
  }
  // cloneContents omits the common ancestor, including code and list context.
  let fragment: Node = range.cloneContents()
  let parent = ancestor
  while (parent) {
    if (parent.matches("p, div, table, body")) break
    const wrapper = parent.cloneNode(false) as Element
    if (parent.tagName === "OL" && range.startContainer) {
      const item = (
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer.parentElement
      )?.closest("li")
      if (item?.parentElement === parent)
        wrapper.setAttribute(
          "start",
          String(
            Number(parent.getAttribute("start") ?? 1) +
              Array.from(parent.children).indexOf(item)
          )
        )
    }
    wrapper.appendChild(fragment)
    fragment = wrapper
    if (parent.matches("pre, blockquote, h1, h2, h3, h4, h5, h6, ul, ol")) break
    parent = parent.parentElement
  }
  return walk(fragment)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** A `SelectionActions` as the shared listeners see it. */
type Region = {
  element: HTMLElement
  show: (selection: SelectionActionsSelection, coarse: boolean) => void
  hide: () => void
  popup: () => HTMLElement | null
}

/**
 * One set of document listeners for every `SelectionActions`, however
 * many answers a conversation has: attached with the first, detached
 * with the last. A change of selection finds its region by the DOM
 * (`closest`), so only that one, and the one shown before, does work or
 * renders.
 */
const regions = new WeakMap<Element, Region>()
let mounted = 0
let shown: Region | null = null
/** Escape hid the toolbar; it stays hidden until the selection changes. */
let dismissed = false
/** Where focus was when Tab moved it into the toolbar. */
let previousFocus: HTMLElement | null = null
let pressed = false
let touch = false
let frame = 0
let timer = 0
let coarse: MediaQueryList | null = null

function regionOf(node: Node | null) {
  const element = node instanceof Element ? node : node?.parentElement
  let at = element?.closest("[data-slot=selection-actions]")
  while (at) {
    const region = regions.get(at)
    if (region) return region
    at = at.parentElement?.closest("[data-slot=selection-actions]")
  }
  return null
}

function hideShown() {
  shown?.hide()
  shown = null
}

function evaluate() {
  // Focus in the toolbar keeps what it acts on: WebKit drops the
  // selection when a button takes focus.
  if (shown?.popup()?.contains(document.activeElement)) return
  const current = document.getSelection()
  const range =
    current && current.rangeCount === 1 && !current.isCollapsed
      ? current.getRangeAt(0)
      : null
  const region = range ? regionOf(range.startContainer) : null
  if (
    !range ||
    !region ||
    dismissed ||
    !region.element.contains(range.endContainer) ||
    field(range.startContainer) ||
    field(range.endContainer) ||
    !range.toString().trim()
  )
    return hideShown()
  const text = selectionMarkdown(range)
  if (!text) return hideShown()
  if (shown !== region) hideShown()
  shown = region
  region.show({ text, range: range.cloneRange() }, touch || !!coarse?.matches)
}

function cancel() {
  cancelAnimationFrame(frame)
  clearTimeout(timer)
}

function schedule() {
  cancel()
  // A drag shows it when it ends, not on each step.
  if (pressed) return
  if (touch || coarse?.matches) timer = window.setTimeout(evaluate, touchSettle)
  else frame = requestAnimationFrame(evaluate)
}

function selectionChange() {
  // Any change, even to the same range again, shows it again.
  dismissed = false
  schedule()
}

function pointerDown(event: PointerEvent) {
  touch = event.pointerType === "touch"
  if (touch) return
  pressed = true
  cancel()
}

function pointerUp(event: PointerEvent) {
  pressed =
    event.type !== "pointercancel" &&
    event.pointerType !== "touch" &&
    event.buttons !== 0
  schedule()
}

function keyDown(event: KeyboardEvent) {
  if (!shown || event.isComposing) return
  const active = document.activeElement
  const inside = !!active && !!shown.popup()?.contains(active)
  if (event.key === "Escape") {
    dismissed = true
    cancel()
    hideShown()
    if (inside) {
      event.stopPropagation()
      if (previousFocus?.isConnected) previousFocus.focus()
      else (active as HTMLElement).blur()
    }
    previousFocus = null
  } else if (
    event.key === "Tab" &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.defaultPrevented &&
    !inside &&
    !field(active)
  ) {
    const first = shown
      .popup()
      ?.querySelector<HTMLElement>(
        'button:not(:disabled):not([aria-disabled="true"])'
      )
    if (!first) return
    event.preventDefault()
    previousFocus = active as HTMLElement | null
    first.focus()
  }
}

// Escape in the capture phase, before the popup's own handling.
const listeners = [
  ["selectionchange", selectionChange, false],
  ["pointerdown", pointerDown, false],
  ["pointerup", pointerUp, false],
  ["pointercancel", pointerUp, false],
  ["keydown", keyDown, true],
] as const

function register(region: Region) {
  regions.set(region.element, region)
  if (mounted++ === 0) {
    coarse = window.matchMedia("(pointer: coarse)")
    for (const [type, listener, capture] of listeners)
      document.addEventListener(type, listener as EventListener, capture)
  }
  return () => {
    regions.delete(region.element)
    if (shown === region) shown = null
    if (--mounted > 0) return
    cancel()
    for (const [type, listener, capture] of listeners)
      document.removeEventListener(type, listener as EventListener, capture)
  }
}

/**
 * A region, e.g. an answer, whose selected text gets a small toolbar by
 * it: `actions` (`SelectionQuote`, `SelectionAction`s), or past
 * `maxLength` characters a line saying it is too long. It takes neither
 * focus nor the selection; Tab moves into it, Escape hides it.
 */
function SelectionActions({
  actions,
  maxLength,
  labels,
  disabled = false,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  actions: React.ReactNode
  maxLength?: number
  labels?: Partial<SelectionActionsLabels>
  disabled?: boolean
}) {
  const [region, setRegion] = React.useState<HTMLDivElement | null>(null)
  const popup = React.useRef<HTMLDivElement>(null)
  const [state, setState] = React.useState<{
    selection: SelectionActionsSelection
    coarse: boolean
  } | null>(null)
  const allLabels = { ...defaults, ...labels }
  React.useEffect(() => {
    if (!region || disabled) return
    const unregister = register({
      element: region,
      show: (selection, coarse) => setState({ selection, coarse }),
      hide: () => setState(null),
      popup: () => popup.current,
    })
    return () => {
      unregister()
      setState(null)
    }
  }, [region, disabled])
  const selection = state?.selection
  return (
    <>
      <div
        ref={setRegion}
        data-slot="selection-actions"
        className={cn(className)}
        {...props}
      >
        {children}
      </div>
      {selection && !disabled ? (
        <Popover
          open
          modal={false}
          onOpenChange={(open) => {
            if (!open) hideShown()
          }}
        >
          <PopoverContent
            ref={popup}
            // A toolbar by the selection, on a phone too: not a sheet over it.
            sheet={false}
            anchor={{
              getBoundingClientRect: () =>
                selection.range.getBoundingClientRect(),
              ...(region ? { contextElement: region } : {}),
            }}
            side={state.coarse ? "bottom" : "top"}
            initialFocus={false}
            finalFocus={false}
            className={selectionToolbar}
            aria-label={allLabels.toolbar}
            // Keeps the selection: a press on it does not move it.
            onMouseDown={(event) => {
              if (!touch) event.preventDefault()
            }}
            onPointerDown={(event) => {
              if (event.pointerType !== "touch") event.preventDefault()
            }}
          >
            <Context.Provider
              value={{
                selection,
                done: () => {
                  document.getSelection()?.removeAllRanges()
                  hideShown()
                },
              }}
            >
              <Toolbar.Root
                aria-label={allLabels.toolbar}
                className="flex items-center gap-0.5"
              >
                {maxLength !== undefined &&
                selection.text.length > maxLength ? (
                  <span
                    role="status"
                    className="px-2 text-xs text-muted-foreground"
                  >
                    {allLabels.tooLong}
                  </span>
                ) : (
                  actions
                )}
              </Toolbar.Root>
            </Context.Provider>
          </PopoverContent>
        </Popover>
      ) : null}
    </>
  )
}

/** A button of the toolbar, handed the selection; the selection then clears. */
function SelectionAction({
  onAction,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  onAction: (selection: SelectionActionsSelection) => void
}) {
  const context = React.useContext(Context)
  if (!context)
    throw new Error("SelectionAction must be inside SelectionActions")
  return (
    <Toolbar.Button
      render={<Button variant="ghost" size="sm" />}
      {...props}
      type="button"
      onClick={() => {
        onAction(context.selection)
        context.done()
      }}
    />
  )
}

/** The standard action: Quote, e.g. into the composer as a quote chip. */
function SelectionQuote({
  onQuote,
  labels,
  ...props
}: Omit<
  React.ComponentProps<typeof SelectionAction>,
  "onAction" | "children"
> & {
  onQuote: (selection: SelectionActionsSelection) => void
  labels?: Partial<SelectionQuoteLabels>
}) {
  return (
    <SelectionAction {...props} onAction={onQuote}>
      <HugeiconsIcon icon={QuoteDownIcon} strokeWidth={2} />
      {{ ...defaultQuoteLabels, ...labels }.quote}
    </SelectionAction>
  )
}

export {
  SelectionActions,
  SelectionAction,
  SelectionQuote,
  selectionMarkdown,
  type SelectionActionsLabels,
  type SelectionQuoteLabels,
  type SelectionActionsSelection,
}
