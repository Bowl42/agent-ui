"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { Folder01Icon, FolderAddIcon } from "@hugeicons/core-free-icons"

import {
  FilesViewer,
  type FilesViewerLabels,
  type ViewerFile,
} from "@/components/files-viewer"
import {
  ViewerPath,
  ViewerStatusButton,
  type ViewerLabels,
  type ViewerPathSegment,
} from "@/components/viewer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { composerSelectRow } from "@/components/composer-select"
import { useIsMobile } from "@/hooks/use-mobile"

/** A starting point of the app's: Home, Recent, a machine's disk. */
type FolderPickerPlace = { id: string; name: string; icon?: React.ReactNode }
type FolderPickerLabels = {
  /** The dialog's title, and the panel's name. */
  title: string
  choose: string
  cancel: string
  newFolder: string
  folderName: string
  /** The path field's name. */
  path: string
  /** In the path field while it is empty, e.g. in a place with no path. */
  pathPlaceholder: string
  places: string
  loading: string
  empty: string
  /** A folder not made, where the app gave no reason. */
  createFailed: string
  /** Said when the folder to choose changes. */
  picked: (path: string) => string
}
const defaultLabels: FolderPickerLabels = {
  title: "Choose a folder",
  choose: "Choose",
  cancel: "Cancel",
  newFolder: "New folder",
  folderName: "Folder name",
  path: "Path",
  pathPlaceholder: "Type a path",
  places: "Places",
  loading: "Loading…",
  empty: "No folders",
  createFailed: "Could not create the folder",
  picked: (path) => `Picked ${path}`,
}
type PickerView = "columns" | "list"
type FolderPickerPanelProps = {
  /** The folder shown, its tree in `children` (undefined while loading). */
  folder: ViewerFile
  /** The folder picked in it, by id; `null`: none, `folder` is chosen. */
  selected: string | null
  onSelect: (folder: ViewerFile) => void
  /** The folders open in the list: the panel's own, or the app's. */
  expanded?: ReadonlySet<string> | undefined
  defaultExpanded?: Iterable<string> | undefined
  onExpandedChange?:
    ((expanded: ReadonlySet<string>, folder: ViewerFile) => void) | undefined
  /**
   * The columns' widths the reader set, by depth, in CSS pixels
   * (FilesViewer's): the panel's own, or the app's, e.g. to keep. A phone
   * has the list, no columns.
   */
  columnWidths?: Readonly<Record<number, number>> | undefined
  defaultColumnWidths?: Readonly<Record<number, number>> | undefined
  onColumnWidthsChange?:
    ((widths: Readonly<Record<number, number>>) => void) | undefined
  /**
   * A folder without `children` is shown, or about to be (the pointer
   * rests on it, or the keys pick it): the app loads it into the tree.
   * Once `signal` aborts it is no longer wanted: the app stops and keeps
   * the result out. A promise returned says when the load is over; until
   * then, or until its `children` come, it is not asked for again.
   */
  onLoad?:
    | ((
        folder: ViewerFile,
        options: { signal: AbortSignal }
      ) => Promise<void> | void)
    | undefined
  /** Files left out, or shown dimmed for context, not choosable. */
  files?: "hidden" | "dimmed" | undefined
  /** Columns and a list; a phone has the list. */
  views?: readonly PickerView[] | undefined
  defaultView?: PickerView | undefined
  view?: PickerView | undefined
  onViewChange?: ((view: PickerView) => void) | undefined
  /**
   * On a phone, the breadcrumb's folders before `folder`'s. (On a larger
   * screen the path field is where the picker is: no breadcrumb.)
   */
  path?: readonly ViewerPathSegment[] | undefined
  /** A folder's path in the path field; its id by default. */
  pathOf?: ((folder: ViewerFile) => string) | undefined
  /**
   * Called on Enter and when the typed folder part changes: the app
   * goes there (`folder`, `selected`, `expanded`).
   */
  onNavigate?: ((path: string) => void) | undefined
  /** The app's starting points: beside the browser, or a select on a phone. */
  places?: readonly FolderPickerPlace[] | undefined
  place?: string | null | undefined
  onPlaceChange?: ((id: string) => void) | undefined
  /** "New folder": makes `name` in `parent`; a rejection's message is shown with the name. */
  onCreateFolder?:
    ((parent: ViewerFile, name: string) => Promise<void> | void) | undefined
  /** The app's note on the folder to choose, e.g. "Not a git repository". */
  status?: React.ReactNode
  /** The picked folder, or `folder` when none is picked. */
  onChoose: (folder: ViewerFile) => void
  /** Whether it can be chosen; Choose is disabled when not. */
  canChoose?: ((folder: ViewerFile) => boolean) | undefined
  /** A Cancel button before Choose. */
  onCancel?: (() => void) | undefined
  /**
   * The path field focused as it is shown, as in `FolderPicker`'s dialog:
   * e.g. a panel that is a page's or a step's whole content.
   */
  autoFocus?: boolean | undefined
  /** The element the buttons go in, e.g. a `DialogFooter`; a row by default. */
  footer?: React.ReactElement<{ children?: React.ReactNode }> | undefined
  labels?: Partial<FolderPickerLabels> | undefined
  /** The browser's words: `FilesViewer`'s and its frame's. */
  viewerLabels?: Partial<FilesViewerLabels & ViewerLabels> | undefined
  className?: string | undefined
}
const defaultViews: readonly PickerView[] = ["columns", "list"]
const intentDelay = 150
const folderPath = (folder: ViewerFile) => folder.id

