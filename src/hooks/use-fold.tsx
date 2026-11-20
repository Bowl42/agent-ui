import * as React from "react"
import { flushSync } from "react-dom"

type Listener = () => void

type FoldStore = {
  get: (key: string) => boolean | undefined
  set: (key: string, open: boolean) => void
  subscribe: (key: string, listener: Listener) => () => void
}

function createFoldStore(
  initial: Record<string, boolean> | undefined,
  onChange: (choices: Record<string, boolean>) => void
): FoldStore {
  const choices = new Map(Object.entries(initial ?? {}))
  const listeners = new Map<string, Set<Listener>>()
  return {
    get: (key) => choices.get(key),
    set: (key, open) => {
      if (choices.get(key) === open) return
      choices.set(key, open)
      for (const listener of listeners.get(key) ?? []) listener()
      onChange(Object.fromEntries(choices))
    },
    subscribe: (key, listener) => {
      let keyed = listeners.get(key)
      if (!keyed) listeners.set(key, (keyed = new Set()))
      keyed.add(listener)
      return () => {
        keyed.delete(listener)
        if (keyed.size === 0) listeners.delete(key)
      }
    },
  }
}

const FoldContext = React.createContext<FoldStore | null>(null)

/**
 * Remembers what the reader opened and closed, by key, for the `useFold`
 * calls inside it: a part of a conversation that unmounts (scrolled out of
 * a window of messages) and mounts again is as the reader left it.
 * `defaultValue` and `onValueChange` let the app keep the choices, e.g. in
 * session storage.
 */
function FoldProvider({
  defaultValue,
  onValueChange,
  children,
}: {
  defaultValue?: Record<string, boolean>
  onValueChange?: (choices: Record<string, boolean>) => void
  children?: React.ReactNode
}) {
  const changed = React.useEffectEvent((choices: Record<string, boolean>) =>
    onValueChange?.(choices)
  )
  const [store] = React.useState(() =>
    createFoldStore(defaultValue, (choices) => changed(choices))
  )
  return <FoldContext value={store}>{children}</FoldContext>
}

const noSubscription = () => () => {}

/**
 * Whether a part is open: the reader's choice once they have made one,
 * otherwise `open`, what the app's rules say for the part as it is now
 * (e.g. open while a tool runs, closed once it is done). The rules change
 * nothing the reader chose.
 */
function useFold(key: string, open: boolean) {
  const store = React.useContext(FoldContext)
  // Without a provider the choice lasts as long as the component.
  const [local, setLocal] = React.useState<boolean>()
  const subscribe = React.useCallback(
    (listener: Listener) =>
      store ? store.subscribe(key, listener) : noSubscription(),
    [store, key]
  )
  const read = () => store?.get(key)
  const chosen = React.useSyncExternalStore(subscribe, read, read)
  const choice = store ? chosen : local
  const setOpen = React.useCallback(
    (next: boolean) => (store ? store.set(key, next) : setLocal(next)),
    [store, key]
  )
  return [choice ?? open, setOpen] as const
}

/**
 * Opens or closes a part by its key, as the reader would: e.g. the folds
 * a search's match is in, so it shows. Needs a `FoldProvider`; without
 * one, there is nothing to set.
 */
function useSetFold() {
  const store = React.useContext(FoldContext)
  return React.useCallback(
    (key: string, open: boolean) => store?.set(key, open),
    [store]
  )
}

const FoldFindableContext = React.createContext(false)

/**
 * While true (a find over the conversation is open), closed folds keep
 * their content in the page, hidden until found (`hidden="until-found"`),
 * so the find reaches it and opens the fold with `beforematch`.
 */
function FoldFindable({
  value,
  children,
}: {
  value: boolean
  children?: React.ReactNode
}) {
  return <FoldFindableContext value={value}>{children}</FoldFindableContext>
}

function useFoldFindable(): boolean {
  return React.useContext(FoldFindableContext)
}

/**
 * What a closed fold holds, as plain text, while a find is open
 * (`FoldFindable`): hidden until found, so the find reaches it, and its
 * `beforematch` calls `onFound`, which opens the fold, whose content then
 * takes its place. One text, not the fold's content mounted: a find over
 * a long conversation costs its words, not its thousands of closed
 * parts. `text` is read only then. Put it where the fold's content goes,
 * rendered while the fold is closed.
 */
function FoldFindText({
  text,
  onFound,
}: {
  text: () => string
  onFound: () => void
}) {
  const findable = useFoldFindable()
  const found = React.useRef(onFound)
  React.useLayoutEffect(() => {
    found.current = onFound
  })
  const ref = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    // beforematch bubbles from the hidden text to here.
    const reveal = () => flushSync(() => found.current())
    node.addEventListener("beforematch", reveal)
    return () => node.removeEventListener("beforematch", reveal)
  }, [])
  const value = findable ? text() : ""
  if (!value) return null
  return (
    <div
      ref={ref}
      data-slot="fold-find-text"
      // React sets `hidden` only as true or false; set by a ref, it was a
      // write between the layout reads of the commit's other components
      // (a Clamp's each), and opening a find over 200 turns forced a
      // layout for each (`pnpm perf`). In the markup, it is there as the
      // text is made.
      dangerouslySetInnerHTML={{
        __html: `<div hidden="until-found" class="whitespace-pre-wrap">${escapeHtml(value)}</div>`,
      }}
    />
  )
}

const escapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
}

/** Text as HTML's, to put in markup. */
function escapeHtml(text: string) {
  return text.replace(/[&<>]/g, (character) => escapes[character]!)
}

export {
  FoldProvider,
  useFold,
  useSetFold,
  FoldFindable,
  FoldFindText,
  useFoldFindable,
}
