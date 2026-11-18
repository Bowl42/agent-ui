"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Csv01Icon,
  File01Icon,
  FileScriptIcon,
  FileZipIcon,
  Folder01Icon,
  FolderOpenIcon,
  GalleryThumbnailsIcon,
  GridViewIcon,
  Image01Icon,
  LayoutThreeColumnIcon,
  ListViewIcon,
  MusicNote01Icon,
  Pdf01Icon,
  Search01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons"

import { SearchHighlight } from "@/components/search-highlight"
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { VirtualGrid } from "@/components/virtual-grid"
import { VirtualList, type VirtualListActions } from "@/components/virtual-list"
import {
  ViewerFilter,
  ViewerFrame,
  ViewerTool,
  type ViewerFrameProps,
  type ViewerLabels,
} from "@/components/viewer"

/** A file or a folder, as the app has it. */
type ViewerFile = {
  /** The app's: e.g. its path. Given back when it is picked or opened. */
  id: string
  name: string
  directory?: boolean | undefined
  /** A folder's files and folders; not yet loaded while undefined. */
  children?: readonly ViewerFile[] | undefined
  /** Its small icon; by default a file's or a folder's. */
  icon?: React.ReactNode
  /** Its picture in the grid and the gallery, e.g. an image's own; by default its icon. */
  thumbnail?: React.ReactNode
  /** On its thumbnail, e.g. a video's length. */
  badge?: React.ReactNode
  /** Under its name in the grid and the gallery: "1600 × 1067", "12 pages". */
  caption?: React.ReactNode
  /**
   * After its name in a row, lighter: "Draft", "from the agent"; where the
   * row is too narrow for both, it is cut first, then gone.
   */
  description?: React.ReactNode
  /** When it last changed, in milliseconds since 1970. */
  modified?: number | undefined
  /** Its size in bytes. */
  size?: number | undefined
  /** A short status after its name, e.g. "M" or "A" for changed or added. */
  status?: string | undefined
  /** The lines a change adds and removes, after its status: "+4 −2". */
  added?: number | undefined
  removed?: number | undefined
  /** Dimmed: e.g. ignored by version control. */
  dimmed?: boolean | undefined
  /** Shown, not pickable: e.g. a file where only folders can be chosen. */
  disabled?: boolean | undefined
}

/** Files under a heading, as the app groups them: by kind, by date. */
type FilesGroup = {
  key: string
  label: string
  files: readonly ViewerFile[]
}

type SortBy = "name" | "modified" | "size"
type FilesSort = { by: SortBy; descending: boolean }
type FilesView = "list" | "grid" | "columns" | "gallery"
/** What Enter or a double click on a folder does: expand it in place, or open it. */
type FolderAction = "expand" | "open"
/** Who matches the filter: the viewer, by the loaded files' names, or the app. */
type FilesFiltering = "local" | "manual"