// Each level's entries kept by the level they come from: opened again,
// or a folder loaded into a tree of 100,000 (its new levels on the way to
// it alone), the rest are not made again, and stay the same arrays for
// what is kept by them (the viewer's index of the files).
const entriesOf = {
  hidden: new WeakMap<readonly ViewerFile[], ViewerFile[]>(),
  dimmed: new WeakMap<readonly ViewerFile[], ViewerFile[]>(),
}

function folderEntries(
  entries: readonly ViewerFile[],
  mode: "hidden" | "dimmed"
): ViewerFile[] {
  const kept = entriesOf[mode].get(entries)
  if (kept) return kept
  const made = entries
    .filter((entry) => mode === "dimmed" || entry.directory)
    .map((entry) => ({
      ...entry,
      disabled: entry.disabled || !entry.directory,
      children:
        entry.children === undefined
          ? undefined
          : folderEntries(entry.children, mode),
    }))
  entriesOf[mode].set(entries, made)
  return made
}
/** The folders from the top of `folder` to `id`'s, it last; none if not in it. */
function pathTo(
  folder: ViewerFile,
  id: string | null
): ViewerFile[] | undefined {
  if (id === null) return undefined
  for (const child of folder.children ?? []) {
    if (!child.directory) continue
    if (child.id === id) return [child]
    const path = pathTo(child, id)
    if (path) return [child, ...path]
  }
  return undefined
}
function findFolder(
  folder: ViewerFile,
  id: string | null
): ViewerFile | undefined {
  return id !== null && id === folder.id && folder.directory
    ? folder
    : pathTo(folder, id)?.at(-1)
}

/**
 * A folder to choose, in a page: a `FilesViewer` of the app's folders
 * (columns or a list), a path steering it with inline completion, the
 * app's places, a new folder made in place, the app's note on the picked
 * one, and Choose. Enter and
 * a double click go into a folder; Ctrl or Cmd with Enter chooses.
 */