type FilesViewerLabels = {
  name: string
  modified: string
  size: string
  list: string
  grid: string
  columns: string
  gallery: string
  filter: string
  sortBy: string
  /** The sort menu's item for the app's own order. */
  unsorted: string
  loading: string
  empty: string
  noMatches: string
  /** The app's search under way, in the status bar and an empty view. */
  searching: string
  open: string
  searchIn: (folder: string) => string
  searchHints: string
  resultsOf: (shown: number, total: number) => string
  /** In the filter, once the app's search is back: "6 results". */
  results: (count: number) => string
  /** The columns' buttons to the folders they have no room for. */
  backTo: (folder: string) => string
  forwardTo: (folder: string) => string
  /** A column's border, to drag: its accessible name. */
  resizeColumn: (folder: string) => string
  /** The facts: "14 items", "3 changed". */
  items: (count: number) => string
  changed: (count: number) => string
  /** A status's meaning, for a screen reader: "M" → "modified". */
  status: (status: string) => string
  /** When it changed, short: "now", "5h", "2d". */
  time: (modified: number, now: number) => string
  bytes: (size: number) => string
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = size / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 100 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

function formatAge(modified: number, now: number) {
  const seconds = Math.max(0, (now - modified) / 1000)
  if (seconds < 60) return "now"
  const minutes = seconds / 60
  if (minutes < 60) return `${Math.floor(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) return `${Math.floor(hours)}h`
  const days = hours / 24
  if (days < 7) return `${Math.floor(days)}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}

const defaultLabels: FilesViewerLabels = {
  name: "Name",
  modified: "Modified",
  size: "Size",
  list: "List",
  grid: "Grid",
  columns: "Columns",
  gallery: "Gallery",
  filter: "Filter",
  sortBy: "Sort by",
  unsorted: "None",
  loading: "Loading…",
  empty: "Empty folder",
  noMatches: "No matches",
  searching: "Searching…",
  open: "Open",
  searchIn: (folder) => `In ${folder}`,
  searchHints: "↑↓ move · ↵ open · Esc clear",
  resultsOf: (shown, total) => `${shown} of ${total} items`,
  results: (count) => `${count} ${count === 1 ? "result" : "results"}`,
  backTo: (folder) => `Back to ${folder}`,
  forwardTo: (folder) => `Forward to ${folder}`,
  resizeColumn: (folder) => `Resize ${folder} column`,
  items: (count) => `${count} ${count === 1 ? "item" : "items"}`,
  changed: (count) => `${count} changed`,
  status: (status) =>
    ({ M: "modified", A: "added", D: "deleted", R: "renamed", U: "untracked" })[
      status
    ] ?? status,
  time: formatAge,
  bytes: formatBytes,
}

const allViews: readonly FilesView[] = ["list", "grid", "columns", "gallery"]

const normalize = (text: string) => text.normalize("NFKC").toLowerCase()

/** A level's files sorted; with no sort, in the app's order. */
function sorted(files: readonly ViewerFile[], sort: FilesSort | null) {
  if (!sort) return files
  const order = sort.descending ? -1 : 1
  const collator = new Intl.Collator(undefined, { numeric: true })
  return [...files].sort((a, b) => {
    // Folders first, as a file manager has them.
    if (!!a.directory !== !!b.directory) return a.directory ? -1 : 1
    const by =
      sort.by === "modified"
        ? (a.modified ?? 0) - (b.modified ?? 0)
        : sort.by === "size"
          ? (a.size ?? 0) - (b.size ?? 0)
          : 0
    const byName = collator.compare(a.name, b.name)
    // Equal by size or date: by name, A to Z either way, as Finder has it.
    return sort.by === "name" ? byName * order : by * order || byName
  })
}

// A level sorted once per order, not again per keystroke or render.
const sortCache = new WeakMap<
  readonly ViewerFile[],
  Map<string, readonly ViewerFile[]>
>()
function sortedOnce(files: readonly ViewerFile[], sort: FilesSort | null) {
  if (!sort) return files
  const key = `${sort.by}:${sort.descending}`
  let bySort = sortCache.get(files)
  if (!bySort) sortCache.set(files, (bySort = new Map()))
  let found = bySort.get(key)
  if (!found) bySort.set(key, (found = sorted(files, sort)))
  return found
}

type LevelFilter = { folder: string | null; prefix: string }

/** A name matches, or something under it does; a scoped prefix matches only that level. */
function matcher(query: string, scope?: LevelFilter) {
  const term = normalize(query.trim())
  const prefix = normalize(scope?.prefix ?? "")
  const matches = new Map<string, boolean>()
  const shown = (file: ViewerFile): boolean => {
    if (!term) return true
    let found = matches.get(file.id)
    if (found === undefined) {
      found =
        normalize(file.name).includes(term) ||
        (file.children ?? []).some((child) => shown(child))
      matches.set(file.id, found)
    }
    return found
  }
  return {
    term,
    shown: (file: ViewerFile, parent: string | null = null) =>
      scope && parent === scope.folder
        ? !file.disabled && normalize(file.name).startsWith(prefix)
        : shown(file),
  }
}

/** A group's heading among the rows or tiles. */
type Heading = { heading: string; key: string }
type FileRow = {
  file: ViewerFile
  depth: number
  parent: string | null
  open: boolean
  /** Its group's heading, said with it. */
  group?: string | undefined
}
type Row =
  Heading | FileRow | { loading: string; depth: number; empty?: boolean }

const isFile = (row: Row): row is FileRow => "file" in row

/** The top level's files, each under its group's heading if in groups. */
function topLevel(
  files: readonly ViewerFile[],
  groups: readonly FilesGroup[] | undefined,
  level: (
    files: readonly ViewerFile[],
    parent?: string | null
  ) => readonly ViewerFile[]
): (Heading | { file: ViewerFile; group?: string | undefined })[] {
  if (!groups) return level(files).map((file) => ({ file }))
  return groups.flatMap((group) => {
    const entries = level(group.files)
    if (entries.length === 0) return []
    return [
      { heading: group.label, key: `group:${group.key}` },
      ...entries.map((file) => ({ file, group: group.label })),
    ]
  })
}

/** The rows shown: the open folders' files under them, filtered, sorted. */
function rowsOf(
  files: readonly ViewerFile[],
  groups: readonly FilesGroup[] | undefined,
  expanded: ReadonlySet<string>,
  level: (
    files: readonly ViewerFile[],
    parent?: string | null
  ) => readonly ViewerFile[],
  query: string,
  scope?: LevelFilter
) {
  const { term, shown } = matcher(query, scope)
  const rows: Row[] = []
  const add = (file: ViewerFile, depth: number, parent: string | null) => {
    const open =
      !!file.directory &&
      (expanded.has(file.id) ||
        (!!term && (file.children ?? []).some((child) => shown(child))))
    return { file, depth, parent, open }
  }
  const walk = (
    files: readonly ViewerFile[],
    depth: number,
    parent: string | null
  ) => {
    const start = rows.length
    for (const file of level(files, parent)) {
      const row = add(file, depth, parent)
      rows.push(row)
      openUnder(row)
    }
    if (scope && parent === scope.folder && rows.length === start)
      rows.push({ loading: parent!, depth, empty: true })
  }
  const openUnder = (row: FileRow) => {
    if (!row.open) return
    if (row.file.children) walk(row.file.children, row.depth + 1, row.file.id)
    else rows.push({ loading: row.file.id, depth: row.depth + 1 })
  }
  for (const item of topLevel(files, groups, level)) {
    if ("heading" in item) {
      rows.push(item)
      continue
    }
    const row = { ...add(item.file, 0, null), group: item.group }
    rows.push(row)
    openUnder(row)
  }
  return rows
}

/** Each loaded file by its id, with its folder's. */
function indexOf(files: readonly ViewerFile[]) {
  const byId = new Map<string, { file: ViewerFile; parent: string | null }>()
  const walk = (level: readonly ViewerFile[], parent: string | null) => {
    for (const file of level) {
      byId.set(file.id, { file, parent })
      if (file.children) walk(file.children, file.id)
    }
  }
  walk(files, null)
  return byId
}

function countOf(
  files: readonly ViewerFile[],
  recursive = true
): {
  items: number
  changed: number
  bytes: number
} {
  let items = 0
  let changed = 0
  let bytes = 0
  const walk = (level: readonly ViewerFile[]) => {
    for (const file of level) {
      items++
      if (file.status) changed++
      bytes += file.size ?? 0
      if (recursive && file.children) walk(file.children)
    }
  }
  walk(files)
  return { items, changed, bytes }
}

/**
 * The list's columns: the name, then when it changed and its size, each
 * only where a loaded file has it.
 */
const listColumns = {
  both: "grid grid-cols-[minmax(0,1fr)_5.25rem_3.75rem] items-center",
  modified: "grid grid-cols-[minmax(0,1fr)_5.25rem] items-center",
  size: "grid grid-cols-[minmax(0,1fr)_3.75rem] items-center",
  none: "grid grid-cols-1 items-center",
}

/**
 * A row of the list or of a column: picked, a folder on the way to it,
 * dimmed; taller under a finger.
 */
const rowClass =
  "h-8 cursor-default rounded-md pe-2 text-2sm pointer-coarse:h-11 outline-none select-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:bg-muted data-dimmed:text-muted-foreground data-disabled:text-muted-foreground data-open:bg-muted/60"

/** A thumbnail, in the grid and the gallery's strip: picked, it is outlined. */
const thumbnailClass =
  "relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-muted/50 text-muted-foreground ring-1 ring-border ring-inset group-focus-visible/tile:ring-3 group-focus-visible/tile:ring-ring/50 group-aria-selected/tile:outline-2 group-aria-selected/tile:outline-offset-2 group-aria-selected/tile:outline-foreground *:[img,video]:size-full *:[img,video]:object-cover [&>svg]:size-6"

const tileClass =
  "group/tile data-disabled:opacity-50 flex cursor-default flex-col gap-1 rounded-lg text-xs outline-none select-none"

/** A file's type, by its name's extension, to its icon. */
const typeIcons: [RegExp, typeof File01Icon][] = [
  [/\.(png|jpe?g|gif|webp|avif|svg|bmp|ico|heic)$/i, Image01Icon],
  [/\.(mp4|webm|mov|mkv|avi|m4v)$/i, Video01Icon],
  [/\.(mp3|wav|ogg|oga|flac|m4a|aac|opus)$/i, MusicNote01Icon],
  [/\.pdf$/i, Pdf01Icon],
  [/\.(csv|tsv|xlsx?|ods|parquet)$/i, Csv01Icon],
  [/\.(zip|tar|gz|tgz|bz2|xz|7z|rar)$/i, FileZipIcon],
  [
    /\.([cm]?[jt]sx?|py|rb|go|rs|java|kt|swift|c|cc|cpp|h|hpp|cs|php|sh|zsh|bash|css|scss|html?|vue|svelte|sql|ya?ml|toml|json|xml|lua)$/i,
    FileScriptIcon,
  ],
]

const fileIcon = (file: ViewerFile, open: boolean) =>
  file.icon ?? (
    <HugeiconsIcon
      icon={
        file.directory
          ? open
            ? FolderOpenIcon
            : Folder01Icon
          : (typeIcons.find(([pattern]) => pattern.test(file.name))?.[1] ??
            File01Icon)
      }
      strokeWidth={2}
    />
  )

/** A file's status, after its name: a small boxed letter. */
function FileStatus({ status, label }: { status: string; label: string }) {
  return (
    <span
      data-slot="file-status"
      className="ms-1 inline-grid size-4 shrink-0 place-items-center rounded-sm font-mono text-2xs leading-none font-semibold text-foreground/80 ring-1 ring-border ring-inset"
    >
      <span aria-hidden="true">{status}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** A group's heading: shown, not an item; its files say it. */
function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      data-slot="files-viewer-group"
      className="flex h-8 items-end px-2 pb-1 text-2xs font-medium text-muted-foreground"
    >
      {children}
    </div>
  )
}

const plain = (event: React.KeyboardEvent) =>
  !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey

/** The arrow keys as they read: left and right swapped right to left. */
function logicalKey(event: React.KeyboardEvent<HTMLElement>) {
  const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
  return rtl && event.key === "ArrowLeft"
    ? "ArrowRight"
    : rtl && event.key === "ArrowRight"
      ? "ArrowLeft"
      : event.key
}

// A column's width and the preview's narrowest, in rem (w-44, and 15rem);
// a column the reader resizes stays between the narrowest and the widest.
const columnWidth = 11
const previewWidth = 15
const minColumnWidth = 10
const maxColumnWidth = 30

/**
 * A folder's files, as a file manager has them: a tree of rows with when
 * each changed and its size (sorted by any, by the header, or in the
 * app's order), a grid of thumbnails, columns of folder after folder,
 * or a gallery of the picked one large over a strip. One picked, the
 * arrow keys moving it; a filter by name, or the app's own search;
 * groups under headings; what opening a file (or a folder) does is the
 * app's.
 */
function FilesViewer({
  files: filesProp,
  groups,
  view: viewProp,
  defaultView = "list",
  onViewChange,
  views = allViews,
  selected,
  onSelect,
  onOpen,
  folderAction = "expand",
  tree = true,
  openOn = "double-click",
  onUp,
  loading,
  query: queryProp,
  onQueryChange,
  filtering = "local",
  levelFilter,
  count: countMode = "all",
  header: headerShown = true,
  filter = true,
  searching = false,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  sort: sortProp,
  defaultSort = { by: "name", descending: false },
  onSortChange,
  columnWidths: columnWidthsProp,
  defaultColumnWidths,
  onColumnWidthsChange,
  preview,
  fileProps,
  now: nowProp,
  controls,
  details = [],
  labels: labelsProp,
  icon = <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
  menu,
  start,
  ...frame
}: ViewerFrameProps & {
  /**
   * In the toolbar, in the path's place (the filter takes it while
   * open): e.g. a select of the app's places.
   */
  start?: React.ReactNode
  className?: string | undefined
  /** The folder's files and folders; a folder's own `children` under it. */
  files?: readonly ViewerFile[] | undefined
  /** Or its files in groups, each under its heading, in the app's order. */
  groups?: readonly FilesGroup[] | undefined
  view?: FilesView | undefined
  defaultView?: FilesView | undefined
  onViewChange?: ((view: FilesView) => void) | undefined
  /** The views the toolbar offers, in its order; one, no buttons. */
  views?: readonly FilesView[] | undefined
  /** The one picked, by id. */
  selected: string | null
  onSelect: (file: ViewerFile) => void
  /**
   * Opened: a double click or Enter on a file; on a folder too in the
   * grid and the gallery, and anywhere with `folderAction="open"`.
   */
  onOpen?: ((file: ViewerFile) => void) | undefined
  /**
   * What Enter and a double click do to a folder in the list and the
   * columns: `"expand"` it in place (the list opens it under itself, the
   * columns go into it), or `"open"` it as a file is, by `onOpen` (e.g.
   * the app goes into it, as from search results). The list's disclosure
   * and the right arrow still expand. The grid and the gallery always open.
   */
  folderAction?: FolderAction | undefined
  /** The list is a tree; false shows only this level, with folder chevrons. */
  tree?: boolean | undefined
  /** Open after picking on a single click, or a double click by default. */
  openOn?: "double-click" | "click" | undefined
  /** The folder above, asked for by Left arrow or Backspace in a flat list (`tree={false}`): the app goes there. */
  onUp?: (() => void) | undefined
  /** The files are still coming: a spinner and `labels.loading` in place of the empty view. */
  loading?: boolean | undefined
  /** What the filter field says: the viewer's own, or the app's. */
  query?: string | undefined
  /** The filter typed in, cleared, or closed (`""`). */
  onQueryChange?: ((query: string) => void) | undefined
  /**
   * Who matches: `"local"`, the viewer keeps the loaded files whose names
   * match and the folders they are in; `"manual"`, the app does (e.g. a
   * server's recursive search) and `files` are its results, shown as given.
   */
  filtering?: FilesFiltering | undefined
  /**
   * One folder's files filtered as a typed path's last segment filters
   * them: only the enabled ones whose names start with `prefix` (case and
   * width insensitive), `folder` by id, `null` the top level. The other
   * levels stay whole. It opens no field: the app's own input drives it.
   * An empty prefix filters nothing. While the toolbar's own filter has
   * text, that filters instead.
   */
  levelFilter?: LevelFilter | undefined
  /**
   * Facts count all loaded descendants, only the filtered top level, or
   * only one folder's files (`folder` by id, `null` the top level). Search
   * results are unchanged.
   */
  count?: "all" | "level" | { folder: string | null } | undefined
  /** The list's column header, its names sorting by them; the sort is in the menu too. */
  header?: boolean | undefined
  /** The toolbar's filter: none where the app filters, e.g. by a typed path. */
  filter?: boolean | undefined
  /** The app's search under way: a spinner in the field, said in the status bar. */
  searching?: boolean | undefined
  /** The folders open in the list, by id: the viewer's own, or the app's. */
  expanded?: ReadonlySet<string> | undefined
  /** The folders open at first, where they are the viewer's own. */
  defaultExpanded?: Iterable<string> | undefined
  /**
   * A folder opened or closed, or picked in the columns; one without
   * `children` is loading.
   */
  onExpandedChange?:
    ((expanded: ReadonlySet<string>, file: ViewerFile) => void) | undefined
  /** The order: by a column, or `null` for the app's own. */
  sort?: FilesSort | null | undefined
  defaultSort?: FilesSort | null | undefined
  onSortChange?: ((sort: FilesSort | null) => void) | undefined
  /** Column widths the reader set, in CSS pixels, by depth (0 the folder shown); a depth absent has the default (11rem). */
  columnWidths?: Readonly<Record<number, number>> | undefined
  defaultColumnWidths?: Readonly<Record<number, number>> | undefined
  /** A column resized (drag released, a key, a double click): the new widths, e.g. to keep. */
  onColumnWidthsChange?:
    ((widths: Readonly<Record<number, number>>) => void) | undefined
  /** The picked file large, in the columns and the gallery: e.g. a `MediaViewer`. */
  preview?: ((file: ViewerFile) => React.ReactNode) | undefined
  /** The app's props for a file's element: e.g. what a drag carries. */
  fileProps?:
    ((file: ViewerFile) => React.HTMLAttributes<HTMLElement>) | undefined
  /** The time "now" is, for how long ago each changed. */
  now?: number | undefined
  /** At the start of the status bar: e.g. "New file", "Upload". */
  controls?: React.ReactNode
  labels?: Partial<FilesViewerLabels & ViewerLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const files = React.useMemo(
    () => filesProp ?? groups?.flatMap((group) => group.files) ?? [],
    [filesProp, groups]
  )
  const [ownView, setOwnView] = React.useState(defaultView)
  const view = viewProp ?? ownView
  const setView = (next: FilesView) => {
    setOwnView(next)
    onViewChange?.(next)
  }
  const [ownExpanded, setOwnExpanded] = React.useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded)
  )
  const expanded = expandedProp ?? ownExpanded
  const toggle = (file: ViewerFile, open = !expanded.has(file.id)) => {
    if (file.disabled) return
    if (open === expanded.has(file.id)) return
    const next = new Set(expanded)
    if (open) next.add(file.id)
    else next.delete(file.id)
    setOwnExpanded(next)
    onExpandedChange?.(next, file)
  }
  const [ownColumnWidths, setOwnColumnWidths] = React.useState(
    () => defaultColumnWidths ?? {}
  )
  const columnWidths = columnWidthsProp ?? ownColumnWidths
  const setColumnWidths = (next: Readonly<Record<number, number>>) => {
    setOwnColumnWidths(next)
    onColumnWidthsChange?.(next)
  }
  const [ownSort, setOwnSort] = React.useState<FilesSort | null>(defaultSort)
  const sort = sortProp === undefined ? ownSort : sortProp
  const setSort = (next: FilesSort | null) => {
    setOwnSort(next)
    onSortChange?.(next)
  }
  const sortBy = (by: SortBy) =>
    setSort({ by, descending: sort?.by === by ? !sort.descending : false })

  const [filterOpen, setFilterOpen] = React.useState(false)
  const [ownQuery, setOwnQuery] = React.useState("")
  const query = queryProp ?? ownQuery
  const setQuery = (next: string) => {
    setOwnQuery(next)
    onQueryChange?.(next)
  }
  // The app's query emptied by the app (not typed away): the field closes,
  // as leaving a search does.
  const [lastQuery, setLastQuery] = React.useState(queryProp)
  if (queryProp !== lastQuery) {
    setLastQuery(queryProp)
    if (queryProp === "" && ownQuery !== "") {
      setFilterOpen(false)
      setOwnQuery("")
    }
  }
  // Open while asked to be, or while the app's query has something in it.
  const filterShown = filterOpen || query !== ""
  // What the viewer matches by: nothing, where the app does.
  const matching = filtering === "manual" ? "" : query
  // The app's search results: a flat list, each where it is, not a tree.
  const results = filtering === "manual" && query !== ""
  const filterInput = React.useRef<HTMLInputElement>(null)
  const [now] = React.useState(() => nowProp ?? Date.now())
  const at = nowProp ?? now

  const groupsShown = filesProp ? undefined : groups
  const byId = React.useMemo(() => indexOf(files), [files])
  // A column none has (folders alone, say) is left out, not a column of "—".
  const { hasModified, hasSize } = React.useMemo(() => {
    let hasModified = false
    let hasSize = false
    for (const { file } of byId.values()) {
      hasModified ||= file.modified !== undefined
      hasSize ||= !file.directory && file.size !== undefined
      if (hasModified && hasSize) break
    }
    return { hasModified, hasSize }
  }, [byId])
  const columns =
    listColumns[
      hasModified && hasSize
        ? "both"
        : hasModified
          ? "modified"
          : hasSize
            ? "size"
            : "none"
    ]
  const groupOf = React.useMemo(
    () =>
      new Map(
        (groupsShown ?? []).flatMap((group) =>
          group.files.map((file) => [file.id, group.label] as const)
        )
      ),
    [groupsShown]
  )
  // The level filter waits while the toolbar's has text.
  const scopeFolder = levelFilter?.folder
  const scopePrefix = query === "" ? (levelFilter?.prefix ?? "") : ""
  const scope = React.useMemo(
    () =>
      scopePrefix && scopeFolder !== undefined
        ? { folder: scopeFolder, prefix: scopePrefix }
        : undefined,
    [scopeFolder, scopePrefix]
  )
  const { shown } = React.useMemo(
    () => matcher(matching, scope),
    [matching, scope]
  )
  /** A folder's files as shown: sorted, filtered; `parent` the folder's id. */
  const level = React.useCallback(
    (files: readonly ViewerFile[], parent: string | null = null) => {
      const ordered = sortedOnce(files, sort)
      return matching || (scope && parent === scope.folder)
        ? ordered.filter((file) =>
            !tree && view === "list" && matching
              ? normalize(file.name).includes(normalize(matching.trim()))
              : shown(file, parent)
          )
        : ordered
    },
    [sort, matching, scope, shown, tree, view]
  )
  const rows = React.useMemo(
    () =>
      view === "list" && tree && !results
        ? rowsOf(files, groupsShown, expanded, level, matching, scope)
        : rowsOf(
            files,
            groupsShown,
            new Set(),
            level,
            tree || view !== "list" ? matching : "",
            scope
          ).filter(
            (row) => "heading" in row || (isFile(row) && row.depth === 0)
          ),
    [view, tree, results, files, groupsShown, expanded, level, matching, scope]
  )
  const entries = React.useMemo(() => rows.filter(isFile), [rows])
  const firstEnabled = entries.find((row) => !row.file.disabled)
  const firstEntry = firstEnabled ?? entries[0]
  const resultId = React.useId()
  // Results need a picked row before the first keyboard action.
  React.useEffect(() => {
    if (
      results &&
      !searching &&
      entries.some((row) => !row.file.disabled) &&
      !entries.some((row) => !row.file.disabled && row.file.id === selected)
    )
      onSelect(entries.find((row) => !row.file.disabled)!.file)
  }, [results, searching, entries, selected, onSelect])
  const index = entries.findIndex(
    (row) => !row.file.disabled && row.file.id === selected
  )
  const countedFolder =
    typeof countMode === "object" && !results ? countMode.folder : undefined
  const count = countOf(
    scope
      ? []
      : countedFolder !== undefined
        ? level(
            countedFolder === null
              ? files
              : (byId.get(countedFolder)?.file.children ?? []),
            countedFolder
          )
        : countMode === "level" && !results
          ? files.filter((file) => shown(file))
          : files,
    countMode === "all" || results
  )
  // The picked one focused once it is rendered, after a key.
  const root = React.useRef<HTMLDivElement>(null)
  const pending = React.useRef(false)
  const listActions = React.useRef<VirtualListActions>(null)
  // The app may pick a row without moving keyboard focus; and in another
  // view, the picked one is in view there too, in the middle where it can
  // be (the grid's, as it first lays out: `initialKey`).
  const viewShown = React.useRef(view)
  React.useLayoutEffect(() => {
    const switched = viewShown.current !== view
    viewShown.current = view
    if (selected !== null)
      listActions.current?.scrollToKey(
        selected,
        switched ? { align: "center" } : undefined
      )
  }, [selected, view])
  React.useLayoutEffect(() => {
    if (!pending.current) return
    // Focus gone elsewhere meanwhile (e.g. the app's field) stays there;
    // focus fallen to a container of the viewer (a dialog) does not count.
    const active = document.activeElement
    if (
      active &&
      root.current &&
      !root.current.contains(active) &&
      !active.contains(root.current)
    ) {
      pending.current = false
      return
    }
    const focusId = selected ?? firstEnabled?.file.id
    if (!focusId) return
    const find = () =>
      Array.from(
        root.current?.querySelectorAll<HTMLElement>("[data-file]") ?? []
      ).find((element) => element.dataset.file === focusId)
    const focus = () => {
      const found = find()
      if (!found) return
      pending.current = false
      found.focus()
    }
    focus()
    if (!pending.current) return
    const observer = new MutationObserver(focus)
    if (root.current)
      observer.observe(root.current, { childList: true, subtree: true })
    return () => observer.disconnect()
  })
  const pick = (file: ViewerFile | undefined) => {
    if (!file || file.disabled) return
    pending.current = true
    listActions.current?.scrollToKey(file.id)
    onSelect(file)
  }

  const attributes = (
    file: ViewerFile,
    tabbable: boolean,
    allDisabled = !firstEnabled
  ) => {
    const own = fileProps?.(file)
    const group = groupOf.get(file.id)
    return {
      ...own,
      ...(group ? { "aria-description": group } : {}),
      "aria-selected": !file.disabled && file.id === selected,
      "aria-disabled": file.disabled || undefined,
      "data-disabled": file.disabled || undefined,
      // A disabled one takes no focus, by a click either, unless all are.
      tabIndex:
        tabbable && (!file.disabled || allDisabled)
          ? 0
          : file.disabled && !allDisabled
            ? undefined
            : -1,
      "data-file": file.id,
      "data-dimmed": file.dimmed || undefined,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        own?.onClick?.(event)
        if (!event.defaultPrevented && !file.disabled) {
          onSelect(file)
          if (openOn === "click") {
            if (view === "list") activate(file)
            else if (
              view !== "columns" ||
              !file.directory ||
              folderAction === "open"
            )
              onOpen?.(file)
          }
        }
      },
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        own?.onFocus?.(event)
        if (
          !file.disabled &&
          file.id !== selected &&
          event.target === event.currentTarget
        )
          onSelect(file)
      },
    }
  }

  /** Enter or a double click in the list: a folder expanded, or opened. */
  const activate = (file: ViewerFile) =>
    !file.disabled &&
    (file.directory && folderAction === "expand" && (tree || view !== "list")
      ? toggle(file)
      : onOpen?.(file))

  const closeFilter = (refocus: boolean) => {
    setFilterOpen(false)
    if (query !== "") setQuery("")
    // By Escape: back to the picked one, the field it was in gone.
    if (refocus) pending.current = true
  }

  function onTreeKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (!plain(event)) return
    if (
      event.key === "Enter" &&
      (event.target as HTMLElement).closest("[data-disabled]")
    ) {
      event.preventDefault()
      return
    }
    if (!tree && ["ArrowLeft", "Backspace"].includes(logicalKey(event))) {
      event.preventDefault()
      pending.current = true
      onUp?.()
      return
    }
    const current = entries[index]
    const enabled = entries.filter((row) => !row.file.disabled)
    switch (logicalKey(event)) {
      case "ArrowDown":
        pick(entries.slice(index + 1).find((row) => !row.file.disabled)?.file)
        break
      case "ArrowUp":
        pick(
          entries
            .slice(0, Math.max(0, index))
            .findLast((row) => !row.file.disabled)?.file
        )
        break
      case "Home":
        pick(entries.find((row) => !row.file.disabled)?.file)
        break
      case "End":
        pick(enabled.at(-1)?.file)
        break
      case "ArrowRight":
        if (
          !current?.file.directory ||
          current.file.disabled ||
          (tree && results)
        )
          return
        if (!tree) {
          pending.current = true
          onOpen?.(current.file)
          break
        }
        if (!expanded.has(current.file.id)) toggle(current.file, true)
        else if (entries[index + 1]?.parent === current.file.id)
          pick(entries[index + 1]!.file)
        break
      case "ArrowLeft":
        if (!current) return
        if (current.file.directory && expanded.has(current.file.id))
          toggle(current.file, false)
        else pick(entries.find((row) => row.file.id === current.parent)?.file)
        break
      case "Enter":
        if (!current) return
        if (!tree && current.file.directory) pending.current = true
        activate(current.file)
        break
      default:
        return
    }
    event.preventDefault()
  }

  const sortItems = (
    // A group, as its label needs one (it threw without, opening the menu).
    <DropdownMenuGroup>
      <DropdownMenuLabel>{labels.sortBy}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={sort?.by ?? "none"}
        onValueChange={(by: SortBy | "none") =>
          setSort(by === "none" ? null : { by, descending: false })
        }
      >
        <DropdownMenuRadioItem value="name">
          {labels.name}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="modified">
          {labels.modified}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="size">
          {labels.size}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="none">
          {labels.unsorted}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  )

  const name = (file: ViewerFile) =>
    query ? (
      <SearchHighlight terms={[query.trim()]}>{file.name}</SearchHighlight>
    ) : (
      file.name
    )

  const empty =
    loading && files.length === 0 ? (
      <span
        role="status"
        className="flex h-8 items-center gap-2 px-2 text-xs text-muted-foreground"
      >
        <Spinner aria-hidden="true" className="size-3.5" />
        {labels.loading}
      </span>
    ) : (
      <p
        role="status"
        className="p-6 text-center text-sm text-muted-foreground"
      >
        {searching
          ? labels.searching
          : query || scope
            ? labels.noMatches
            : labels.empty}
      </p>
    )

  const header = (by: SortBy, label: string, end = false) => (
    <button
      type="button"
      data-slot="files-viewer-sort"
      aria-label={`${labels.sortBy} ${label}`}
      aria-pressed={sort?.by === by}
      onClick={() => sortBy(by)}
      className={cn(
        // Sorted, its arrow says so; its name as grey as the others.
        "inline-flex h-full items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        end && "justify-end"
      )}
    >
      {label}
      {sort?.by === by &&
        (sort.descending ? (
          <HugeiconsIcon
            icon={ArrowDown02Icon}
            strokeWidth={2}
            aria-hidden="true"
            className="size-3"
          />
        ) : (
          <HugeiconsIcon
            icon={ArrowUp02Icon}
            strokeWidth={2}
            aria-hidden="true"
            className="size-3"
          />
        ))}
    </button>
  )

  /** A row's name, its description and status after it. */
  const rowName = (file: ViewerFile) => (
    <>
      <span data-slot="files-viewer-name" className="min-w-0 truncate">
        {name(file)}
      </span>
      {file.status && (
        <FileStatus status={file.status} label={labels.status(file.status)} />
      )}
      {(file.added !== undefined || file.removed !== undefined) && (
        <span
          data-slot="files-viewer-changes"
          className="shrink-0 text-2xs text-subtle-foreground tabular-nums"
        >
          <span className="font-medium text-muted-foreground">
            +{file.added ?? 0}
          </span>{" "}
          −{file.removed ?? 0}
        </span>
      )}
      {file.description && (
        <span
          data-slot="files-viewer-description"
          // Gives way first: cut to nothing before the name is cut at all.
          className="min-w-0 shrink-1000 truncate text-xs text-muted-foreground"
        >
          {file.description}
        </span>
      )}
    </>
  )

  /** A tile: its thumbnail (or icon) with its badge, and its name under it. */
  const tile = (file: ViewerFile, caption: boolean) => (
    <>
      <span data-slot="files-viewer-thumbnail" className={thumbnailClass}>
        {file.thumbnail ?? fileIcon(file, false)}
        {file.badge && (
          <span className="absolute start-1 bottom-1 flex h-4 items-center gap-0.5 rounded-xs bg-background/90 px-1 text-2xs text-foreground/80 [&_svg]:size-3">
            {file.badge}
          </span>
        )}
      </span>
      <span className="truncate text-center">{name(file)}</span>
      {caption && file.caption && (
        <span className="-mt-1 truncate text-center text-2xs text-muted-foreground">
          {file.caption}
        </span>
      )}
    </>
  )

  const viewIcons: Record<FilesView, typeof ListViewIcon> = {
    list: ListViewIcon,
    grid: GridViewIcon,
    columns: LayoutThreeColumnIcon,
    gallery: GalleryThumbnailsIcon,
  }

  // The folder the gallery shows: the picked one's.
  const picked = selected === null ? undefined : byId.get(selected)
  const galleryFolder =
    picked && picked.parent !== null ? byId.get(picked.parent)?.file : undefined
  // Its way there from the top, the folders it is in: said over the strip.
  const galleryTrail: ViewerFile[] = []
  for (
    let at = galleryFolder && byId.get(galleryFolder.id);
    at;
    at = at.parent === null ? undefined : byId.get(at.parent)
  )
    galleryTrail.unshift(at.file)
  const strip =
    view === "gallery"
      ? galleryFolder
        ? level(galleryFolder.children ?? [], galleryFolder.id)
        : entries.map((row) => row.file)
      : []

  const scopedFiles = scope
    ? scope.folder === null
      ? files
      : (byId.get(scope.folder)?.file.children ?? [])
    : []
  const facts = scope
    ? [
        labels.resultsOf(
          level(scopedFiles, scope.folder).length,
          scopedFiles.length
        ),
        ...details,
      ]
    : searching
      ? [labels.searching, ...details]
      : results
        ? [labels.resultsOf(entries.length, count.items), ...details]
        : view === "list" || view === "columns"
          ? [
              labels.items(count.items),
              count.changed > 0 && labels.changed(count.changed),
              ...details,
            ]
          : (() => {
              const shownFiles =
                view === "gallery" ? strip : entries.map((row) => row.file)
              const bytes = shownFiles.reduce(
                (total, file) => total + (file.size ?? 0),
                0
              )
              return [
                labels.items(shownFiles.length),
                bytes > 0 && labels.bytes(bytes),
                ...details,
              ]
            })()

  // In the toolbar, in the path's place: what is searched for, and how
  // many the app found.
  const filterField = filterShown && (
    <ViewerFilter
      ref={filterInput}
      label={labels.filter}
      clearLabel={labels.clearFilter}
      icon={
        searching ? (
          <Spinner aria-hidden="true" />
        ) : (
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        )
      }
      value={query}
      onValueChange={(next) => {
        if (next === "") closeFilter(false)
        else setQuery(next)
      }}
      aria-controls={
        results && view === "list" && entries.length > 0 ? resultId : undefined
      }
      aria-activedescendant={
        results && view === "list" && index >= 0
          ? `${resultId}-${selected}`
          : undefined
      }
      status={results && !searching && labels.results(entries.length)}
      className="me-1 min-w-0 flex-1"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          closeFilter(true)
        } else if (
          results &&
          (event.key === "ArrowDown" || event.key === "ArrowUp")
        ) {
          // Keep typing focus while moving the picked result into view.
          event.preventDefault()
          const next =
            entries[
              Math.max(
                0,
                Math.min(
                  entries.length - 1,
                  index + (event.key === "ArrowDown" ? 1 : -1)
                )
              )
            ]?.file
          if (next) {
            listActions.current?.scrollToKey(next.id)
            onSelect(next)
          }
        } else if (results && event.key === "Enter") {
          event.preventDefault()
          const file = entries[index]?.file
          if (file) activate(file)
        } else if (event.key === "ArrowDown") {
          // Down to the first of what is shown.
          event.preventDefault()
          pick(entries.find((row) => !row.file.disabled)?.file)
        }
      }}
    />
  )

  return (
    <ViewerFrame
      data-viewer="files"
      data-view={view}
      icon={icon}
      labels={labelsProp}
      start={filterField || start || undefined}
      tools={
        <>
          {filter && !filterShown && (
            <ViewerTool
              label={labels.filter}
              onClick={() => {
                setFilterOpen(true)
                requestAnimationFrame(() => filterInput.current?.focus())
              }}
            >
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </ViewerTool>
          )}
          {views.length > 1 &&
            views.map((each) => (
              <ViewerTool
                key={each}
                label={labels[each]}
                pressed={view === each}
                onClick={() => setView(each)}
              >
                <HugeiconsIcon icon={viewIcons[each]} strokeWidth={2} />
              </ViewerTool>
            ))}
        </>
      }
      menu={
        <>
          {sortItems}
          {menu && (
            <>
              <DropdownMenuSeparator />
              {menu}
            </>
          )}
        </>
      }
      controls={
        results && !searching ? (
          <>
            <span className="ps-2 text-muted-foreground">
              {labels.searchIn(frame.name)}
            </span>
            {controls}
            <span className="flex-1" />
            <span className="text-subtle-foreground">{labels.searchHints}</span>
          </>
        ) : (
          controls
        )
      }
      facts={facts}
      {...frame}
      // No fill of its own (the frame's is the page's): it takes the
      // surface it sits on, a dialog's or a card's; its rows and tiles
      // draw their own.
      className={cn("bg-transparent", frame.className)}
    >
      <div
        ref={root}
        aria-busy={searching || loading || undefined}
        className="flex min-h-0 flex-1 flex-col"
        onKeyDown={(event) => {
          // Escape from the results, too, leaves the filter.
          if (event.key !== "Escape" || event.defaultPrevented || !filterShown)
            return
          event.preventDefault()
          event.stopPropagation()
          closeFilter(true)
        }}
      >
        {view === "list" ? (
          <>
            <div
              data-slot="files-viewer-header"
              hidden={results || !headerShown}
              className={cn(
                columns,
                "h-8 shrink-0 border-b px-3 text-2xs font-medium text-muted-foreground"
              )}
            >
              <span className="flex h-full">{header("name", labels.name)}</span>
              {hasModified && (
                <span className="flex h-full justify-end">
                  {header("modified", labels.modified, true)}
                </span>
              )}
              {hasSize && (
                <span className="flex h-full justify-end">
                  {header("size", labels.size, true)}
                </span>
              )}
            </div>
            {entries.length === 0 ? (
              empty
            ) : (
              <VirtualList
                id={resultId}
                role={tree ? "tree" : "listbox"}
                aria-label={frame.name}
                items={rows}
                getKey={(row) =>
                  "heading" in row
                    ? row.key
                    : "file" in row
                      ? row.file.id
                      : `loading:${row.loading}`
                }
                estimateSize={32}
                actionsRef={listActions}
                className="min-h-0 flex-1 p-1"
                onKeyDown={onTreeKeyDown}
                renderItem={(row) => {
                  if ("heading" in row)
                    return <GroupHeading>{row.heading}</GroupHeading>
                  const indent = {
                    paddingInlineStart: `calc(0.5rem + ${row.depth} * 1.125rem)`,
                  }
                  if ("loading" in row)
                    return (
                      <div
                        role="treeitem"
                        aria-level={row.depth + 1}
                        aria-disabled="true"
                        aria-selected="false"
                        style={indent}
                        className="flex h-8 items-center gap-2 text-xs text-muted-foreground"
                      >
                        {!row.empty && (
                          <Spinner aria-hidden="true" className="size-3.5" />
                        )}
                        {row.empty ? labels.noMatches : labels.loading}
                      </div>
                    )
                  const { file, depth, open } = row
                  return (
                    <div
                      role={tree ? "treeitem" : "option"}
                      aria-level={tree ? depth + 1 : undefined}
                      {...(file.directory && tree && !results
                        ? { "aria-expanded": open }
                        : {})}
                      {...attributes(
                        file,
                        (!file.disabled && file.id === selected) ||
                          (index < 0 && file === firstEntry?.file),
                        !entries.some((row) => !row.file.disabled)
                      )}
                      id={`${resultId}-${file.id}`}
                      style={indent}
                      data-slot="files-viewer-row"
                      className={cn(
                        results ? "flex items-center" : columns,
                        rowClass
                      )}
                      onDoubleClick={() => {
                        if (openOn === "double-click") activate(file)
                      }}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {tree && (
                          <span
                            aria-hidden="true"
                            hidden={results}
                            className="flex w-3 shrink-0 justify-center text-muted-foreground"
                            onClick={(event) => {
                              if (!file.directory || file.disabled) return
                              event.stopPropagation()
                              onSelect(file)
                              toggle(file)
                            }}
                          >
                            {file.directory && (
                              <HugeiconsIcon
                                icon={ArrowRight01Icon}
                                strokeWidth={2}
                                className={cn(
                                  "size-3 transition-transform rtl:rotate-180",
                                  open && "rotate-90 rtl:rotate-90"
                                )}
                              />
                            )}
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="flex shrink-0 text-muted-foreground [&_svg]:size-4"
                        >
                          {fileIcon(file, open)}
                        </span>
                        {rowName(file)}
                        {!tree && file.directory && (
                          <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            strokeWidth={2}
                            aria-hidden="true"
                            className="ms-auto size-3 shrink-0 text-muted-foreground rtl:rotate-180"
                          />
                        )}
                      </span>
                      {results && file.id === selected && (
                        <span className="ms-auto flex shrink-0 items-center gap-1 ps-2 text-2xs text-muted-foreground">
                          <Kbd>↵</Kbd> {labels.open}
                        </span>
                      )}
                      {/* A result is its name and where it is. */}
                      {!results && (
                        <>
                          {hasModified && (
                            <span className="text-end text-xs text-muted-foreground tabular-nums">
                              {file.modified !== undefined
                                ? labels.time(file.modified, at)
                                : "—"}
                            </span>
                          )}
                          {hasSize && (
                            <span className="text-end text-xs text-muted-foreground tabular-nums">
                              {file.directory || file.size === undefined
                                ? "—"
                                : labels.bytes(file.size)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )
                }}
              />
            )}
          </>
        ) : view === "grid" ? (
          entries.length === 0 ? (
            empty
          ) : (
            <VirtualGrid
              role="listbox"
              aria-label={frame.name}
              items={rows}
              getKey={(row) =>
                "heading" in row ? row.key : isFile(row) ? row.file.id : ""
              }
              fullWidth={(row) => "heading" in row}
              skip={(row) => isFile(row) && !!row.file.disabled}
              initialKey={selected}
              minItemWidth={104}
              gap={12}
              padding={16}
              estimateHeight={(row, width) =>
                "heading" in row ? 32 : width + 44
              }
              className="min-h-0 flex-1"
              renderItem={(row) => {
                if ("heading" in row)
                  return <GroupHeading>{row.heading}</GroupHeading>
                if (!isFile(row)) return null
                const { file } = row
                return (
                  <div
                    role="option"
                    {...attributes(
                      file,
                      (!file.disabled && file.id === selected) ||
                        (index < 0 && file === firstEntry?.file)
                    )}
                    data-slot="files-viewer-tile"
                    className={tileClass}
                    onDoubleClick={() => {
                      if (openOn === "double-click" && !file.disabled)
                        onOpen?.(file)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return
                      event.preventDefault()
                      if (!file.disabled) onOpen?.(file)
                    }}
                  >
                    {tile(file, true)}
                  </div>
                )
              }}
            />
          )
        ) : view === "columns" ? (
          <FilesColumns
            columnWidths={columnWidths}
            setColumnWidths={setColumnWidths}
            name={frame.name ?? ""}
            top={rows}
            byId={byId}
            selected={selected}
            level={level}
            scope={scope}
            pick={pick}
            onOpen={onOpen}
            folderAction={folderAction}
            openOn={openOn}
            expanded={expanded}
            toggle={toggle}
            preview={preview}
            attributes={attributes}
            rowName={rowName}
            labels={labels}
            empty={empty}
          />
        ) : strip.length === 0 ? (
          empty
        ) : (
          <FilesGallery
            name={frame.name ?? ""}
            trail={galleryTrail}
            labels={labels}
            files={strip}
            selected={selected}
            pick={pick}
            onOpen={onOpen}
            preview={preview}
            attributes={attributes}
            tile={tile}
            openOn={openOn}
          />
        )}
      </div>
    </ViewerFrame>
  )
}

type Attributes = (
  file: ViewerFile,
  tabbable: boolean,
  allDisabled?: boolean
) => React.HTMLAttributes<HTMLElement> & Record<`data-${string}`, unknown>

/** The picked file large: the app's preview, or its thumbnail and name. */
function FilePreview({
  file,
  preview,
}: {
  file: ViewerFile
  preview: ((file: ViewerFile) => React.ReactNode) | undefined
}) {
  const own = preview?.(file)
  if (own !== undefined && own !== null) return own
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6 text-center">
      <span
        aria-hidden="true"
        className="grid aspect-square w-full max-w-48 place-items-center overflow-hidden rounded-lg bg-muted/50 text-muted-foreground ring-1 ring-border ring-inset *:[img,video]:size-full *:[img,video]:object-contain [&>svg]:size-12"
      >
        {file.thumbnail ?? fileIcon(file, false)}
      </span>
      <span className="flex max-w-full flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{file.name}</span>
        {file.caption && (
          <span className="truncate text-xs text-muted-foreground">
            {file.caption}
          </span>
        )}
      </span>
    </div>
  )
}

type Column = {
  /** The folder's id ("" the one shown); in the column before, the file it is. */
  id: string
  name: string
  rows: readonly (Heading | FileRow)[]
  loading: boolean
}

/**
 * Folder after folder, side by side: the first the folder shown, each
 * next the folder picked in the one before; a file picked, its preview
 * beside them, or below where there is no room. Columns with no room
 * fold away from the start, a button going back to them. Up and down
 * pick in a column, right goes into a folder, left back out.
 */
function FilesColumns({
  columnWidths,
  setColumnWidths,
  name,
  top,
  byId,
  selected,
  level,
  scope,
  pick,
  onOpen,
  folderAction,
  openOn,
  expanded,
  toggle,
  preview,
  attributes,
  rowName,
  labels,
  empty,
}: {
  columnWidths: Readonly<Record<number, number>>
  setColumnWidths: (widths: Readonly<Record<number, number>>) => void
  name: string
  top: readonly Row[]
  byId: ReadonlyMap<string, { file: ViewerFile; parent: string | null }>
  selected: string | null
  level: (
    folder: readonly ViewerFile[],
    parent: string | null
  ) => readonly ViewerFile[]
  scope: LevelFilter | undefined
  pick: (file: ViewerFile | undefined) => void
  onOpen: ((file: ViewerFile) => void) | undefined
  folderAction: FolderAction
  openOn: "click" | "double-click"
  expanded: ReadonlySet<string>
  toggle: (file: ViewerFile, open?: boolean) => void
  preview: ((file: ViewerFile) => React.ReactNode) | undefined
  attributes: Attributes
  rowName: (file: ViewerFile) => React.ReactNode
  labels: FilesViewerLabels
  empty: React.ReactNode
}) {
  const root = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(0)
  const [rem, setRem] = React.useState(16)
  React.useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const measure = () => {
      if (element.getClientRects().length === 0) return
      setWidth(element.clientWidth)
      setRem(
        Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // The folders on the way to the picked one, and it if it is one.
  const chain: ViewerFile[] = []
  const picked = selected === null ? undefined : byId.get(selected)
  if (picked) {
    if (picked.file.directory) chain.unshift(picked.file)
    for (
      let parent = picked.parent;
      parent !== null;
      parent = byId.get(parent)?.parent ?? null
    ) {
      const folder = byId.get(parent)
      if (!folder) break
      chain.unshift(folder.file)
    }
  }
  const columns: Column[] = [
    {
      id: "",
      name,
      rows: top.filter((row) => "heading" in row || isFile(row)),
      loading: false,
    },
  ]
  for (const folder of chain) {
    if (
      !columns
        .at(-1)!
        .rows.some((row) => "file" in row && row.file.id === folder.id)
    )
      break
    columns.push({
      id: folder.id,
      name: folder.name,
      rows: level(folder.children ?? [], folder.id).map((file): FileRow => ({
        file,
        depth: 0,
        parent: folder.id,
        open: false,
      })),
      loading: !folder.children,
    })
  }

  // A folder picked whose files are not here yet: the app is asked, once.
  const asked = React.useRef(new Set<string>())
  React.useEffect(() => {
    const folder = chain.find(
      (each) =>
        !each.children && !expanded.has(each.id) && !asked.current.has(each.id)
    )
    if (!folder) return
    asked.current.add(folder.id)
    toggle(folder, true)
  })

  // Each column's list, to bring the picked one, or the folder on the
  // way to it, into view: a key may pick far off, the app may pick.
  const lists = React.useRef(new Map<string, VirtualListActions>())
  const scrolled = React.useRef<string | null | undefined>(undefined)
  React.useLayoutEffect(() => {
    if (scrolled.current === selected) return
    scrolled.current = selected
    const filtered = scope
      ? columns.findIndex((column) => (column.id || null) === scope.folder)
      : -1
    columns.forEach((column, index) => {
      if (index < filtered) return
      lists.current
        .get(column.id)
        ?.scrollToKey(columns[index + 1]?.id ?? selected ?? "")
    })
  })

  const filesOf = (column: Column) => column.rows.filter(isFile)
  // Where the picked one is: its column, and its place.
  let at = { column: -1, index: -1 }
  columns.forEach((column, index) => {
    const found = filesOf(column).findIndex(
      (row) => !row.file.disabled && row.file.id === selected
    )
    if (found >= 0) at = { column: index, index: found }
  })
  const file = !!picked && !picked.file.directory

  // As many columns as fit, the last ones, at the widths the reader gave
  // them; the preview beside if it fits.
  const clampWidth = (px: number) =>
    Math.min(maxColumnWidth * rem, Math.max(minColumnWidth * rem, px))
  const widthOf = (index: number) =>
    clampWidth(columnWidths[index] ?? columnWidth * rem)
  const besides =
    file && width >= widthOf(columns.length - 1) + previewWidth * rem
  const room = width - (besides ? previewWidth * rem : 0)
  // Gone back by the button, so many columns; another pick, none.
  const [back, setBack] = React.useState({ selected, columns: 0 })
  const gone =
    back.selected === selected ? Math.min(back.columns, columns.length - 1) : 0
  const end = columns.length - gone
  let fit = end
  if (
    width !== 0 &&
    columns.slice(0, end).reduce((sum, _, index) => sum + widthOf(index), 0) >
      room
  ) {
    fit = 0
    let sum = 0
    for (let index = end - 1; index >= 0; index--) {
      sum += widthOf(index)
      if (sum > room - 2 * rem) break
      fit++
    }
    fit = Math.max(1, fit)
  }
  // A border being dragged: the column's width is set on the element as
  // the pointer moves, not rendered, and kept once it is let go.
  const drag = React.useRef<{
    handle: HTMLDivElement
    column: HTMLElement
    pointer: number
    x: number
    start: number
    current: number
    direction: number
    moved: boolean
    style: string
    cancel: (event: KeyboardEvent) => void
  } | null>(null)
  const restoreDrag = () => {
    const current = drag.current
    if (!current) return
    current.column.style.width = current.style
    current.handle.setAttribute(
      "aria-valuenow",
      String(Math.round(current.start))
    )
    drag.current = null
    window.removeEventListener("keydown", current.cancel, true)
    return current
  }
  React.useEffect(
    () => () => {
      if (drag.current)
        window.removeEventListener("keydown", drag.current.cancel, true)
    },
    []
  )
  const resize = (index: number, px?: number) => {
    const next = { ...columnWidths }
    if (px === undefined) delete next[index]
    else next[index] = Math.round(Math.min(widestFor(index), clampWidth(px)))
    setColumnWidths(next)
  }
  const first = Math.max(0, end - fit)
  // The widest a shown column may grow: what the others shown leave it,
  // so it never pushes itself (and its border, focus on it) out of view.
  const widestFor = (index: number) => {
    if (width === 0) return maxColumnWidth * rem
    let others = first > 0 ? 2 * rem : 0
    for (let at = first; at < end; at++) if (at !== index) others += widthOf(at)
    return Math.max(
      minColumnWidth * rem,
      Math.min(maxColumnWidth * rem, room - others)
    )
  }
  const before = first > 0 ? columns[first - 1] : undefined
  const after = gone > 0 ? columns[end] : undefined
  const go = (step: number) =>
    setBack({ selected, columns: Math.max(0, gone + step) })

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (
      (event.target as HTMLElement).closest("[data-slot=files-column-resize]")
    )
      return
    if (!plain(event)) return
    if (
      event.key === "Enter" &&
      (event.target as HTMLElement).closest("[data-disabled]")
    ) {
      event.preventDefault()
      return
    }
    if ((event.target as HTMLElement).closest("[data-slot=files-preview]"))
      return
    const key = logicalKey(event)
    if (
      ![
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "Enter",
      ].includes(key)
    )
      return
    event.preventDefault()
    if (at.column < 0) {
      pick(filesOf(columns[0]!).find((row) => !row.file.disabled)?.file)
      return
    }
    const column = filesOf(columns[at.column]!)
    const current = column[at.index]!.file
    const inside = columns[at.column + 1]
    const into = () => {
      if (current.directory && inside?.id === current.id)
        pick(filesOf(inside).find((row) => !row.file.disabled)?.file)
    }
    switch (key) {
      case "ArrowUp":
      case "ArrowDown":
        pick(
          (key === "ArrowDown"
            ? column.slice(at.index + 1).find((row) => !row.file.disabled)
            : column.slice(0, at.index).findLast((row) => !row.file.disabled)
          )?.file
        )
        break
      case "Home":
        pick(column.find((row) => !row.file.disabled)?.file)
        break
      case "End":
        pick(column.findLast((row) => !row.file.disabled)?.file)
        break
      case "ArrowRight":
        into()
        break
      case "ArrowLeft":
        // The folder this column is.
        if (at.column > 0)
          pick(
            filesOf(columns[at.column - 1]!).find(
              (row) => row.file.id === columns[at.column]!.id
            )?.file
          )
        break
      case "Enter":
        if (current.directory && folderAction === "expand") into()
        else if (!current.disabled) onOpen?.(current)
    }
  }

  if (filesOf(columns[0]!).length === 0) return empty

  return (
    <div
      ref={root}
      data-slot="files-columns"
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden",
        file && !besides && gone === 0 && "flex-col"
      )}
      onKeyDown={onKeyDown}
    >
      <div
        className={cn("flex min-h-0 min-w-0", besides ? "shrink-0" : "flex-1")}
      >
        {before && (
          <ViewerTool
            label={labels.backTo(before.name)}
            className="ms-1 mt-1 shrink-0 self-start"
            onClick={() => go(1)}
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              strokeWidth={2}
              className="rtl:rotate-180"
            />
          </ViewerTool>
        )}
        {columns.slice(first, end).map((column, offset) => {
          const index = first + offset
          const open = columns[index + 1]?.id
          const entries = filesOf(column)
          const firstEnabled = entries.find((row) => !row.file.disabled)
          const firstEntry = firstEnabled ?? entries[0]
          const fills =
            !besides &&
            end - first === 1 &&
            (first > 0 || gone > 0) &&
            !(file && gone === 0)
          const px = Math.round(widthOf(index))
          const style =
            !fills && columnWidths[index] !== undefined
              ? { width: `${px}px` }
              : undefined
          const width = cn(
            "border-e",
            fills ? "flex-1" : "shrink-0",
            !fills && columnWidths[index] === undefined && "w-44"
          )
          const handle = !fills && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={labels.resizeColumn(column.name)}
              aria-valuenow={px}
              aria-valuemin={Math.round(minColumnWidth * rem)}
              aria-valuemax={Math.round(widestFor(index))}
              tabIndex={0}
              data-slot="files-column-resize"
              className="relative z-10 -ms-px w-px shrink-0 cursor-col-resize touch-none outline-none select-none after:absolute after:-inset-x-1 after:inset-y-0 hover:bg-ring focus-visible:bg-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-colors pointer-coarse:hidden"
              onPointerDown={(event) => {
                if (event.button !== 0 || event.pointerType === "touch") return
                const handle = event.currentTarget
                const column = handle.previousElementSibling as HTMLElement
                // Its layout width: a dialog opening scales it.
                const start = column.offsetWidth
                try {
                  handle.setPointerCapture(event.pointerId)
                } catch {
                  /* Synthetic pointers have no browser capture. */
                }
                drag.current = {
                  handle,
                  column,
                  pointer: event.pointerId,
                  x: event.clientX,
                  start,
                  current: start,
                  moved: false,
                  direction:
                    getComputedStyle(handle).direction === "rtl" ? -1 : 1,
                  style: column.style.width,
                  // Escape while dragging puts the column back, wherever
                  // focus is (the pointerdown leaves it where it was).
                  cancel: (event) => {
                    if (event.key !== "Escape") return
                    event.preventDefault()
                    event.stopPropagation()
                    restoreDrag()
                  },
                }
                window.addEventListener("keydown", drag.current.cancel, true)
                event.preventDefault()
              }}
              onPointerMove={(event) => {
                const current = drag.current
                if (
                  !current ||
                  current.pointer !== event.pointerId ||
                  !(event.buttons & 1)
                )
                  return
                const delta = (event.clientX - current.x) * current.direction
                current.moved ||= delta !== 0
                current.current = Math.round(
                  Math.min(widestFor(index), clampWidth(current.start + delta))
                )
                current.column.style.width = `${current.current}px`
                current.handle.setAttribute(
                  "aria-valuenow",
                  String(current.current)
                )
              }}
              onPointerUp={(event) => {
                if (drag.current?.pointer !== event.pointerId) return
                const current = restoreDrag()
                if (current?.moved) resize(index, current.current)
              }}
              onPointerCancel={() => {
                restoreDrag()
              }}
              onDoubleClick={() => resize(index)}
              onKeyDown={(event) => {
                const key = logicalKey(event)
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End", "Enter"].includes(
                    key
                  )
                )
                  return
                event.preventDefault()
                event.stopPropagation()
                const step = (event.shiftKey ? 4 : 1) * rem
                resize(
                  index,
                  key === "Enter"
                    ? undefined
                    : key === "Home"
                      ? minColumnWidth * rem
                      : key === "End"
                        ? widestFor(index)
                        : px + (key === "ArrowRight" ? step : -step)
                )
              }}
            />
          )
          const renderRow = (row: Heading | FileRow) => {
            if ("heading" in row)
              return <GroupHeading>{row.heading}</GroupHeading>
            const entry = row.file
            const isPicked = !entry.disabled && entry.id === selected
            const onWay = entry.id === open && !isPicked
            return (
              <div
                role="option"
                {...attributes(
                  entry,
                  isPicked ||
                    (at.column < 0 &&
                      index === 0 &&
                      entry === firstEntry?.file),
                  !firstEnabled
                )}
                // The folders on the way to the picked one are lit too.
                data-open={onWay || undefined}
                data-slot="files-viewer-row"
                className={cn(
                  rowClass,
                  "flex shrink-0 items-center gap-2 ps-2"
                )}
                // A folder picked is open beside already; opened, the app's.
                onDoubleClick={() => {
                  if (
                    openOn === "double-click" &&
                    !entry.disabled &&
                    (!entry.directory || folderAction === "open")
                  )
                    onOpen?.(entry)
                }}
              >
                <span
                  aria-hidden="true"
                  className="flex shrink-0 text-muted-foreground [&_svg]:size-4"
                >
                  {fileIcon(entry, entry.id === open)}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {rowName(entry)}
                </span>
                {entry.directory && (
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="size-3 shrink-0 text-muted-foreground rtl:rotate-180"
                  />
                )}
              </div>
            )
          }
          // A folder's files, however many: only those in view are drawn.
          if (!column.loading && entries.length > 0)
            return (
              <React.Fragment key={column.id || ":root"}>
                <VirtualList
                  style={style}
                  role="listbox"
                  aria-label={column.name}
                  data-slot="files-column"
                  items={column.rows}
                  getKey={(row) => ("heading" in row ? row.key : row.file.id)}
                  estimateSize={33}
                  actionsRef={(actions) => {
                    if (actions) lists.current.set(column.id, actions)
                    else lists.current.delete(column.id)
                  }}
                  className={cn("min-w-0 p-1", width)}
                  renderItem={(row) => (
                    <div className="pb-px">{renderRow(row)}</div>
                  )}
                />
                {handle}
              </React.Fragment>
            )
          return (
            <React.Fragment key={column.id || ":root"}>
              <div
                style={style}
                // An empty folder's is no list: none to pick in it.
                role={column.loading ? "listbox" : "group"}
                aria-label={column.name}
                aria-busy={column.loading || undefined}
                data-slot="files-column"
                className={cn("flex min-w-0 flex-col p-1", width)}
              >
                {column.loading ? (
                  <span className="flex h-8 items-center gap-2 px-2 text-xs text-muted-foreground">
                    <Spinner aria-hidden="true" className="size-3.5" />
                    {labels.loading}
                  </span>
                ) : (
                  <span className="flex h-8 items-center px-2 text-xs text-muted-foreground">
                    {scope && (column.id || null) === scope.folder
                      ? labels.noMatches
                      : labels.empty}
                  </span>
                )}
              </div>
              {handle}
            </React.Fragment>
          )
        })}
        {after && (
          <ViewerTool
            label={labels.forwardTo(after.name)}
            className="ms-1 mt-1 shrink-0 self-start"
            onClick={() => go(-1)}
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="rtl:rotate-180"
            />
          </ViewerTool>
        )}
      </div>
      {picked && file && gone === 0 && (
        <div
          data-slot="files-preview"
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto",
            !besides && "border-t"
          )}
        >
          <FilePreview file={picked.file} preview={preview} />
        </div>
      )}
    </div>
  )
}

/**
 * The picked file large (the app's preview, or its thumbnail), over a
 * strip of its folder's files to pick from. Left and right pick, Home and
 * End the first and last; Enter or a double click opens.
 */
function FilesGallery({
  name,
  trail,
  labels,
  files,
  selected,
  pick,
  onOpen,
  preview,
  attributes,
  tile,
  openOn,
}: {
  name: string
  /** The folders the strip's is in, from the top; none at the top. */
  trail: readonly ViewerFile[]
  labels: FilesViewerLabels
  files: readonly ViewerFile[]
  selected: string | null
  pick: (file: ViewerFile | undefined) => void
  onOpen: ((file: ViewerFile) => void) | undefined
  preview: ((file: ViewerFile) => React.ReactNode) | undefined
  attributes: Attributes
  openOn: "click" | "double-click"
  tile: (file: ViewerFile, caption: boolean) => React.ReactNode
}) {
  const found = files.findIndex(
    (file) => !file.disabled && file.id === selected
  )
  const at =
    found < 0
      ? Math.max(
          0,
          files.findIndex((file) => !file.disabled)
        )
      : found
  const shown = files[at]!
  const folder = trail.at(-1)
  const allDisabled = files.every((file) => file.disabled)
  const strip = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    Array.from(strip.current?.children ?? [])[at]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    })
  }, [at])
  return (
    <div data-slot="files-gallery" className="flex min-h-0 flex-1 flex-col">
      <div
        data-slot="files-preview"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <FilePreview file={shown} preview={preview} />
      </div>
      {folder && (
        // In a folder under the top (picked in the columns, say): where
        // the strip is, and a way back out, picking the folder.
        <div
          data-slot="files-gallery-path"
          className="flex h-9 flex-none items-center gap-1 border-t ps-1 pe-4 text-xs text-muted-foreground"
        >
          <ViewerTool
            label={labels.backTo(trail.at(-2)?.name ?? name)}
            onClick={() => pick(folder)}
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              strokeWidth={2}
              className="rtl:rotate-180"
            />
          </ViewerTool>
          <span className="min-w-0 truncate">
            {[name, ...trail.slice(0, -1).map((each) => each.name)]
              .filter(Boolean)
              .map((each) => `${each} / `)}
            <span className="text-foreground">{folder.name}</span>
          </span>
        </div>
      )}
      <div
        ref={strip}
        role="listbox"
        aria-label={folder?.name ?? name}
        aria-orientation="horizontal"
        data-slot="files-strip"
        className={cn(
          "flex flex-none scrollbar-thin gap-3 overflow-x-auto px-4 py-3",
          !folder && "border-t"
        )}
        onKeyDown={(event) => {
          if (!plain(event)) return
          const key = logicalKey(event)
          // The next one that can be picked that way, past disabled ones.
          const enabled = (file: ViewerFile) => !file.disabled
          const to =
            key === "ArrowRight"
              ? files.slice(at + 1).find(enabled)
              : key === "ArrowLeft"
                ? files.slice(0, at).findLast(enabled)
                : key === "Home"
                  ? files.find(enabled)
                  : key === "End"
                    ? files.findLast(enabled)
                    : undefined
          if (
            key === "ArrowRight" ||
            key === "ArrowLeft" ||
            key === "Home" ||
            key === "End"
          ) {
            event.preventDefault()
            pick(to)
          } else if (key === "Enter") {
            event.preventDefault()
            if ((event.target as HTMLElement).closest("[data-disabled]")) return
            if (!shown.disabled) onOpen?.(shown)
          }
        }}
      >
        {files.map((file, index) => (
          <div
            key={file.id}
            role="option"
            {...attributes(file, index === at, allDisabled)}
            // None picked: the first enabled file is shown.
            aria-selected={!file.disabled && index === at}
            data-slot="files-viewer-tile"
            className={cn(tileClass, "w-18 shrink-0")}
            onDoubleClick={() => {
              if (openOn === "double-click" && !file.disabled) onOpen?.(file)
            }}
          >
            {tile(file, false)}
          </div>
        ))}
      </div>
    </div>
  )
}

export {
  FilesViewer,
  formatAge,
  formatBytes,
  type FilesFiltering,
  type FilesGroup,
  type FilesSort,
  type FilesView,
  type FilesViewerLabels,
  type FolderAction,
  type ViewerFile,
}