function FolderPickerPanel({
  folder,
  selected,
  onSelect,
  expanded,
  defaultExpanded,
  columnWidths,
  defaultColumnWidths,
  onColumnWidthsChange,
  onExpandedChange,
  onLoad,
  files = "hidden",
  views = defaultViews,
  defaultView = "columns",
  view,
  onViewChange,
  path,
  pathOf = folderPath,
  onNavigate,
  places,
  place,
  onPlaceChange,
  onCreateFolder,
  status,
  onChoose,
  canChoose,
  onCancel,
  autoFocus = false,
  footer,
  labels: labelsProp,
  viewerLabels,
  className,
}: FolderPickerPanelProps) {
  const labels = { ...defaultLabels, ...labelsProp }
  const mobile = useIsMobile()
  // The folders on the way to the picked one, it last.
  const chain = React.useMemo(
    () => pathTo(folder, selected) ?? [],
    [folder, selected]
  )
  const target = chain.at(-1) ?? findFolder(folder, selected) ?? folder
  const children = (mobile ? target : folder).children
  const entries = React.useMemo(
    () => folderEntries(children ?? [], files),
    [children, files]
  )
  const [highlight, setHighlight] = React.useState<{
    target: string
    id: string | null
  }>({ target: target.id, id: null })
  if (highlight.target !== target.id)
    setHighlight({ target: target.id, id: null })
  const goIn = (entry: ViewerFile) => {
    if (!entry.directory || entry.disabled) return
    setHighlight({ target: entry.id, id: null })
    onSelect(findFolder(folder, entry.id) ?? entry)
  }
  const goUp = () => {
    if (target.id === folder.id) return
    const parent = chain.at(-2) ?? folder
    setHighlight({ target: parent.id, id: target.id })
    onSelect(parent)
  }
  const [ownExpanded, setOwnExpanded] = React.useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded)
  )
  const [ownView, setOwnView] = React.useState(defaultView)
  const activeView = mobile ? "list" : (view ?? ownView)
  const [intent, setIntent] = React.useState<string | null>(null)
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  // The loads under way, by folder: one each, aborted once not wanted.
  const loads = React.useRef(new Map<string, AbortController>())
  // The app's latest, so a new function each render starts nothing again.
  const load = React.useRef(onLoad)
  React.useLayoutEffect(() => {
    load.current = onLoad
  })
  // The folders whose files are shown: the columns on the way to the
  // picked one, or the list's open folders whose folders are open too.
  const opened = expanded ?? ownExpanded
  const shown = React.useMemo(() => {
    const shown = new Map<string, ViewerFile>()
    if (mobile || activeView === "columns")
      for (const entry of chain) shown.set(entry.id, entry)
    else {
      const walk = (entries: readonly ViewerFile[]) => {
        for (const entry of entries)
          if (entry.directory && opened.has(entry.id)) {
            shown.set(entry.id, entry)
            walk(entry.children ?? [])
          }
      }
      walk(folder.children ?? [])
    }
    if (mobile) shown.set(target.id, target)
    return shown
  }, [mobile, target, activeView, chain, opened, folder.children])
  // Wanted ahead of being shown: one at a time, the newest.
  const intended = React.useMemo(
    () => findFolder(folder, intent),
    [folder, intent]
  )
  if (
    intent !== null &&
    (!intended || intended.children !== undefined || shown.has(intent))
  )
    setIntent(null)
  React.useEffect(() => {
    const prefetch =
      intended && intended.children === undefined && !shown.has(intended.id)
        ? intended
        : undefined
    // A folder under way already is not asked for again: a prefetch
    // becoming shown goes on.
    const start = (entry: ViewerFile) => {
      const ask = load.current
      if (
        entry.disabled ||
        entry.children !== undefined ||
        !ask ||
        loads.current.has(entry.id)
      )
        return
      const controller = new AbortController()
      loads.current.set(entry.id, controller)
      const finish = () => {
        if (loads.current.get(entry.id) === controller)
          loads.current.delete(entry.id)
      }
      try {
        const result = ask(entry, { signal: controller.signal })
        if (result) void Promise.resolve(result).then(finish, finish)
      } catch {
        finish()
      }
    }
    for (const entry of shown.values()) start(entry)
    if (prefetch) start(prefetch)
    // Done once its files came; aborted once neither shown nor intended.
    for (const [id, controller] of loads.current) {
      const entry =
        shown.get(id) ?? (id === intended?.id ? intended : undefined)
      if (entry && entry.children === undefined) continue
      if (!entry) controller.abort()
      loads.current.delete(id)
    }
  }, [shown, intended])
  React.useEffect(() => {
    const current = loads.current
    return () => {
      clearTimeout(hoverTimer.current)
      for (const controller of current.values()) controller.abort()
      current.clear()
    }
  }, [])
  const targetPath = pathOf(target)
  const [pathState, setPathState] = React.useState({
    target: target.id,
    path: targetPath,
    text: targetPath,
    steering: false,
    suppressed: false,
    choice: 0,
  })
  // Picking a match must not replace the text being edited.
  if (
    !pathState.steering &&
    (pathState.target !== target.id || pathState.path !== targetPath)
  )
    setPathState({
      ...pathState,
      target: target.id,
      path: targetPath,
      text: targetPath,
    })
  // An Enter the app does not resolve keeps its text.
  const typed =
    pathState.steering ||
    (pathState.target === target.id && pathState.path === targetPath)
      ? pathState.text
      : targetPath
  const slash = typed.lastIndexOf("/")
  const directory = (text: string) => {
    const slash = text.lastIndexOf("/")
    return slash < 0 ? null : slash === 0 ? "/" : text.slice(0, slash)
  }
  const dir = directory(typed)
  const segment = typed.slice(slash + 1)
  // Only the root and the app-resolved chain are candidates, never the whole tree.
  const base = [folder, ...chain].findLast((entry) => pathOf(entry) === dir)
  const candidates = React.useMemo(() => {
    const collator = new Intl.Collator(undefined, { numeric: true })
    return (base?.children ?? [])
      .filter((entry) => entry.directory && !entry.disabled)
      .sort((a, b) => collator.compare(a.name, b.name))
  }, [base?.children])
  const matches = React.useMemo(() => {
    if (!segment) return []
    const prefix = segment.normalize("NFKC").toLowerCase()
    return candidates.filter((entry) =>
      entry.name.normalize("NFKC").toLowerCase().startsWith(prefix)
    )
  }, [candidates, segment])
  const match = matches[pathState.choice % matches.length]
  const tail =
    pathState.steering && !pathState.suppressed && match
      ? match.name.slice(segment.length)
      : ""
  const value = typed + tail
  const pathInput = React.useRef<HTMLInputElement>(null)
  React.useLayoutEffect(() => {
    const input = pathInput.current
    if (tail && input === document.activeElement)
      input?.setSelectionRange(typed.length, value.length)
  }, [typed, tail, value])
  React.useEffect(() => {
    const next = mobile ? base : (match ?? base)
    if (pathState.steering && next && next.id !== selected) onSelect(next)
  }, [mobile, pathState.steering, match, base, selected, onSelect])
  const editPath = (text: string, suppressed = false) => {
    setPathState({
      target: target.id,
      path: targetPath,
      text,
      steering: true,
      suppressed,
      choice: 0,
    })
    const nextDir = directory(text)
    if (nextDir !== null && nextDir !== dir) onNavigate?.(nextDir)
  }
  const restorePath = () =>
    setPathState({
      target: target.id,
      path: targetPath,
      text: targetPath,
      steering: false,
      suppressed: false,
      choice: 0,
    })
  const [announcement, setAnnouncement] = React.useState({
    target: target.id,
    text: "",
  })
  if (announcement.target !== target.id)
    setAnnouncement({ target: target.id, text: labels.picked(targetPath) })
  const [creating, setCreating] = React.useState<ViewerFile | null>(null)
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const createButton = React.useRef<HTMLButtonElement>(null)
  const nameInput = React.useRef<HTMLInputElement>(null)
  const pathId = React.useId()
  const nameId = React.useId()
  const errorId = React.useId()
  // While a name is typed, the folder it names (the one completed, as on
  // a larger screen, where it is shown): not the one its list is of, on a
  // phone; none where no folder there has that name.
  const picked = pathState.steering && segment !== "" ? (match ?? null) : target
  const enabled = picked !== null && canChoose?.(picked) !== false
  const closeCreate = () => {
    setCreating(null)
    createButton.current?.focus()
  }
  async function create() {
    if (!creating || !onCreateFolder || !name.trim() || pending) return
    setPending(true)
    try {
      await onCreateFolder(creating, name.trim())
      closeCreate()
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : labels.createFailed
      )
      nameInput.current?.focus()
    } finally {
      setPending(false)
    }
  }
  // On a phone, places sit beside the editable path.
  const placeSelect = mobile && !!places?.length && (
    <Select
      items={places.map((item) => ({ value: item.id, label: item.name }))}
      value={place ?? null}
      onValueChange={(id) => {
        if (typeof id === "string") onPlaceChange?.(id)
      }}
    >
      <SelectTrigger size="sm" aria-label={labels.places}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {places.map((item) => (
          <SelectItem
            key={item.id}
            value={item.id}
            // The place chosen again: back to its root, as its crumb would.
            onClick={() => {
              if (item.id === place) onSelect(folder)
            }}
          >
            {item.icon}
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  // On a phone, the folders above the one shown, each going there.
  const crumbs = [
    ...(path ?? []),
    ...[folder, ...chain.slice(0, -1)]
      .filter((entry) => entry.id !== target.id)
      .map((entry) => ({
        label: entry.name,
        onSelect: () => onSelect(entry),
      })),
  ]
  const pathField = (
    <Input
      // In the browser's toolbar on a larger screen, as its filter is.
      className={mobile ? undefined : "me-1 h-7 min-w-0 flex-1"}
      data-folder-picker-path=""
      ref={pathInput}
      autoFocus={autoFocus}
      id={pathId}
      aria-label={labels.path}
      placeholder={labels.pathPlaceholder}
      aria-autocomplete="inline"
      value={value}
      spellCheck={false}
      autoComplete="off"
      // Left with a name typed, the folder it names (on a phone, its list
      // was the folder before): what the field said is what is chosen.
      onBlur={() => {
        if (pathState.steering && segment && match && match.id !== selected)
          onSelect(match)
        restorePath()
      }}
      // Deleting the selected tail leaves the typed prefix without completing again.
      onChange={(event) =>
        editPath(
          event.target.value,
          (event.nativeEvent as InputEvent).inputType?.startsWith("delete") ??
            false
        )
      }
      onKeyDown={(event) => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
          return
        const input = event.currentTarget
        if (
          match &&
          (event.key === "Tab" ||
            (tail &&
              input.selectionStart === typed.length &&
              (event.key === "End" || event.key === "ArrowRight")))
        ) {
          event.preventDefault()
          editPath(typed.slice(0, slash + 1) + match.name + "/")
        } else if (
          matches.length &&
          (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
          event.preventDefault()
          setPathState((state) => ({
            ...state,
            steering: true,
            suppressed: false,
            choice:
              (state.choice +
                (event.key === "ArrowDown" ? 1 : -1) +
                matches.length) %
              matches.length,
          }))
        } else if (
          tail &&
          (event.key === "ArrowLeft" || event.key === "Home")
        ) {
          // Keep the completed name while the native key moves the caret.
          setPathState((state) => ({ ...state, text: value, choice: 0 }))
        } else if (event.key === "Enter") {
          event.preventDefault()
          const path = value.trim().replace(/(?<!^)\/$/, "")
          setPathState({
            target: target.id,
            path: targetPath,
            text: path,
            steering: false,
            suppressed: false,
            choice: 0,
          })
          onNavigate?.(path)
        } else if (event.key === "Escape") {
          if (tail) {
            event.preventDefault()
            event.stopPropagation()
            setPathState((state) => ({ ...state, suppressed: true }))
          } else if (typed !== targetPath) {
            event.preventDefault()
            event.stopPropagation()
            restorePath()
          }
        }
      }}
    />
  )
  const actions = (
    <>
      {onCancel && (
        <Button variant="outline" onClick={onCancel}>
          {labels.cancel}
        </Button>
      )}
      <Button
        disabled={!enabled}
        aria-describedby={pathId}
        onClick={() => picked && onChoose(picked)}
      >
        {labels.choose}
      </Button>
    </>
  )
  return (
    <div
      data-slot="folder-picker"
      role="group"
      aria-label={labels.title}
      className={cn("flex min-h-0 flex-col gap-3", className)}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          (event.metaKey || event.ctrlKey) &&
          enabled
        ) {
          event.preventDefault()
          if (picked) onChoose(picked)
        }
      }}
    >
      {mobile && pathField}
      <div className="flex min-h-0 flex-1 gap-3">
        {!mobile && !!places?.length && (
          // As ModelPicker's rail of groups has its rows.
          <nav aria-label={labels.places} className="w-40 shrink-0">
            <ul className="flex flex-col gap-px">
              {places.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      composerSelectRow,
                      "text-muted-foreground aria-current:bg-muted aria-current:font-medium aria-current:text-foreground"
                    )}
                    aria-current={place === item.id ? "true" : undefined}
                    onClick={() => onPlaceChange?.(item.id)}
                  >
                    {item.icon}
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {!mobile && folder.children === undefined ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {pathField}
            <div
              role="status"
              className="flex min-h-0 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Spinner aria-hidden="true" />
              {labels.loading}
            </div>
          </div>
        ) : (
          <FilesViewer
            // The level being picked in: the one typed into, or the
            // picked folder's own; on a phone, the folder shown.
            count={
              mobile
                ? "level"
                : {
                    folder:
                      pathState.steering && base
                        ? base === folder
                          ? null
                          : base.id
                        : (chain.at(-2)?.id ?? null),
                  }
            }
            header={!mobile}
            filter={false}
            levelFilter={
              pathState.steering && base && segment !== ""
                ? mobile
                  ? base === target
                    ? { folder: null, prefix: segment }
                    : undefined
                  : {
                      folder: base === folder ? null : base.id,
                      prefix: segment,
                    }
                : undefined
            }
            name={mobile ? target.name : folder.name}
            path={mobile ? crumbs : undefined}
            // A larger screen: the path field in the toolbar says where it
            // is, the columns show the way. A phone: the breadcrumb, after
            // the places select if any, which stands for the place's root.
            start={
              !mobile
                ? pathField
                : placeSelect && (
                    <div className="flex min-w-0 flex-1 items-center">
                      {placeSelect}
                      {target !== folder && (
                        <>
                          <span
                            aria-hidden="true"
                            className="ps-1 text-2sm text-subtle-foreground opacity-60"
                          >
                            /
                          </span>
                          <ViewerPath
                            path={crumbs.slice((path?.length ?? 0) + 1)}
                            name={target.name}
                            icon={
                              <HugeiconsIcon
                                icon={Folder01Icon}
                                strokeWidth={2}
                              />
                            }
                            label={`${viewerLabels?.path ?? labels.path}, ${target.name}`}
                            {...(viewerLabels?.pathAbove
                              ? { aboveLabel: viewerLabels.pathAbove }
                              : {})}
                          />
                        </>
                      )}
                    </div>
                  )
            }
            tree={!mobile}
            openOn={mobile ? "click" : "double-click"}
            onOpen={mobile ? goIn : undefined}
            onUp={mobile ? goUp : undefined}
            loading={mobile && target.children === undefined}
            files={entries}
            selected={
              mobile
                ? pathState.steering && base === target
                  ? (match?.id ?? null)
                  : highlight.target === target.id
                    ? highlight.id
                    : null
                : selected
            }
            onSelect={(entry) => {
              if (mobile) {
                if (entry.directory && !entry.disabled)
                  setHighlight({ target: target.id, id: entry.id })
                return
              }
              if (entry.directory && !entry.disabled) {
                if (
                  activeView === "list" &&
                  entry.children === undefined &&
                  !shown.has(entry.id)
                )
                  setIntent(entry.id)
                onSelect(findFolder(folder, entry.id) ?? entry)
              }
            }}
            fileProps={(entry) => ({
              onPointerEnter: (event) => {
                clearTimeout(hoverTimer.current)
                if (
                  (event.pointerType === "mouse" ||
                    event.pointerType === "pen") &&
                  entry.directory &&
                  !entry.disabled &&
                  entry.children === undefined
                )
                  hoverTimer.current = setTimeout(
                    () => setIntent(entry.id),
                    intentDelay
                  )
              },
              onPointerLeave: () => clearTimeout(hoverTimer.current),
            })}
            expanded={expanded}
            defaultExpanded={defaultExpanded}
            columnWidths={columnWidths}
            defaultColumnWidths={defaultColumnWidths}
            onColumnWidthsChange={onColumnWidthsChange}
            onExpandedChange={(next, entry) => {
              const original = findFolder(folder, entry.id) ?? entry
              onExpandedChange?.(next, original)
              setOwnExpanded(next)
            }}
            folderAction={mobile ? "open" : "expand"}
            defaultSort={{ by: "name", descending: false }}
            view={mobile ? "list" : view}
            views={mobile ? ["list"] : views}
            defaultView={defaultView}
            onViewChange={(next) => {
              if (next === "list" || next === "columns") {
                setOwnView(next)
                onViewChange?.(next)
              }
            }}
            labels={{
              ...viewerLabels,
              loading: labels.loading,
              empty: labels.empty,
            }}
            className="min-h-0 flex-1"
            controls={
              onCreateFolder && (
                <ViewerStatusButton
                  ref={createButton}
                  onClick={() => {
                    setCreating(target)
                    setName("")
                    setError(null)
                  }}
                >
                  <HugeiconsIcon icon={FolderAddIcon} strokeWidth={2} />
                  {labels.newFolder}
                </ViewerStatusButton>
              )
            }
          />
        )}
      </div>
      {creating && (
        <Field aria-busy={pending || undefined}>
          <FieldLabel htmlFor={nameId}>{labels.folderName}</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              ref={nameInput}
              id={nameId}
              autoFocus
              value={name}
              readOnly={pending}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  event.stopPropagation()
                  closeCreate()
                }
                if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
                  event.preventDefault()
                  void create()
                }
              }}
            />
            {pending && <Spinner aria-label={labels.loading} />}
          </div>
          {error && <FieldError id={errorId}>{error}</FieldError>}
        </Field>
      )}
      {status && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {status}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement.text}
      </span>
      {footer ? (
        React.cloneElement(footer, { children: actions })
      ) : (
        <div
          data-slot="folder-picker-actions"
          className="flex justify-end gap-2"
        >
          {actions}
        </div>
      )}
    </div>
  )
}

/** `FolderPickerPanel` in a dialog: the whole screen on a phone. */
function FolderPicker({
  open,
  onOpenChange,
  title,
  description,
  ...props
}: Omit<FolderPickerPanelProps, "footer" | "onCancel"> & {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
}) {
  const popup = React.useRef<HTMLDivElement>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={popup}
        // The path field first, though the places come before it.
        initialFocus={() =>
          popup.current?.querySelector<HTMLElement>(
            "[data-folder-picker-path]"
          ) ?? true
        }
        showCloseButton={false}
        size="wide"
      >
        <DialogHeader>
          <DialogTitle>
            {title ?? props.labels?.title ?? defaultLabels.title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <FolderPickerPanel
          {...props}
          className={cn("flex-1", props.className)}
          onCancel={() => onOpenChange(false)}
          // On a phone, clear of the screen's foot: the dialog's padding
          // there is the home indicator's.
          footer={<DialogFooter className="max-sm:pb-4" />}
        />
      </DialogContent>
    </Dialog>
  )
}

export {
  FolderPicker,
  FolderPickerPanel,
  type FolderPickerLabels,
  type FolderPickerPlace,
}
