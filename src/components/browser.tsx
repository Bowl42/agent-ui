"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "cn"
import { PreviewCard } from "@base-ui/react/preview-card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  AudioWave01Icon,
  Cancel01Icon,
  CommandLineIcon,
  Csv01Icon,
  DashboardSquare01Icon,
  File01Icon,
  FileDiffIcon,
  FileScriptIcon,
  Folder01Icon,
  Globe02Icon,
  Image01Icon,
  LayoutTwoColumnIcon,
  Pdf01Icon,
  RefreshIcon,
  Search01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons"

import {
  FilesViewer,
  type FilesView,
  type FilesViewerLabels,
  type ViewerFile,
} from "@/components/files-viewer"
import { CodeViewer, type CodeViewerLabels } from "@/components/code-viewer"
import {
  MediaViewer,
  defaultMediaViewerLabels,
  type ImageEditorLabels,
  type ImageMark,
  type ImageSize,
  type MediaViewerImageVersion,
  type MediaViewerLabels,
  type TranscriptCue,
} from "@/components/media-viewer"
import {
  PdfViewer,
  type PdfPage,
  type PdfViewerLabels,
} from "@/components/pdf-viewer"
import {
  TableViewer,
  parseCsv,
  type TableCellPosition,
  type TableViewerColumn,
  type TableViewerLabels,
} from "@/components/table-viewer"
import {
  TerminalViewer,
  type TerminalSession,
  type TerminalViewerLabels,
} from "@/components/terminal-viewer"
import {
  ViewerActionBar,
  ViewerBack,
  ViewerForward,
  ViewerFrame,
  ViewerToolGroup,
  ViewerStatusButton,
  ViewerToolbar,
  ViewerTool,
  type ViewerFrameProps,
  type ViewerLabels,
  type ViewerPathSegment,
} from "@/components/viewer"
import {
  BrowserAddressStatus,
  BrowserWebPage,
  BrowserWebTools,
  defaultWebLabels,
  defaultWebView,
  type BrowserAgent,
  type BrowserBox,
  type BrowserConsoleMessage,
  type BrowserDevice,
  type BrowserElement,
  type BrowserPickOptions,
  type BrowserNetworkRequest,
  type BrowserRecent,
  type BrowserRemoteInput,
  type BrowserWebContent,
  type BrowserWebLabels,
  type BrowserWebView,
} from "@/components/browser-web"
import { Button } from "@/components/ui/button"
import {
  DiffFileContent,
  DiffFileList,
  DiffStat,
  defaultDiffLabels,
  diffFileName,
  diffInset,
  diffTotals,
  type DiffLabels,
} from "@/components/diff-block"
import { diffFiles, type DiffFile } from "@/lib/unified-diff"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { HoverCard, HoverCardContent } from "@/components/ui/hover-card"
import { Kbd } from "@/components/ui/kbd"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * A file or a directory, in a `files` page; with what a `FilesViewer`
 * shows of it, all optional: when it changed, its size, its status.
 */
type BrowserFile = Omit<ViewerFile, "id" | "children" | "directory"> & {
  name: string
  /** Where it is, as the app names it: given back when it is opened. */
  path: string
  /** A directory's files and directories; a file has none. */
  children?: BrowserFile[] | undefined
}

/** What a page shown in a viewer may have: its facts, a download. */
type BrowserFileFacts = {
  /** The app's facts at the end of its status bar: "PNG", "412 KB". */
  details?: readonly React.ReactNode[] | undefined
  /** A link to save it: its toolbar's download. */
  download?: string | undefined
}

/**
 * What is given to the chat from a page (its "@"): the page, or a part of
 * it: a table's cell, a terminal's output, a file of a folder.
 */
type BrowserChatPart =
  | { cell: TableCellPosition & { value: string; name: string } }
  | { session: TerminalSession }
  | { file: BrowserFile }

/**
 * The type of a file or directory dragged from a `files` page, as a
 * `DataTransfer` names it: e.g. a `Composer`'s `dropTypes`. Its text is
 * the path too, for any input.
 */
const browserFileType = "application/x-agent-ui-browser-file"

/** The file or directory a drag from a `files` page carries, if any. */
function browserFileFrom(
  data: DataTransfer
): { name: string; path: string; directory: boolean } | undefined {
  try {
    const file: unknown = JSON.parse(data.getData(browserFileType))
    if (
      file &&
      typeof file === "object" &&
      "name" in file &&
      typeof file.name === "string" &&
      "path" in file &&
      typeof file.path === "string"
    )
      return {
        name: file.name,
        path: file.path,
        directory: "directory" in file && file.directory === true,
      }
  } catch {
    // Not one, or from elsewhere.
  }
  return undefined
}

/** Gives a drag what it carries: the file, and its path as text. */
function dragFile(event: React.DragEvent, file: BrowserFile) {
  const { name, path } = file
  event.dataTransfer.setData(
    browserFileType,
    JSON.stringify({ name, path, directory: !!file.children })
  )
  event.dataTransfer.setData("text/plain", path)
  event.dataTransfer.effectAllowed = "copy"
}

/** What a page shows. */
type BrowserContent =
  /** A web page; its states (the agent at work, its console) the app's. */
  | BrowserWebContent
  | (BrowserFileFacts & {
      type: "image"
      src: string
      /** What it shows, for those who do not see it. */
      alt: string
      crossOrigin?: "anonymous" | "use-credentials" | undefined
      /** Its size in pixels, if the app knows; else read as it loads. */
      width?: number | undefined
      height?: number | undefined
      /**
       * Its earlier versions, oldest first, the first the original (its
       * `MediaViewer`'s strip of versions); and when this one was.
       */
      versions?: readonly MediaViewerImageVersion[] | undefined
      when?: string | undefined
      /**
       * Its areas can be marked, for the `Browser`'s `onMarkImage`: its
       * `MediaViewer`'s marking tools, as with `marks` or `highlight`.
       */
      markable?: boolean | undefined
      /** Marks to show on it, e.g. those sent. */
      marks?: readonly ImageMark[] | undefined
      /** A mask of what changed in it, lit as it opens (`MediaViewer`'s). */
      highlight?: string | undefined
    })
  | (BrowserFileFacts & {
      type: "video" | "audio"
      src: string
      crossOrigin?: "anonymous" | "use-credentials" | undefined
      /** A video's picture before it plays. */
      poster?: string | undefined
      captions?: { src: string; label: string; language: string }[] | undefined
      /** A recording's title over its waveform, by default the page's; and under it, who or what made it. */
      heading?: React.ReactNode
      description?: React.ReactNode
      /** A recording's loudness over time, each from 0 to 1: its waveform. */
      peaks?: readonly number[] | undefined
      /** A recording's lines, from when each is said. */
      transcript?: readonly TranscriptCue[] | undefined
    })
  /** A PDF: its pages as the app renders them, or the browser's own viewer of `src`. */
  | (BrowserFileFacts & {
      type: "pdf"
      src?: string | undefined
      pages?: readonly PdfPage[] | undefined
      /** How many pages it has, where only `src` is given. */
      pageCount?: number | undefined
    })
  /** A table, e.g. a CSV file: its `csv` text, or its columns and rows. */
  | (BrowserFileFacts & {
      type: "table"
      csv?: string | undefined
      /** The `csv`'s separator: "," by default, "\t" for a TSV. */
      separator?: string | undefined
      columns?: readonly (string | TableViewerColumn)[] | undefined
      rows?: readonly (readonly string[])[] | undefined
      /** How many rows it has, where only some were read. */
      totalRows?: number | undefined
    })
  /** A file's code, in a `CodeViewer`: find, fold, wrap, copy. */
  | {
      type: "code"
      code: string
      /** For its colours: "ts", "python"; none, by its title's extension. */
      language?: string | undefined
      /** A line's look, e.g. the lines an edit changed (`CodeViewer`'s). */
      lineVariant?: React.ComponentProps<typeof CodeViewer>["lineVariant"]
      /** JSON shown formatted at first. */
      defaultFormatted?: boolean | undefined
    }
  /**
   * A diff: a unified diff's text, or the files `parseUnifiedDiff` read.
   * Of more than one file, their list over the diff of the one picked.
   */
  | {
      type: "diff"
      diff: string | readonly DiffFile[]
      /**
       * The app's buttons for the changes, in a bar at the foot: e.g.
       * Discard and Commit. With them, the bar takes the status bar's
       * place.
       */
      actions?: React.ReactNode
      /**
       * What the changes are on, at the start of that bar: e.g. a branch
       * icon and "perf/vite-chunks · 3 files".
       */
      status?: React.ReactNode
      /** Its lines' numbers: one column (the default), or old and new. */
      numbers?: "one" | "both" | undefined
    }
  | {
      type: "terminal"
      output: string
      /** While output is still coming: follows its end. */
      live?: boolean | undefined
      /** What the app says of it, at the end of its status bar: "Running · 12m". */
      status?: React.ReactNode
      /** Other processes, in tabs after this one: the page's own first. */
      sessions?: readonly TerminalSession[] | undefined
    }
  | {
      type: "files"
      files: BrowserFile[]
      /** Rows, thumbnails, columns or a gallery: the reader's to change. */
      view?: FilesView | undefined
      details?: readonly React.ReactNode[] | undefined
    }
  /** The app's own: anything else it shows. */
  | { type: "custom"; element: React.ReactNode }
  /**
   * A new tab's: the `Browser`'s `start`, under an empty address bar. Going
   * from it to a page, back returns to it.
   */
  | { type: "start" }

/** Something open in a tab. */
type BrowserPage = {
  /** The same page has the same id: opening it again goes to its tab. */
  id: string
  title: string
  /** Where it is, in the address bar: a URL, a file's path. */
  location?: string | undefined
  /** Its own icon; by default, its type's. */
  icon?: React.ReactNode
  /** A number after its title in its tab, e.g. of files changed. */
  count?: number | undefined
  /**
   * More of it in its tab's card, under its title and location, as the
   * pointer rests on the tab: e.g. a diff's "1 changed file +91 −0" and
   * its files.
   */
  preview?: React.ReactNode
  content: BrowserContent
  /**
   * The browser's toolbar over it (back, forward, its address); `false`
   * where the page has its own, e.g. a `custom` web view of the app's
   * that knows its history, made of `BrowserToolbar` and its buttons.
   * A page shown in a viewer (an image, video, audio, a PDF, a table, a
   * terminal, files) has the viewer's instead, with back and forward.
   */
  toolbar?: boolean | undefined
}

/** A tab: the pages gone through in it, back and forward. */
type BrowserTab = {
  id: string
  pages: BrowserPage[]
  /** The page it shows. */
  index: number
  /** Its pane's id, where the browser is split; by default the first. */
  pane?: string | undefined
  /**
   * One of the app's fixed areas (e.g. Changes, Files, Terminal), not a
   * page the reader opened: it has no close button, and Delete or a
   * middle click do not close it.
   */
  pinned?: boolean | undefined
}

type BrowserState = {
  /** In order: the first pane's, then the next's. */
  tabs: BrowserTab[]
  /** The tab shown in the pane the reader was last in. */
  active: string | null
  /**
   * Where the browser is split: its panes side by side, each the tab it
   * shows. None while it is one.
   */
  panes?: { id: string; active: string | null }[] | undefined
}

/** A pane as the browser works with it: its tabs, and the one shown. */
type Pane = { id: string; tabs: BrowserTab[]; active: string | null }
type Panes = { panes: Pane[]; focused: string | null }

/** The pane of a browser that is not split. */
const firstPane = "browser-pane"

let tabs = 0
const newTab = (page: BrowserPage): BrowserTab => ({
  id: `browser-tab-${++tabs}`,
  pages: [page],
  index: 0,
})
let panes = 0
const newPane = () => `browser-pane-${++panes}`

const current = (tab: BrowserTab) => tab.pages[tab.index]!

function panesOf(state: BrowserState): Panes {
  const ids = state.panes?.map((pane) => pane.id) ?? []
  if (ids.length === 0)
    return state.tabs.length
      ? {
          panes: [{ id: firstPane, tabs: state.tabs, active: state.active }],
          focused: firstPane,
        }
      : { panes: [], focused: null }
  const paneOf = (tab: BrowserTab) =>
    tab.pane !== undefined && ids.includes(tab.pane) ? tab.pane : ids[0]
  const all = state.panes!.map((pane) => {
    const own = state.tabs.filter((tab) => paneOf(tab) === pane.id)
    return {
      id: pane.id,
      tabs: own.map(withoutPane),
      active: own.some((tab) => tab.id === pane.active)
        ? pane.active
        : (own[0]?.id ?? null),
    }
  })
  const kept = all.filter((pane) => pane.tabs.length > 0)
  return {
    panes: kept,
    focused:
      kept.find((pane) => pane.tabs.some((tab) => tab.id === state.active))
        ?.id ??
      kept[0]?.id ??
      null,
  }
}

function withoutPane(tab: BrowserTab): BrowserTab {
  const own = { ...tab }
  delete own.pane
  return own
}

function stateOf({ panes, focused }: Panes): BrowserState {
  const kept = panes.filter((pane) => pane.tabs.length > 0)
  const shown = kept.find((pane) => pane.id === focused) ?? kept[0]
  const active = shown?.active ?? null
  // One pane, as it was before any split: no trace of panes.
  if (kept.length <= 1 && (kept[0]?.id ?? firstPane) === firstPane)
    return { tabs: kept[0]?.tabs ?? [], active }
  return {
    tabs: kept.flatMap((pane) =>
      pane.tabs.map((tab) => ({ ...tab, pane: pane.id }))
    ),
    active,
    panes: kept.map(({ id, active }) => ({ id, active })),
  }
}

/** Where a tab is: its pane, and its place in it. */
function find({ panes }: Panes, id: string | null | undefined) {
  for (const pane of panes) {
    const index = pane.tabs.findIndex((tab) => tab.id === id)
    if (index >= 0) return { pane, index, tab: pane.tabs[index]! }
  }
  return undefined
}

/** Takes a tab out of its pane; a pane left empty goes. */
function take(state: Panes, id: string): Panes {
  const at = find(state, id)
  if (!at) return state
  const tabs = at.pane.tabs.filter((tab) => tab.id !== id)
  if (tabs.length === 0) {
    const index = state.panes.indexOf(at.pane)
    const panes = state.panes.filter((pane) => pane !== at.pane)
    return {
      panes,
      focused:
        state.focused === at.pane.id
          ? (panes[Math.min(index, panes.length - 1)]?.id ?? null)
          : state.focused,
    }
  }
  const active =
    at.pane.active === id
      ? tabs[Math.min(at.index, tabs.length - 1)]!.id
      : at.pane.active
  return {
    ...state,
    panes: state.panes.map((pane) =>
      pane === at.pane ? { ...pane, tabs, active } : pane
    ),
  }
}

/** Puts a tab in a pane, before the tab at `index`, and shows it there. */
function put(state: Panes, tab: BrowserTab, paneId: string, index: number) {
  return {
    panes: state.panes.map((pane) => {
      if (pane.id !== paneId) return pane
      const tabs = [...pane.tabs]
      tabs.splice(Math.max(0, Math.min(index, tabs.length)), 0, tab)
      return { ...pane, tabs, active: tab.id }
    }),
    focused: paneId,
  }
}

/**
 * The tabs of a `Browser` and what is done with them. Its state is its
 * own, or the app's (`value` and `onValueChange`), e.g. to keep it.
 */
function useBrowser({
  value,
  defaultValue = { tabs: [], active: null },
  onValueChange,
}: {
  value?: BrowserState | undefined
  defaultValue?: BrowserState | undefined
  onValueChange?: ((value: BrowserState) => void) | undefined
} = {}) {
  const [own, setOwn] = React.useState(defaultValue)
  const state = value ?? own
  // The latest, for changes made one after another before rendering.
  const latest = React.useRef({ state, value, onValueChange })
  React.useLayoutEffect(() => {
    latest.current = { state, value, onValueChange }
  }, [state, value, onValueChange])

  const [actions] = React.useState(() => {
    const change = (update: (state: Panes) => Panes) => {
      const { state, value, onValueChange } = latest.current
      const before = panesOf(state)
      const after = update(before)
      if (after === before) return
      const next = stateOf(after)
      latest.current = { ...latest.current, state: next }
      if (value === undefined) setOwn(next)
      onValueChange?.(next)
    }
    /** The tab `id`, or the one shown where the reader was last. */
    const inTab = (
      id: string | undefined,
      update: (tab: BrowserTab) => BrowserTab
    ) =>
      change((state) => {
        const target =
          id ?? state.panes.find((pane) => pane.id === state.focused)?.active
        const at = find(state, target)
        if (!at) return state
        return {
          ...state,
          panes: state.panes.map((pane) =>
            pane === at.pane
              ? {
                  ...pane,
                  tabs: pane.tabs.map((tab) =>
                    tab === at.tab ? update(tab) : tab
                  ),
                }
              : pane
          ),
        }
      })
    /** A new tab, after the one shown where the reader was last. */
    const openTab = (state: Panes, page: BrowserPage): Panes => {
      const tab = newTab(page)
      const pane = state.panes.find((pane) => pane.id === state.focused)
      if (!pane)
        return {
          panes: [{ id: firstPane, tabs: [tab], active: tab.id }],
          focused: firstPane,
        }
      const at = pane.tabs.findIndex((each) => each.id === pane.active)
      return put(state, tab, pane.id, at + 1)
    }

    return {
      /**
       * Opens a page in a new tab after the one shown, or goes to the tab
       * already showing it.
       */
      open: (page: BrowserPage) =>
        change((state) => {
          for (const pane of state.panes) {
            const open = pane.tabs.find((tab) => current(tab).id === page.id)
            if (open)
              return {
                panes: state.panes.map((each) =>
                  each === pane ? { ...pane, active: open.id } : each
                ),
                focused: pane.id,
              }
          }
          return openTab(state, page)
        }),
      /**
       * Goes to a page in a tab (by default the one shown where the reader
       * was last), after its page: back returns.
       */
      navigate: (page: BrowserPage, tab?: string) =>
        change((state) => {
          const target =
            tab ?? state.panes.find((pane) => pane.id === state.focused)?.active
          const at = find(state, target)
          if (!at) return openTab(state, page)
          const update = (tab: BrowserTab): BrowserTab => {
            if (current(tab).id === page.id) {
              const pages = [...tab.pages]
              pages[tab.index] = page
              return { ...tab, pages }
            }
            const pages = [...tab.pages.slice(0, tab.index + 1), page]
            return { ...tab, pages, index: pages.length - 1 }
          }
          return {
            ...state,
            panes: state.panes.map((pane) =>
              pane === at.pane
                ? {
                    ...pane,
                    tabs: pane.tabs.map((each) =>
                      each === at.tab ? update(each) : each
                    ),
                  }
                : pane
            ),
          }
        }),
      /**
       * Changes a page wherever it is open, e.g. as a command's output
       * comes or a file loads.
       */
      update: (page: BrowserPage) =>
        change((state) => ({
          ...state,
          panes: state.panes.map((pane) => ({
            ...pane,
            tabs: pane.tabs.map((tab) =>
              tab.pages.some((each) => each.id === page.id)
                ? {
                    ...tab,
                    pages: tab.pages.map((each) =>
                      each.id === page.id ? page : each
                    ),
                  }
                : tab
            ),
          })),
        })),
      back: (tab?: string) =>
        inTab(tab, (tab) => ({ ...tab, index: Math.max(0, tab.index - 1) })),
      forward: (tab?: string) =>
        inTab(tab, (tab) => ({
          ...tab,
          index: Math.min(tab.pages.length - 1, tab.index + 1),
        })),
      /** Shows a tab in its pane, the reader in it. */
      select: (tab: string) =>
        change((state) => {
          const at = find(state, tab)
          if (!at) return state
          if (at.pane.active === tab && state.focused === at.pane.id)
            return state
          return {
            panes: state.panes.map((pane) =>
              pane === at.pane ? { ...pane, active: tab } : pane
            ),
            focused: at.pane.id,
          }
        }),
      /** The pane the reader is in: where `open` and `navigate` go. */
      focus: (pane: string) =>
        change((state) =>
          state.focused === pane ||
          !state.panes.some((each) => each.id === pane)
            ? state
            : { ...state, focused: pane }
        ),
      /**
       * Closes a tab; if it was shown, the one after it is, or before. A
       * pane left with none goes.
       */
      close: (id: string) => change((state) => take(state, id)),
      /**
       * Moves a tab before the tab at `index` of a pane (its own, or
       * another), and shows it there.
       */
      move: (id: string, to: { pane: string; index: number }) =>
        change((state) => {
          const at = find(state, id)
          if (!at || !state.panes.some((pane) => pane.id === to.pane))
            return state
          // Its place once it is taken out.
          const index =
            at.pane.id === to.pane && at.index < to.index
              ? to.index - 1
              : to.index
          if (at.pane.id === to.pane && at.index === index) return state
          const taken = take(state, id)
          if (!taken.panes.some((pane) => pane.id === to.pane)) return state
          return put(taken, at.tab, to.pane, index)
        }),
      /**
       * Moves a tab to a new pane beside a pane (by default its own),
       * before it or after.
       */
      split: (
        id: string,
        {
          side = "end",
          beside,
        }: { side?: "start" | "end"; beside?: string } = {}
      ) =>
        change((state) => {
          const at = find(state, id)
          if (!at) return state
          const by = beside ?? at.pane.id
          const taken = take(state, id)
          const index = taken.panes.findIndex((pane) => pane.id === by)
          // Alone in its pane, beside it: where it is already.
          if (index < 0) return state
          const pane = { id: newPane(), tabs: [at.tab], active: at.tab.id }
          const panes = [...taken.panes]
          panes.splice(side === "start" ? index : index + 1, 0, pane)
          return { panes, focused: pane.id }
        }),
    }
  })

  return { ...actions, state }
}

type BrowserLabels = BrowserWebLabels & {
  /** The tabs, as a list. */
  tabs: string
  /** A pane's tabs, where it is split: "Open pages, pane 2". */
  paneTabs: (pane: number) => string
  /** The handle between two panes. */
  resizePanes: string
  /**
   * Where they are one at a time, too narrow: "Pane 1/2", its button's
   * name, which says what it shows ("1/2").
   */
  panes: (pane: number, of: number) => string
  back: string
  forward: string
  reload: string
  /** The address bar, and what it says while empty. */
  address: string
  addressPlaceholder: string
  nothingOpen: string
  nothingOpenHint: string
  /** The "+" after the tabs, and a new tab's title. */
  newTab: string
  /** A new tab's sections (`start`): its places, and its recent pages. */
  suggested: string
  recentPages: string
  imageFailed: string
  /** An image's marking tools (`MediaViewer`'s `editor`). */
  image: Partial<ImageEditorLabels>
  jumpToEnd: string
  /**
   * The viewers' words: their bars' (`ViewerLabels`) and each kind's.
   * `back`, `forward`, `imageFailed` and `jumpToEnd` above are theirs too.
   */
  viewers: Partial<ViewerLabels> & {
    files?: Partial<FilesViewerLabels> | undefined
    /** Images, video and audio: `MediaViewer`'s. */
    media?: Partial<MediaViewerLabels> | undefined
    pdf?: Partial<PdfViewerLabels> | undefined
    table?: Partial<TableViewerLabels> | undefined
    terminal?: Partial<TerminalViewerLabels> | undefined
    code?: Partial<CodePageLabels> | undefined
  }
  /** A tab's menu. */
  moveLeft: string
  moveRight: string
  /** To a new pane beside its own. */
  split: string
  moveToPane: (pane: number) => string
  closeTab: string
}

/** The words of a page of code or of a diff, in its viewer. */
type CodePageLabels = {
  /** A code page's `CodeViewer`'s own: find, wrap, fold, copy. */
  viewer?: Partial<CodeViewerLabels> | undefined
  /** Its lines wrapped, a button of the status bar. */
  wrap: string
  /** How long it is: "12 lines". */
  lines: (count: number) => string
  /** How many files a diff changes: "2 files". */
  files: (count: number) => string
  /** What a diff adds and removes: "+3 −1". */
  changes: (added: number, removed: number) => string
  /** A diff's other words: a renamed file's name, a binary file. */
  diff?: Partial<Omit<DiffLabels, "changes">> | undefined
}

const defaultCodeLabels: CodePageLabels = {
  wrap: "Wrap",
  lines: (count) => (count === 1 ? "1 line" : `${count} lines`),
  files: (count) => (count === 1 ? "1 file" : `${count} files`),
  changes: (added, removed) => `+${added} −${removed}`,
}

const defaultLabels: BrowserLabels = {
  ...defaultWebLabels,
  tabs: "Open pages",
  paneTabs: (pane) => `Open pages, pane ${pane}`,
  resizePanes: "Pane width",
  panes: (pane, of) => `Pane ${pane}/${of}`,
  back: "Back",
  forward: "Forward",
  reload: "Reload",
  address: "Address",
  addressPlaceholder: "Enter an address",
  nothingOpen: "Nothing open",
  nothingOpenHint: "Pages, files and output opened show here.",
  newTab: "New tab",
  suggested: "Suggested",
  recentPages: "Recent",
  imageFailed: "This image cannot be shown",
  image: {},
  jumpToEnd: "Jump to end",
  viewers: {},
  moveLeft: "Move left",
  moveRight: "Move right",
  split: "Move to a new pane",
  moveToPane: (pane) => `Move to pane ${pane}`,
  closeTab: "Close",
}

const icons: Record<BrowserContent["type"], React.ReactNode> = {
  web: <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />,
  image: <HugeiconsIcon icon={Image01Icon} strokeWidth={2} />,
  video: <HugeiconsIcon icon={Video01Icon} strokeWidth={2} />,
  audio: <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />,
  pdf: <HugeiconsIcon icon={Pdf01Icon} strokeWidth={2} />,
  table: <HugeiconsIcon icon={Csv01Icon} strokeWidth={2} />,
  code: <HugeiconsIcon icon={FileScriptIcon} strokeWidth={2} />,
  diff: <HugeiconsIcon icon={FileDiffIcon} strokeWidth={2} />,
  terminal: <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />,
  files: <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
  custom: <HugeiconsIcon icon={File01Icon} strokeWidth={2} />,
  start: <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />,
}

const pageIcon = (page: BrowserPage) => page.icon ?? icons[page.content.type]

/** A page shown in a viewer, with the viewer's toolbar, not the browser's. */
const inViewer = ({ content }: BrowserPage) => {
  switch (content.type) {
    case "image":
    case "video":
    case "audio":
    case "pdf":
    case "table":
    case "terminal":
    case "files":
    case "code":
    case "diff":
      return true
    default:
      return false
  }
}

/**
 * The folders on the way to a page, from where it is: "public/assets/
 * hero.png" is "public", "assets". Its own name (the page's title) is not
 * one; nor is a URL's.
 */
function pathOf(page: BrowserPage): ViewerPathSegment[] {
  const location = page.location
  if (!location || /^[a-z][a-z\d+.-]*:/i.test(location)) return []
  const segments = location.split("/").filter(Boolean)
  if (segments.at(-1) === page.title) segments.pop()
  return segments.map((label) => ({ label }))
}

/** A host and its port, as "localhost:5173/pricing": not a scheme. */
const hostAndPort = /^[^\s/:?#]+:\d+(?:[/?#]|$)/
const scheme = /^[a-z][a-z\d+.-]*:/i

/**
 * A machine's own or its network's, served over http: localhost (and
 * `*.localhost`), `*.local`, an IP address, a name of one word.
 */
function local(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.startsWith("[") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ||
    !hostname.includes(".")
  )
}

/**
 * The `Browser`'s default `resolveAddress`: an http or https URL as a
 * web page. Without a scheme, "http://" for a local address
 * ("localhost:5173", "127.0.0.1:3000", "devbox:8080"), else "https://"
 * ("example.com"); any other scheme ("javascript:", "file:") is none.
 * An app's own resolver can fall back to it.
 */
function resolveWebAddress(address: string): BrowserPage | undefined {
  const text = address.trim()
  if (!text) return undefined
  try {
    const written = scheme.test(text) && !hostAndPort.test(text)
    const url = new URL(written ? text : `https://${text}`)
    if (!written && local(url.hostname)) url.protocol = "http:"
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return {
      id: url.href,
      title: url.host,
      location: url.href,
      content: { type: "web", url: url.href },
    }
  } catch {
    return undefined
  }
}

/** The type of a tab dragged within a browser. */
const tabType = "application/x-agent-ui-browser-tab"

/** Where a dragged tab would go: a place among tabs, or beside a pane. */
type Drop =
  | { pane: string; index: number }
  | { pane: string; side: "start" | "end" | "center" }

type BrowserContextValue = {
  browser: ReturnType<typeof useBrowser>
  panes: Pane[]
  labels: BrowserLabels
  /** The tab dragged, if one is. */
  dragged: string | null
  setDragged: (tab: string | null) => void
  drop: Drop | null
  setDrop: (drop: Drop | null) => void
  /** Focuses a tab once it is rendered where it moved. */
  refocus: (tab: string) => void
  /** The reader is in a pane, by focus or pointer. */
  enter: (pane: string) => void
  /** The page an address goes to, if any: typed, or a recent one. */
  resolveAddress: (address: string) => BrowserPage | undefined
  /** Loads a tab's page again, and tells the app. */
  reload: (tab: string) => void
  onMarkImage:
    | ((
        page: BrowserPage,
        marks: ImageMark[],
        size: ImageSize
      ) => Promise<void> | void)
    | undefined
  /** How the reader looks at the web page in a tab. */
  webView: (tab: string) => BrowserWebView
  setWebView: (
    tab: string,
    page: BrowserPage,
    change: Partial<BrowserWebView>
  ) => void
  web: BrowserWebProps
  start: BrowserStart | undefined
  /** Where its bars go, if not in it: a titlebar's row over it. */
  barContainer: HTMLElement | null
  /** Opens a new tab at the `start`, its address focused. */
  openStart: (() => void) | undefined
  viewer: BrowserViewerProps & {
    pageActions: ((page: BrowserPage) => React.ReactNode) | undefined
  }
}

/** What the app does with pages shown in a viewer. */
type BrowserViewerProps = {
  /**
   * "@" in a viewer's toolbar: the page, or a part of it (a table's cell
   * picked, a terminal's output, a file picked in a folder) to the chat.
   * No "@" without it.
   */
  onAddToChat?:
    ((page: BrowserPage, part?: BrowserChatPart) => void) | undefined
  /** The more menu of a viewer's toolbar: the app's `DropdownMenuItem`s. */
  pageMenu?: ((page: BrowserPage) => React.ReactNode) | undefined
  /** A terminal page's new terminal (its "+"). */
  onNewTerminal?: ((page: BrowserPage) => void) | undefined
  /** Stops a terminal page's process (only while it runs). */
  onStopTerminal?:
    ((page: BrowserPage, session: TerminalSession) => void) | undefined
  /** Clears a terminal page's output. */
  onClearTerminal?:
    ((page: BrowserPage, session: TerminalSession) => void) | undefined
}

/** What the app does with web pages: the reader's picks, the agent. */
type BrowserWebProps = {
  /**
   * The element at a point of a web page, in its CSS pixels: for a
   * picture of it, or a frame of another origin, whose document the
   * browser cannot read. By default the frame's own.
   */
  inspectElement?:
    | ((
        page: BrowserPage,
        point: { x: number; y: number }
      ) => BrowserElement | undefined | Promise<BrowserElement | undefined>)
    | undefined
  /**
   * An element the reader pointed at, with what to do with it: e.g. to
   * add to the chat, with its screenshot where the reader asked for one.
   * Without it, there is no picking.
   */
  onPickElement?:
    | ((
        page: BrowserPage,
        element: BrowserElement,
        request: string,
        options: BrowserPickOptions
      ) => void)
    | undefined
  /** The reader takes the page back from the agent: e.g. stop it. */
  onTakeOver?: ((page: BrowserPage) => void) | undefined
  /** A console's error the reader gives the agent. */
  onAskAgent?:
    ((page: BrowserPage, message: BrowserConsoleMessage) => void) | undefined
  /**
   * The Network tab's Refresh: the app reads the page's requests again
   * (e.g. from a remote browser) and gives them in its `network`. Without
   * it, there is no Refresh.
   */
  onRefreshNetwork?: ((page: BrowserPage) => void) | undefined
  /**
   * The reader's input on a web page the app gives as `remote` (a remote
   * browser's frames), in the page's CSS pixels, for the app to send to
   * that browser: pointer, wheel, keys, an input method's composition,
   * text, paste, the page's room (to size its viewport to), and the
   * answers to its select popups and dialogs.
   */
  onRemoteInput?:
    ((page: BrowserPage, input: BrowserRemoteInput) => void) | undefined
  /** A remote page's selected text, read for a copy (⌘C, Ctrl+C). */
  copyRemoteSelection?:
    ((page: BrowserPage) => Promise<string | undefined>) | undefined
  /**
   * A key the app keeps for itself while a remote page has the keys
   * (its shortcuts): true, and it is not sent to the page.
   */
  remoteShortcut?: ((event: KeyboardEvent) => boolean) | undefined
  /**
   * A web page's view changed by the reader (its device, rotation, dark
   * scheme, console, picking): e.g. to apply the dark scheme to a remote
   * browser, which a frame's `colorScheme` cannot reach.
   */
  onWebViewChange?:
    ((page: BrowserPage, view: BrowserWebView) => void) | undefined
  /** Where nothing runs at a web page's address: e.g. a button to start it. */
  notRunningActions?: ((page: BrowserPage) => React.ReactNode) | undefined
  /** Addresses to go to where nothing runs, e.g. those visited. */
  recent?: BrowserRecent[] | undefined
}

/** Something to do from a new tab, as a card: e.g. open a terminal. */
type BrowserStartAction = {
  id: string
  label: string
  icon?: React.ReactNode
  /** Its keys, shown at its end: "⌘P". */
  shortcut?: string | undefined
  onSelect: () => void
}

/** A page to go to from a new tab: in its tab, back returning. */
type BrowserStartLink = {
  page: BrowserPage
  /** Under its title, in the recent: what it is, where. */
  description?: React.ReactNode
  /** At a recent row's end: when it was. */
  time?: React.ReactNode
}

/**
 * A new tab's page, and the browser's with nothing open: the app's things
 * to do, places to go and recent pages, under an address bar.
 */
type BrowserStart = {
  actions?: readonly BrowserStartAction[] | undefined
  /** As tiles: an icon over a title. */
  suggested?: readonly BrowserStartLink[] | undefined
  /** As rows, newest first. */
  recent?: readonly BrowserStartLink[] | undefined
}

const BrowserContext = React.createContext<BrowserContextValue | null>(null)

/**
 * Pages in tabs, as a browser has: web pages, code, diffs, or the app's
 * own; images, video, audio, PDFs, tables, terminals and folders in their
 * viewers; each tab goes back and forward through what was opened in it,
 * a viewer's back and forward its own. The app opens
 * pages with `useBrowser`'s `open` (a new tab) or `navigate` (in the tab
 * shown). Its bar is as tall as the app's header, or in `barContainer`
 * (a titlebar's row); `actions` go at its end, e.g. closing the panel it
 * is in. The reader drags tabs to reorder them,
 * to another pane, or beside one to split the browser; a tab's menu does
 * the same.
 */
function Browser({
  browser,
  actions,
  barContainer = null,
  pageActions,
  onOpenFile,
  resolveAddress = resolveWebAddress,
  onReload,
  onMarkImage,
  inspectElement,
  onPickElement,
  onTakeOver,
  onAskAgent,
  onRefreshNetwork,
  onRemoteInput,
  copyRemoteSelection,
  remoteShortcut,
  onWebViewChange,
  notRunningActions,
  recent,
  start,
  onAddToChat,
  pageMenu,
  onNewTerminal,
  onStopTerminal,
  onClearTerminal,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  BrowserWebProps &
  BrowserViewerProps & {
    /** `useBrowser()`. */
    browser: ReturnType<typeof useBrowser>
    /** At the end of its bar. */
    actions?: React.ReactNode
    /**
     * Where its bar goes, if not in it: e.g. an `AgentApp`'s titlebar's
     * row over the panel it is in (`useAgentAppPanelBar()`). Each pane's
     * bar over its pane, as wide; the element is positioned.
     */
    barContainer?: HTMLElement | null | undefined
    /** The app's buttons for the page shown, in its toolbar. */
    pageActions?: ((page: BrowserPage) => React.ReactNode) | undefined
    /**
     * A file picked in a `files` page: e.g. load it, then `navigate` to it,
     * or `open` it where a new tab was asked for (⌘ or Ctrl, a middle click).
     */
    onOpenFile?:
      ((file: BrowserFile, options: { newTab: boolean }) => void) | undefined
    /**
     * The page an address goes to, if any: typed in a web page's bar, or
     * a `recent` one picked. By default `resolveWebAddress`, an http or
     * https URL.
     */
    resolveAddress?: (address: string) => BrowserPage | undefined
    /**
     * The reader loads a page again: its Reload, or a page that did not
     * load (its content's `error`) by Retry. E.g. clear the `error` and
     * look again; set it again if it still fails.
     */
    onReload?: ((page: BrowserPage) => void) | undefined
    /**
     * Areas marked on a `markable` image, sent by the reader: e.g. to ask a
     * model to change them (`markImages` makes the mask).
     */
    onMarkImage?:
      | ((
          page: BrowserPage,
          marks: ImageMark[],
          size: ImageSize
        ) => Promise<void> | void)
      | undefined
    /**
     * A new tab's page: the app's things to do, places and recent pages.
     * With it, a "+" after the tabs opens one, and with nothing open the
     * browser shows it, not "Nothing open".
     */
    start?: BrowserStart | undefined
    labels?: Partial<BrowserLabels>
  }) {
  const labels = { ...defaultLabels, ...labelsProp }
  const { panes, focused } = panesOf(browser.state)
  // Reloading a page renders it again: a web page loads again.
  const [loads, setLoads] = React.useState<Record<string, number>>({})
  // Going back to a page shows it as the reader left it: its directories
  // open. By tab and place in its history.
  const [opened] = React.useState(() => new Map<string, FilesPlace>())
  const [dragged, setDragged] = React.useState<string | null>(null)
  const [drop, setDrop] = React.useState<Drop | null>(null)
  // By tab: its device, console and picking stay as it is gone through.
  const [webViews, setWebViews] = React.useState<
    Record<string, BrowserWebView>
  >({})
  const root = React.useRef<HTMLDivElement>(null)
  // Too narrow for its panes side by side, e.g. in a phone's sheet: the
  // one the reader is in, and a button to go to the others.
  const [width, setWidth] = React.useState<number>()
  React.useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const observer = new ResizeObserver(() => setWidth(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const stacked =
    panes.length > 1 && width !== undefined && width < panes.length * paneWidth
  // Once it is rendered where it moved, e.g. in another pane.
  // By its id as it is, which may be a path: no selector to escape.
  const refocus = (tab: string) =>
    requestAnimationFrame(() =>
      [root.current, barContainer]
        .flatMap((element) =>
          Array.from(
            element?.querySelectorAll<HTMLElement>("[data-browser-tab]") ?? []
          )
        )
        .find((trigger) => trigger.dataset.browserTab === tab)
        ?.focus()
    )

  const shownId = (panes.find((pane) => pane.id === focused) ?? panes[0])?.id
  // Narrower than it was rendered, its panes not yet one at a time (e.g.
  // just moved into a phone's sheet, which focuses its first): a pane
  // that is to be hidden does not become the one shown.
  const enter = (pane: string) => {
    const now = root.current?.clientWidth
    if (
      pane !== shownId &&
      panes.length > 1 &&
      now !== undefined &&
      now < panes.length * paneWidth
    )
      return
    browser.focus(pane)
  }

  // A new tab's page: an id no open page has, as opening one goes to it.
  const openStart = start
    ? () => {
        const ids = new Set(
          panes.flatMap((pane) =>
            pane.tabs.flatMap((tab) => tab.pages.map((page) => page.id))
          )
        )
        let number = 1
        while (ids.has(`browser-start-${number}`)) number++
        browser.open({
          id: `browser-start-${number}`,
          title: labels.newTab,
          content: { type: "start" },
        })
      }
    : undefined

  const reload = (tab: string) => {
    const at = find({ panes, focused }, tab)
    setLoads((loads) => ({ ...loads, [tab]: (loads[tab] ?? 0) + 1 }))
    if (at) onReload?.(current(at.tab))
  }

  const context: BrowserContextValue = {
    browser,
    panes,
    labels,
    enter,
    resolveAddress,
    reload,
    dragged,
    setDragged,
    drop,
    setDrop,
    refocus,
    onMarkImage,
    webView: (tab) => webViews[tab] ?? defaultWebView,
    setWebView: (tab, page, change) => {
      const next = { ...(webViews[tab] ?? defaultWebView), ...change }
      setWebViews((views) => ({ ...views, [tab]: next }))
      onWebViewChange?.(page, next)
    },
    web: {
      inspectElement,
      onPickElement,
      onTakeOver,
      onAskAgent,
      onRefreshNetwork,
      onRemoteInput,
      copyRemoteSelection,
      remoteShortcut,
      notRunningActions,
      recent,
    },
    start,
    barContainer,
    openStart,
    viewer: {
      pageActions,
      onAddToChat,
      pageMenu,
      onNewTerminal,
      onStopTerminal,
      onClearTerminal,
    },
  }

  return (
    <BrowserContext value={context}>
      <div
        ref={root}
        data-slot="browser"
        className={cn("flex h-full min-h-0 flex-col", className)}
        {...props}
      >
        {panes.length === 0 ? (
          <>
            {/* No tabs: a bar only for the app's actions, no line under
                it over the empty page. */}
            {actions &&
              (barContainer ? (
                createPortal(
                  <div
                    data-slot="browser-bar"
                    className="absolute inset-0 flex items-center justify-end gap-1 ps-2 pe-3"
                  >
                    {actions}
                  </div>,
                  barContainer
                )
              ) : (
                <div
                  data-slot="browser-bar"
                  className="flex h-12 shrink-0 items-center justify-end gap-1 ps-2 pe-3 pointer-coarse:h-13 sm:pointer-coarse:pe-1"
                >
                  {actions}
                </div>
              ))}
            {start ? (
              <StartPage />
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon
                      icon={DashboardSquare01Icon}
                      strokeWidth={2}
                    />
                  </EmptyMedia>
                  <EmptyTitle>{labels.nothingOpen}</EmptyTitle>
                  <EmptyDescription>{labels.nothingOpenHint}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </>
        ) : (
          (() => {
            const paneOf = (pane: Pane, index: number, last: boolean) => (
              <BrowserPane
                pane={pane}
                number={index + 1}
                focused={pane.id === focused}
                actions={
                  last ? (
                    <>
                      {stacked && (
                        <PaneSwitcher shown={pane} number={index + 1} />
                      )}
                      {actions}
                    </>
                  ) : undefined
                }
                loads={loads}
                opened={opened}
                pageActions={pageActions}
                onOpenFile={onOpenFile}
              />
            )
            // One at a time, the others hidden, not unmounted: a web page,
            // or the app's, stays as the reader left it.
            const shown = stacked
              ? (panes.find((pane) => pane.id === focused) ?? panes[0]!)
              : undefined
            return (
              <ResizablePanelGroup
                // The others hidden while one at a time: it fills the rest.
                className="min-h-0 flex-1 *:data-[stacked=hidden]:hidden!"
              >
                {panes.map((pane, index) => (
                  <React.Fragment key={pane.id}>
                    {index > 0 && (
                      <ResizableHandle
                        aria-label={labels.resizePanes}
                        className={stacked ? "hidden" : undefined}
                      />
                    )}
                    <ResizablePanel
                      id={pane.id}
                      minSize={160}
                      data-stacked={
                        shown
                          ? pane === shown
                            ? "shown"
                            : "hidden"
                          : undefined
                      }
                    >
                      <div
                        className="contents"
                        inert={shown !== undefined && pane !== shown}
                      >
                        {paneOf(
                          pane,
                          index,
                          shown ? pane === shown : index === panes.length - 1
                        )}
                      </div>
                    </ResizablePanel>
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            )
          })()
        )}
      </div>
    </BrowserContext>
  )
}

// The fade at an edge of the tabs with more beyond it, in pixels (2rem).
const tabsFade = 32

/**
 * A row of tabs that scrolls: which edges have more beyond them, and the
 * active tab scrolled into view clear of the fade, so that the tab beside
 * it shows faded, not cut to a sliver.
 */
function useTabsScroll(active: string | undefined) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [more, setMore] = React.useState({ left: false, right: false })
  const measure = React.useCallback(() => {
    const list = ref.current
    if (!list) return
    const max = list.scrollWidth - list.clientWidth
    // Right to left, scrollLeft is 0 at the start and negative past it.
    const rtl = getComputedStyle(list).direction === "rtl"
    const left = rtl ? max + list.scrollLeft : list.scrollLeft
    const next = { left: left > 1, right: max - left > 1 }
    setMore((more) =>
      more.left === next.left && more.right === next.right ? more : next
    )
  }, [])
  // Tabs opened or closed change what it holds, not its size.
  React.useLayoutEffect(measure)
  React.useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [measure])
  React.useLayoutEffect(() => {
    const list = ref.current
    // By its id as it is, which may be a path: no selector to escape.
    const tab = Array.from(
      list?.querySelectorAll<HTMLElement>("[data-browser-tab]") ?? []
    ).find((trigger) => trigger.dataset.browserTab === active)
    if (!list || !tab) return
    const box = list.getBoundingClientRect()
    const at = tab.getBoundingClientRect()
    const room = Math.min(tabsFade, (box.width - at.width) / 2)
    if (at.left < box.left + room) list.scrollLeft -= box.left + room - at.left
    else if (at.right > box.right - room)
      list.scrollLeft += at.right - (box.right - room)
  }, [active])
  return { ref, more, measure }
}

/** Narrower than this, panes are not side by side but one at a time. */
const paneWidth = 288

/**
 * Where the panes are one at a time: which is shown ("1/2"), and a menu
 * to go to another.
 */
function PaneSwitcher({ shown, number }: { shown: Pane; number: number }) {
  const { browser, panes, labels } = React.useContext(BrowserContext)!
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={labels.panes(number, panes.length)}
                  className="tabular-nums"
                />
              }
            />
          }
        >
          <HugeiconsIcon icon={LayoutTwoColumnIcon} strokeWidth={2} />
          {number}/{panes.length}
        </TooltipTrigger>
        <TooltipContent>{labels.panes(number, panes.length)}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={shown.id}
          onValueChange={(pane) => browser.focus(pane as string)}
        >
          {panes.map((pane, index) => {
            const tab = pane.tabs.find((tab) => tab.id === pane.active)
            return (
              <DropdownMenuRadioItem key={pane.id} value={pane.id}>
                <span className="tabular-nums">{index + 1}</span>
                <span className="truncate">
                  {tab ? current(tab).title : null}
                </span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A pane: its tabs, the shown page's toolbar, and its pages. */
function BrowserPane({
  pane,
  number,
  focused,
  actions,
  loads,
  opened,
  pageActions,
  onOpenFile,
}: {
  pane: Pane
  number: number
  focused: boolean
  actions: React.ReactNode
  loads: Record<string, number>
  opened: Map<string, FilesPlace>
  pageActions: ((page: BrowserPage) => React.ReactNode) | undefined
  onOpenFile:
    ((file: BrowserFile, options: { newTab: boolean }) => void) | undefined
}) {
  const {
    browser,
    panes,
    labels,
    dragged,
    setDragged,
    drop,
    setDrop,
    enter,
    reload,
    openStart,
  } = React.useContext(BrowserContext)!
  const shown = pane.tabs.find((tab) => tab.id === pane.active)
  const tabs = useTabsScroll(shown?.id)
  // One card for the pane's tabs: from one to the next, it follows at once.
  const [card] = React.useState(() => PreviewCard.createHandle<BrowserTab>())
  const cardActions = React.useRef<PreviewCard.Root.Actions>(null)
  const from = dragged ? find({ panes, focused: null }, dragged) : undefined
  const end = () => {
    setDragged(null)
    setDrop(null)
  }

  /** Where among its tabs a tab dragged over them would go. */
  function place(event: React.DragEvent<HTMLElement>) {
    const list = event.currentTarget
    const rtl = getComputedStyle(list).direction === "rtl"
    const triggers = Array.from(
      list.querySelectorAll<HTMLElement>("[data-browser-tab]")
    )
    const index = triggers.findIndex((trigger) => {
      const { left, width } = trigger.getBoundingClientRect()
      const middle = left + width / 2
      return rtl ? event.clientX > middle : event.clientX < middle
    })
    return index < 0 ? triggers.length : index
  }

  /** Beside the pane, or in it, by where a dragged tab is over its pages. */
  function side(event: React.DragEvent<HTMLElement>) {
    const { left, width } = event.currentTarget.getBoundingClientRect()
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    const at = (event.clientX - left) / width
    const where = at < 1 / 3 ? "left" : at > 2 / 3 ? "right" : "center"
    const side =
      where === "center"
        ? "center"
        : (where === "left") !== rtl
          ? "start"
          : "end"
    // Where it is already.
    if (!from) return null
    if (side === "center" && from.pane.id === pane.id) return null
    if (side !== "center" && from.pane.id === pane.id && pane.tabs.length === 1)
      return null
    return side
  }

  const dropIndex =
    drop && drop.pane === pane.id && "index" in drop ? drop.index : null
  const dropSide =
    drop && drop.pane === pane.id && "side" in drop ? drop.side : null

  // In a bar of the app's (a titlebar's row): where its pane is under it.
  const { barContainer } = React.useContext(BrowserContext)!
  const paneRef = React.useRef<HTMLDivElement>(null)
  const [over, setOver] = React.useState({ left: 0, width: 0 })
  React.useLayoutEffect(() => {
    const element = paneRef.current
    if (!barContainer || !element) return
    const measure = () => {
      const pane = element.getBoundingClientRect()
      const row = barContainer.getBoundingClientRect()
      const next = {
        // From inside its border: where its positioned children start.
        left: Math.round(pane.left - row.left - barContainer.clientLeft),
        width: Math.round(pane.width),
      }
      setOver((over) =>
        over.left === next.left && over.width === next.width ? over : next
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    observer.observe(barContainer)
    return () => observer.disconnect()
  }, [barContainer])

  const barItems = (
    <>
      <TabsList
        aria-label={panes.length > 1 ? labels.paneTabs(number) : labels.tabs}
        ref={tabs.ref}
        onScroll={tabs.measure}
        data-more-left={tabs.more.left ? "" : undefined}
        data-more-right={tabs.more.right ? "" : undefined}
        // A browser's tabs, unboxed: each as wide as it may be, narrower
        // as more open, then scrolled sideways only (a close button's
        // touch area reaches past it), faded at an edge with more tabs
        // beyond it. Under a finger, 36px tall; across the bar on a
        // phone, in equal parts.
        className={cn(
          "max-w-full min-w-0 shrink justify-start gap-0.5 overflow-x-auto overflow-y-hidden rounded-none bg-transparent px-1 py-0 inset-ring-0 group-data-horizontal/tabs:h-9 data-more-left:mask-l-from-[calc(100%-2rem)] data-more-right:mask-r-from-[calc(100%-2rem)] pointer-coarse:group-data-horizontal/tabs:h-9 max-sm:pointer-coarse:grid max-sm:pointer-coarse:grow max-sm:pointer-coarse:auto-cols-fr max-sm:pointer-coarse:grid-flow-col",
          // A titlebar's: a gap between the pieces.
          barContainer && "gap-1"
        )}
        onDragOver={(event) => {
          if (!dragged || !event.dataTransfer.types.includes(tabType)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = "move"
          const index = place(event)
          if (dropIndex !== index) setDrop({ pane: pane.id, index })
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return
          if (dropIndex !== null) setDrop(null)
        }}
        onDrop={(event) => {
          if (!dragged) return
          event.preventDefault()
          browser.move(dragged, { pane: pane.id, index: place(event) })
          end()
        }}
      >
        {pane.tabs.map((tab, index) => (
          <BrowserTabTrigger
            key={tab.id}
            tab={tab}
            pane={pane}
            index={index}
            card={card}
            closeCard={() => cardActions.current?.close()}
            drop={
              dropIndex === index
                ? "before"
                : dropIndex === pane.tabs.length &&
                    index === pane.tabs.length - 1
                  ? "after"
                  : undefined
            }
          />
        ))}
      </TabsList>
      {openStart && (
        <BrowserToolbarButton
          label={labels.newTab}
          onClick={openStart}
          className="shrink-0"
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
        </BrowserToolbarButton>
      )}
      <div className="ms-auto flex shrink-0 items-center gap-1">{actions}</div>
      <HoverCard
        handle={card}
        actionsRef={cardActions}
        // By the pointer only: the keyboard's tab says its title, and
        // its page's address bar where it is.
        onOpenChange={(open, details) => {
          if (open && details.reason === "trigger-focus") details.cancel()
        }}
      >
        {({ payload }) =>
          payload ? <TabCard page={current(payload as BrowserTab)} /> : null
        }
      </HoverCard>
    </>
  )

  return (
    <Tabs
      ref={paneRef}
      data-slot="browser-pane"
      data-focused={focused ? "" : undefined}
      value={shown?.id ?? null}
      onValueChange={(tab) => browser.select(tab as string)}
      onFocusCapture={() => enter(pane.id)}
      onPointerDownCapture={() => enter(pane.id)}
      className="h-full min-h-0 gap-0"
    >
      {barContainer ? (
        createPortal(
          <div
            data-slot="browser-bar"
            // Over its pane, as wide: the titlebar's row its height.
            className="absolute inset-y-0 flex items-center gap-1 ps-2 pe-3"
            style={{ left: over.left, width: over.width }}
            hidden={over.width === 0}
          >
            {barItems}
          </div>,
          barContainer
        )
      ) : (
        <div
          data-slot="browser-bar"
          // Its first tab and its last button on the toolbar's lines, 12px
          // in (the tabs' own 4px after its 8px). Under a finger from
          // 640px, its 44px buttons 4px from the end, as the main area's
          // header's.
          className="flex h-12 shrink-0 items-center gap-1 ps-2 pe-3 pointer-coarse:h-13 sm:pointer-coarse:pe-1"
        >
          {barItems}
        </div>
      )}
      {shown &&
        current(shown).toolbar !== false &&
        !inViewer(current(shown)) && (
          <PageToolbar
            key={`${shown.id}:${current(shown).id}`}
            tab={shown}
            browser={browser}
            onReload={() => reload(shown.id)}
            pageActions={pageActions}
            labels={labels}
          />
        )}
      <div
        data-slot="browser-pages"
        className="relative flex min-h-0 flex-1 flex-col"
      >
        {pane.tabs.map((tab) => (
          // Kept while hidden: a web page stays as the reader left it.
          <TabsContent
            key={tab.id}
            value={tab.id}
            keepMounted
            data-slot="browser-page"
            // A viewer fills it, and scrolls its own content.
            data-viewer={inViewer(current(tab)) ? "" : undefined}
            className="min-h-0 overflow-auto data-hidden:hidden data-viewer:flex data-viewer:flex-col data-viewer:overflow-hidden"
          >
            <BrowserView
              key={`${current(tab).id}:${loads[tab.id] ?? 0}`}
              tab={tab}
              page={current(tab)}
              opened={entry(
                opened,
                `${tab.id}:${tab.index}:${current(tab).id}`
              )}
              onOpenFile={onOpenFile}
              labels={labels}
            />
          </TabsContent>
        ))}
        {/* Over the pages while a tab is dragged, a web page's too, which
            would take the drag. */}
        {dragged && (
          <div
            data-slot="browser-drop"
            className="absolute inset-0 z-10"
            onDragOver={(event) => {
              const where = side(event)
              if (!where) {
                if (dropSide) setDrop(null)
                return
              }
              event.preventDefault()
              event.dataTransfer.dropEffect = "move"
              if (dropSide !== where) setDrop({ pane: pane.id, side: where })
            }}
            onDragLeave={() => {
              if (dropSide) setDrop(null)
            }}
            onDrop={(event) => {
              const where = side(event)
              if (!where) return
              event.preventDefault()
              if (where === "center")
                browser.move(dragged, {
                  pane: pane.id,
                  index: pane.tabs.length,
                })
              else browser.split(dragged, { side: where, beside: pane.id })
              end()
            }}
          >
            {dropSide && (
              // Dashed: it shows in forced colors too.
              <div
                data-side={dropSide}
                className="pointer-events-none absolute inset-y-1 rounded-md border-2 border-dashed border-ring bg-ring/10 data-[side=center]:inset-x-1 data-[side=end]:end-1 data-[side=end]:w-1/2 data-[side=start]:start-1 data-[side=start]:w-1/2"
              />
            )}
          </div>
        )}
      </div>
    </Tabs>
  )
}

/**
 * A tab's card, as the pointer rests on it: its page's title and where it
 * is, whole, and the page's `preview`.
 */
function TabCard({ page }: { page: BrowserPage }) {
  const location =
    page.location ??
    (page.content.type === "web" ? page.content.url : undefined)
  return (
    <HoverCardContent
      data-slot="browser-tab-card"
      align="start"
      alignOffset={0}
      sideOffset={6}
      className="flex w-72 flex-col gap-3 p-3"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-medium break-words">{page.title}</p>
        {location && (
          <p className="text-xs break-all text-muted-foreground">{location}</p>
        )}
      </div>
      {page.preview}
    </HoverCardContent>
  )
}

/**
 * A tab: its page's icon and title; Delete, a middle click or its × close
 * it. Dragged, or by its menu or Ctrl+Shift+PageUp and PageDown, it moves;
 * Ctrl+\ moves it to a new pane. The pointer resting on it, its card; a
 * new tab has none, its title all it would say.
 */
function BrowserTabTrigger({
  tab,
  pane,
  index,
  drop,
  card,
  closeCard,
}: {
  tab: BrowserTab
  pane: Pane
  index: number
  /** Where a dragged tab would go: before it, or after the last. */
  drop: "before" | "after" | undefined
  /** Its pane's card, and closing it, e.g. as the tab is dragged. */
  card: PreviewCard.Handle<BrowserTab>
  closeCard: () => void
}) {
  const { browser, panes, labels, setDragged, setDrop, refocus, barContainer } =
    React.useContext(BrowserContext)!
  // In a titlebar's row, on its frame: each tab a solid piece of its own.
  const inTitlebar = !!barContainer
  const page = current(tab)
  const number = panes.indexOf(pane)
  const previous = panes[number - 1]
  const next = panes[number + 1]
  const move = (to: { pane: string; index: number }) => {
    browser.move(tab.id, to)
    refocus(tab.id)
  }
  // Back and forward through its pane, then into the one beside.
  const moveLeft =
    index > 0
      ? () => move({ pane: pane.id, index: index - 1 })
      : previous
        ? () => move({ pane: previous.id, index: previous.tabs.length })
        : undefined
  const moveRight =
    index < pane.tabs.length - 1
      ? () => move({ pane: pane.id, index: index + 2 })
      : next
        ? () => move({ pane: next.id, index: 0 })
        : undefined
  const split =
    pane.tabs.length > 1
      ? () => {
          browser.split(tab.id)
          refocus(tab.id)
        }
      : undefined

  const withCard = (trigger: React.ReactElement) =>
    page.content.type === "start" ? (
      trigger
    ) : (
      <PreviewCard.Trigger handle={card} payload={tab} render={trigger} />
    )

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) closeCard()
      }}
    >
      <ContextMenuTrigger
        render={withCard(
          <TabsTrigger
            value={tab.id}
            data-browser-tab={tab.id}
            data-pinned={tab.pinned ? "" : undefined}
            data-drop-before={drop === "before" ? "" : undefined}
            data-drop-after={drop === "after" ? "" : undefined}
            // A pinned tab is not closed with Delete.
            aria-keyshortcuts={
              tab.pinned
                ? "Control+Shift+PageUp Control+Shift+PageDown Control+\\"
                : "Delete Control+Shift+PageUp Control+Shift+PageDown Control+\\"
            }
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(tabType, tab.id)
              if (page.location)
                event.dataTransfer.setData("text/plain", page.location)
              event.dataTransfer.effectAllowed = "move"
              closeCard()
              setDragged(tab.id)
            }}
            onDragEnd={() => {
              setDragged(null)
              setDrop(null)
            }}
            onKeyDown={(event) => {
              const command = event.ctrlKey && !event.altKey && !event.metaKey
              const act =
                (event.key === "Delete" || event.key === "Backspace") &&
                !tab.pinned
                  ? () => browser.close(tab.id)
                  : command && event.shiftKey && event.key === "PageUp"
                    ? moveLeft
                    : command && event.shiftKey && event.key === "PageDown"
                      ? moveRight
                      : command && event.key === "\\"
                        ? split
                        : undefined
              if (!act) return
              event.preventDefault()
              act()
            }}
            onAuxClick={(event) => {
              if (event.button === 1 && !tab.pinned) browser.close(tab.id)
            }}
            // Under a finger, the tabs share the bar, 32px tall; on a
            // phone, its 15px.
            // A browser's tab: as wide as 13rem, narrower as more open, to
            // 7rem; filled where it is the one shown, or pointed at. A
            // pinned one as wide as its name. Under a finger, 32px tall;
            // across the bar on a phone, its 15px, in equal parts.
            className={cn(
              "group/browser-tab h-8 w-52 min-w-28 flex-initial justify-start gap-2 rounded-lg ps-3 pe-1 text-2sm text-muted-foreground before:pointer-events-none before:absolute before:inset-y-1 before:w-0.5 before:rounded-full before:bg-ring before:opacity-0 hover:bg-muted/60 data-drop-after:before:-end-0.5 data-drop-after:before:opacity-100 data-drop-before:before:-start-0.5 data-drop-before:before:opacity-100 data-pinned:w-auto data-pinned:min-w-0 data-pinned:shrink-0 data-pinned:pe-3 max-sm:gap-1 max-sm:px-1 max-sm:text-md max-sm:data-pinned:px-1 pointer-coarse:h-8 max-sm:pointer-coarse:w-auto max-sm:pointer-coarse:min-w-0 max-sm:pointer-coarse:justify-center data-active:bg-muted group-data-[variant=default]/tabs-list:data-active:shadow-none dark:data-active:bg-muted",
              // On a titlebar's frame, as a desktop browser's: the one
              // shown a solid piece of the panel's colour, its name the
              // foreground's; the others bare, a thin line between two
              // (none by the one shown), a piece of their own under the
              // pointer. Dark, where the panel is hardly lighter than
              // the frame, the one shown a step lighter.
              inTitlebar &&
                "w-60 text-foreground/70 hover:bg-foreground/5 last:*:data-[slot=browser-tab-line]:hidden hover:*:data-[slot=browser-tab-line]:hidden data-active:bg-background data-active:text-foreground data-active:*:data-[slot=browser-tab-line]:hidden dark:data-active:bg-foreground/15 [&:has(+:hover)>[data-slot=browser-tab-line]]:hidden [&:has(+[data-active])>[data-slot=browser-tab-line]]:hidden"
            )}
          />
        )}
      >
        {/* Its page's icon, grey but on the tab shown; not on a phone,
            where the tabs share the bar. */}
        <span
          aria-hidden="true"
          data-slot="browser-tab-icon"
          className="flex shrink-0 text-muted-foreground group-data-active/browser-tab:text-foreground max-sm:pointer-coarse:hidden"
        >
          {pageIcon(page)}
        </span>
        {/* Where it is, on hover: its viewer names it no more. */}
        <span
          title={page.location}
          className="min-w-0 truncate group-not-data-pinned/browser-tab:flex-1 group-not-data-pinned/browser-tab:text-start max-sm:pointer-coarse:flex-none"
        >
          {page.title}
        </span>
        {page.count !== undefined && (
          <>
            {" "}
            <span
              data-slot="browser-tab-count"
              className="text-2xs font-normal text-subtle-foreground tabular-nums"
            >
              {page.count}
            </span>
          </>
        )}
        {/* On a titlebar's frame, a thin line between two tabs, none by
            the one shown or under the pointer. */}
        {inTitlebar && (
          <span
            aria-hidden="true"
            data-slot="browser-tab-line"
            className="pointer-events-none absolute inset-y-2 -end-0.5 w-px bg-border"
          />
        )}
        {/* For the pointer; the keyboard has Delete. A button inside a tab
            would be a control in a control. Seen on the tab shown, or
            under the pointer, its place the title's till then; always
            under a finger. */}
        {!tab.pinned && (
          <span
            aria-hidden="true"
            data-slot="browser-tab-close"
            // Under a finger, its place as wide as one (as tall as the tabs).
            className={cn(
              "relative flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-3",
              // Always on a titlebar's tabs, each a piece of its own.
              !inTitlebar &&
                "group-not-data-active/browser-tab:not-group-hover/browser-tab:pointer-fine:hidden"
            )}
            onClick={(event) => {
              event.stopPropagation()
              browser.close(tab.id)
            }}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
          </span>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={!moveLeft} onClick={moveLeft}>
          {labels.moveLeft}
          <ContextMenuShortcut>Ctrl+Shift+PgUp</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!moveRight} onClick={moveRight}>
          {labels.moveRight}
          <ContextMenuShortcut>Ctrl+Shift+PgDn</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!split} onClick={split}>
          {labels.split}
          <ContextMenuShortcut>Ctrl+\</ContextMenuShortcut>
        </ContextMenuItem>
        {panes.length > 1 &&
          panes.map((other, number) =>
            other === pane ? null : (
              <ContextMenuItem
                key={other.id}
                onClick={() =>
                  move({ pane: other.id, index: other.tabs.length })
                }
              >
                {labels.moveToPane(number + 1)}
              </ContextMenuItem>
            )
          )}
        {!tab.pinned && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => browser.close(tab.id)}>
              {labels.closeTab}
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

/**
 * A toolbar under the tabs, for a page with its own (`toolbar: false`):
 * the browser's look, its buttons `BrowserToolbarButton`s and its address
 * an `InputGroup`.
 */
function BrowserToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ViewerToolbar
      data-slot="browser-toolbar"
      className={cn("border-b", className)}
      {...props}
    />
  )
}

/**
 * A button of a toolbar: an icon, named by its tooltip. A viewer's tool,
 * grey as theirs: a page's bar looks as a file's.
 */
const BrowserToolbarButton = ViewerTool

/**
 * An address as read: "localhost:5173/pricing", no scheme, its host grey
 * and its path the foreground's. Over the address bar's field while it
 * is not focused.
 */
function AddressText({ address }: { address: string }) {
  const url = /^[a-z][a-z\d+.-]*:\/\/([^/?#]*)(.*)$/i.exec(address)
  const path = url && url[2] !== "/" ? url[2] : ""
  return (
    <span
      aria-hidden="true"
      data-slot="browser-address-text"
      className="pointer-events-none col-start-1 row-start-1 min-w-0 self-center truncate px-2 text-foreground peer-focus:invisible"
    >
      {url ? (
        <>
          <span className="text-muted-foreground">{url[1]}</span>
          {path}
        </>
      ) : (
        address
      )}
    </span>
  )
}

function PageToolbar({
  tab,
  browser,
  onReload,
  pageActions,
  labels,
}: {
  tab: BrowserTab
  browser: ReturnType<typeof useBrowser>
  onReload: () => void
  pageActions: ((page: BrowserPage) => React.ReactNode) | undefined
  labels: BrowserLabels
}) {
  const {
    webView,
    setWebView,
    resolveAddress,
    web: webProps,
  } = React.useContext(BrowserContext)!
  const page = current(tab)
  const web = page.content.type === "web" ? page.content : undefined
  // A new tab's address bar is empty, to type where to go.
  const fresh = page.content.type === "start"
  const location = fresh ? "" : (page.location ?? web?.url ?? page.title)
  const [address, setAddress] = React.useState(location)
  const editable = web !== undefined || fresh
  // The address ringed only where the keyboard brought the focus: not a
  // click into it, nor a new tab's focusing it as it opens.
  const [keyboard, setKeyboard] = React.useState(false)
  const pointer = React.useRef(false)
  const opened = React.useRef(false)
  React.useEffect(() => {
    opened.current = true
  }, [])

  return (
    <BrowserToolbar>
      {/* Back, forward and reload: one island. */}
      <ViewerToolGroup data-browser-history="">
        <BrowserToolbarButton
          label={labels.back}
          disabled={tab.index === 0}
          onClick={() => browser.back(tab.id)}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </BrowserToolbarButton>
        <BrowserToolbarButton
          label={labels.forward}
          disabled={tab.index === tab.pages.length - 1}
          onClick={() => browser.forward(tab.id)}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
        </BrowserToolbarButton>
        {web && (
          <BrowserToolbarButton label={labels.reload} onClick={onReload}>
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
          </BrowserToolbarButton>
        )}
      </ViewerToolGroup>
      <form
        className="min-w-0 flex-1 px-1"
        onSubmit={(event) => {
          event.preventDefault()
          const next = resolveAddress(address)
          if (next) browser.navigate(next, tab.id)
        }}
      >
        <InputGroup
          data-slot="browser-address"
          data-keyboard={keyboard ? "" : undefined}
          // A pill, filled, no edge: as a browser's; a thin ring where the
          // keyboard brought the focus, none else.
          className="h-9 rounded-full border-transparent bg-muted px-1 shadow-none outline-ring has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0 data-keyboard:outline-1 data-keyboard:outline-solid dark:bg-muted"
          onPointerDown={() => (pointer.current = true)}
          onFocus={() => setKeyboard(opened.current && !pointer.current)}
          onBlur={() => {
            pointer.current = false
            setKeyboard(false)
          }}
        >
          {web ? (
            <BrowserAddressStatus
              running={web.running}
              icon={pageIcon(page)}
              labels={labels}
            />
          ) : (
            <InputGroupAddon>
              {fresh ? (
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
              ) : (
                pageIcon(page)
              )}
            </InputGroupAddon>
          )}
          {/* The address as written while it is edited; else shown as
              read, over it. */}
          <span className="grid min-w-0 flex-1 text-xs">
            <InputGroupInput
              aria-label={labels.address}
              placeholder={labels.addressPlaceholder}
              data-browser-address=""
              value={editable ? address : location}
              // Only a web page's address, or a new tab's, goes elsewhere
              // when changed.
              readOnly={!editable}
              // A new tab's, to type in at once.
              autoFocus={fresh}
              onChange={(event) => setAddress(event.target.value)}
              onFocus={(event) => event.target.select()}
              className="peer col-start-1 row-start-1 ps-2 text-xs not-focus:text-transparent"
            />
            <AddressText address={editable ? address : location} />
          </span>
        </InputGroup>
      </form>
      {web && (
        // The page's tools: an island of their own.
        <ViewerToolGroup>
          <BrowserWebTools
            content={web}
            view={webView(tab.id)}
            onViewChange={(change) => setWebView(tab.id, page, change)}
            pickable={
              webProps.onPickElement !== undefined &&
              ((web.screenshot === undefined && web.remote === undefined) ||
                webProps.inspectElement !== undefined)
            }
            labels={labels}
          />
        </ViewerToolGroup>
      )}
      {pageActions?.(page)}
    </BrowserToolbar>
  )
}

/**
 * A folder's place as the reader left it: its open folders, and the file
 * picked (one, or none).
 */
type FilesPlace = { expanded: Set<string>; picked: Set<string> }

function entry(map: Map<string, FilesPlace>, key: string) {
  let place = map.get(key)
  if (!place) map.set(key, (place = { expanded: new Set(), picked: new Set() }))
  return place
}

/** Its items, now these. */
function replace(set: Set<string>, items: Iterable<string>) {
  set.clear()
  for (const item of items) set.add(item)
}

// A start page's buttons: filled as the address bar on hover, ringed when
// focused by the keyboard.
const startButton =
  "rounded-xl outline-none motion-hover hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"

/**
 * A new tab's page, or the browser's with nothing open (`tab` none, an
 * address bar of its own over it): the `start`'s things to do as cards,
 * its places as tiles and its recent pages as rows. A page picked goes in
 * its tab, or a new one.
 */
function StartPage({ tab }: { tab?: string | undefined }) {
  const { browser, start, labels, resolveAddress } =
    React.useContext(BrowserContext)!
  const id = React.useId()
  const [address, setAddress] = React.useState("")
  const go = (page: BrowserPage) =>
    tab ? browser.navigate(page, tab) : browser.open(page)
  const { actions = [], suggested = [], recent = [] } = start ?? {}

  return (
    <div
      data-slot="browser-start"
      className="@container min-h-0 flex-1 overflow-auto"
    >
      <div className="mx-auto flex w-full max-w-column flex-col gap-8 px-4 py-12">
        {!tab && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const next = resolveAddress(address)
              if (next) go(next)
            }}
          >
            <InputGroup
              data-slot="browser-address"
              className="h-10 rounded-full border-transparent bg-muted ps-2 shadow-none dark:bg-muted"
            >
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
              </InputGroupAddon>
              <InputGroupInput
                aria-label={labels.address}
                placeholder={labels.addressPlaceholder}
                data-browser-address=""
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </InputGroup>
          </form>
        )}
        {actions.length > 0 && (
          <div
            data-slot="browser-start-actions"
            className="grid gap-2 @md:grid-cols-2"
          >
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onSelect}
                {...(action.shortcut
                  ? { "aria-keyshortcuts": action.shortcut }
                  : {})}
                className={cn(
                  startButton,
                  "flex h-11 items-center gap-3 bg-muted/50 px-4 text-start text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
                )}
              >
                {action.icon}
                <span className="min-w-0 flex-1 truncate">{action.label}</span>
                {action.shortcut && (
                  <Kbd aria-hidden="true" className="bg-background/60">
                    {action.shortcut}
                  </Kbd>
                )}
              </button>
            ))}
          </div>
        )}
        {suggested.length > 0 && (
          <section aria-labelledby={`${id}-suggested`}>
            <h2
              id={`${id}-suggested`}
              className="mb-3 text-sm font-medium text-foreground"
            >
              {labels.suggested}
            </h2>
            <ul className="grid grid-cols-3 gap-1 @lg:grid-cols-4">
              {suggested.map(({ page }) => (
                <li key={page.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => go(page)}
                    className={cn(
                      startButton,
                      "flex w-full flex-col items-center gap-2 px-2 py-3 text-sm"
                    )}
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
                      {pageIcon(page)}
                    </span>
                    <span className="w-full truncate text-center">
                      {page.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {recent.length > 0 && (
          <section aria-labelledby={`${id}-recent`}>
            <h2
              id={`${id}-recent`}
              className="mb-2 text-sm font-medium text-foreground"
            >
              {labels.recentPages}
            </h2>
            <ul>
              {recent.map(({ page, description, time }) => (
                <li
                  key={page.id}
                  // A hairline between rows, not through their highlight.
                  className="not-last:after:mx-3 not-last:after:block not-last:after:border-b not-last:after:border-border"
                >
                  <button
                    type="button"
                    onClick={() => go(page)}
                    className={cn(
                      startButton,
                      "flex w-full items-center gap-3 px-3 py-2 text-start"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">
                      {pageIcon(page)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{page.title}</span>
                      {description && (
                        <span className="truncate text-xs text-muted-foreground">
                          {description}
                        </span>
                      )}
                    </span>
                    {time && (
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {time}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function BrowserView({
  tab,
  page,
  opened,
  onOpenFile,
  labels,
}: {
  tab: BrowserTab
  page: BrowserPage
  /** Its folders' place, kept as they open and close. */
  opened: FilesPlace
  onOpenFile:
    ((file: BrowserFile, options: { newTab: boolean }) => void) | undefined
  labels: BrowserLabels
}) {
  const { content } = page
  if (inViewer(page))
    return (
      <ViewerPage
        tab={tab}
        page={page}
        opened={opened}
        onOpenFile={onOpenFile}
        labels={labels}
      />
    )
  switch (content.type) {
    case "web":
      return (
        <WebView tab={tab.id} page={page} content={content} labels={labels} />
      )
    case "custom":
      return content.element
    case "start":
      return <StartPage tab={tab.id} />
    default:
      return null
  }
}

/** A `BrowserFile` as a `FilesViewer` has it: its path its id. */
function viewerFile(
  file: BrowserFile,
  files: Map<string, BrowserFile>
): ViewerFile {
  const { path, children, ...rest } = file
  files.set(path, file)
  return {
    ...rest,
    id: path,
    directory: children !== undefined,
    ...(children
      ? { children: children.map((child) => viewerFile(child, files)) }
      : {}),
  }
}

/**
 * A page in its viewer: the viewer's toolbar is the page's, its back and
 * forward the tab's. Its name is its tab's, not said again: the toolbar
 * starts with back and forward alone (a folder's keeps its path, the way
 * up).
 */
function ViewerPage({
  tab,
  page,
  opened,
  onOpenFile,
  labels,
}: {
  tab: BrowserTab
  page: BrowserPage
  opened: FilesPlace
  onOpenFile:
    ((file: BrowserFile, options: { newTab: boolean }) => void) | undefined
  labels: BrowserLabels
}) {
  const { browser, viewer, onMarkImage } = React.useContext(BrowserContext)!
  const { files, media, pdf, table, terminal, code, ...bars } = labels.viewers
  const viewerLabels: Partial<ViewerLabels> = {
    back: labels.back,
    forward: labels.forward,
    ...bars,
  }
  const addToChat = viewer.onAddToChat
  const frame: ViewerFrameProps = {
    name: page.title,
    path: pathOf(page),
    ...(page.icon ? { icon: page.icon } : {}),
    onBack: tab.index > 0 ? () => browser.back(tab.id) : undefined,
    onForward:
      tab.index < tab.pages.length - 1
        ? () => browser.forward(tab.id)
        : undefined,
    actions: viewer.pageActions?.(page),
    onAddToChat: addToChat && (() => addToChat(page)),
    menu: viewer.pageMenu?.(page),
  }
  const { content } = page
  // Named by its tab: back and forward alone at the toolbar's start,
  // nothing where there are neither.
  const named: ViewerFrameProps = {
    ...frame,
    start:
      frame.onBack || frame.onForward ? (
        <ViewerToolGroup>
          {frame.onBack && (
            <ViewerBack label={labels.back} onClick={frame.onBack} />
          )}
          {frame.onForward && (
            <ViewerForward label={labels.forward} onClick={frame.onForward} />
          )}
        </ViewerToolGroup>
      ) : null,
  }
  switch (content.type) {
    case "image":
      return (
        <MediaViewer
          {...named}
          kind="image"
          src={content.src}
          alt={content.alt}
          crossOrigin={content.crossOrigin}
          width={content.width}
          height={content.height}
          versions={content.versions}
          when={content.when}
          onMark={
            content.markable && onMarkImage
              ? (marks, size) => onMarkImage(page, marks, size)
              : undefined
          }
          marks={content.marks}
          highlight={content.highlight}
          download={content.download}
          details={content.details}
          labels={{
            ...viewerLabels,
            ...media,
            failed:
              media?.failed ??
              ((kind) =>
                kind === "image"
                  ? labels.imageFailed
                  : defaultMediaViewerLabels.failed(kind)),
            editor: { ...labels.image, ...media?.editor },
          }}
        />
      )
    case "video":
      return (
        <MediaViewer
          {...named}
          kind="video"
          src={content.src}
          crossOrigin={content.crossOrigin}
          poster={content.poster}
          {...(content.captions ? { captions: content.captions } : {})}
          download={content.download}
          details={content.details}
          labels={{ ...viewerLabels, ...media }}
        />
      )
    case "audio":
      return (
        <MediaViewer
          {...named}
          kind="audio"
          src={content.src}
          crossOrigin={content.crossOrigin}
          title={content.heading}
          description={content.description}
          peaks={content.peaks}
          {...(content.transcript ? { transcript: content.transcript } : {})}
          download={content.download}
          details={content.details}
          labels={{ ...viewerLabels, ...media }}
        />
      )
    case "pdf":
      return (
        <PdfViewer
          {...named}
          src={content.src}
          pages={content.pages}
          pageCount={content.pageCount}
          download={content.download}
          details={content.details}
          labels={{ ...viewerLabels, ...pdf }}
        />
      )
    case "table":
      return (
        <TablePage
          frame={named}
          content={content}
          onAddToChat={
            addToChat &&
            ((cell) => addToChat(page, cell ? { cell } : undefined))
          }
          labels={{ ...viewerLabels, ...table }}
        />
      )
    case "terminal":
      return (
        <TerminalViewer
          sessions={[
            {
              id: page.id,
              title: page.title,
              output: content.output,
              running: content.live,
              status: content.status,
            },
            ...(content.sessions ?? []),
          ]}
          onBack={frame.onBack}
          onForward={frame.onForward}
          actions={frame.actions}
          menu={frame.menu}
          onNew={viewer.onNewTerminal && (() => viewer.onNewTerminal?.(page))}
          onStop={
            viewer.onStopTerminal &&
            ((session) => viewer.onStopTerminal?.(page, session))
          }
          onClear={
            viewer.onClearTerminal &&
            ((session) => viewer.onClearTerminal?.(page, session))
          }
          onSendToChat={
            addToChat && ((session) => addToChat(page, { session }))
          }
          labels={{
            ...viewerLabels,
            jumpToEnd: labels.jumpToEnd,
            ...terminal,
          }}
        />
      )
    case "code":
      return (
        <CodePage
          frame={named}
          content={content}
          labels={{ ...viewerLabels, ...defaultCodeLabels, ...code }}
        />
      )
    case "diff":
      return (
        <DiffPage
          frame={named}
          diff={content.diff}
          actions={content.actions}
          status={content.status}
          numbers={content.numbers}
          labels={{ ...viewerLabels, ...defaultCodeLabels, ...code }}
        />
      )
    case "files":
      return (
        <FilesPage
          frame={frame}
          files={content.files}
          view={content.view}
          details={content.details}
          opened={opened}
          onOpenFile={onOpenFile}
          onAddToChat={
            addToChat &&
            ((file) => addToChat(page, file ? { file } : undefined))
          }
          labels={{ ...viewerLabels, ...files }}
        />
      )
    default:
      return null
  }
}

function TablePage({
  frame,
  content,
  onAddToChat,
  labels,
}: {
  frame: ViewerFrameProps
  content: Extract<BrowserContent, { type: "table" }>
  onAddToChat:
    | ((
        cell: (TableCellPosition & { value: string; name: string }) | null
      ) => void)
    | undefined
  labels: NonNullable<React.ComponentProps<typeof TableViewer>["labels"]>
}) {
  const { csv, separator } = content
  // Read once for its text, not again as the page changes otherwise.
  const parsed = React.useMemo(
    () => (csv === undefined ? undefined : parseCsv(csv, separator)),
    [csv, separator]
  )
  const columns = content.columns ?? parsed?.[0] ?? []
  const rows = content.rows ?? parsed?.slice(1) ?? []
  return (
    <TableViewer
      {...frame}
      columns={columns}
      rows={rows}
      totalRows={content.totalRows}
      onAddToChat={onAddToChat}
      download={content.download}
      details={content.details}
      labels={labels}
    />
  )
}

/**
 * A folder in a `FilesViewer`: a file opened (Enter, a double click) goes
 * to `onOpenFile`, in a new tab with ⌘ or Ctrl or a middle click; a file
 * dragged carries itself, as the browser's files do.
 */
function FilesPage({
  frame,
  files,
  view,
  details,
  opened,
  onOpenFile,
  onAddToChat,
  labels,
}: {
  frame: ViewerFrameProps
  files: BrowserFile[]
  view: FilesView | undefined
  details: readonly React.ReactNode[] | undefined
  opened: FilesPlace
  onOpenFile:
    ((file: BrowserFile, options: { newTab: boolean }) => void) | undefined
  onAddToChat: ((file: BrowserFile | undefined) => void) | undefined
  labels: NonNullable<React.ComponentProps<typeof FilesViewer>["labels"]>
}) {
  const [selected, setSelected] = React.useState<string | null>(
    () => [...opened.picked][0] ?? null
  )
  const { byPath, tree } = React.useMemo(() => {
    const byPath = new Map<string, BrowserFile>()
    return {
      byPath,
      tree: files.map((file) => viewerFile(file, byPath)),
    }
  }, [files])
  const open = (file: ViewerFile, newTab: boolean) => {
    const own = byPath.get(file.id)
    if (own && !own.children) onOpenFile?.(own, { newTab })
  }
  return (
    <FilesViewer
      {...frame}
      onAddToChat={
        onAddToChat &&
        (() => onAddToChat(selected ? byPath.get(selected) : undefined))
      }
      files={tree}
      defaultView={view}
      selected={selected}
      onSelect={(file) => {
        replace(opened.picked, [file.id])
        setSelected(file.id)
      }}
      onOpen={onOpenFile && ((file) => open(file, false))}
      defaultExpanded={opened.expanded}
      onExpandedChange={(expanded) => replace(opened.expanded, expanded)}
      fileProps={(file) => {
        const own = byPath.get(file.id)
        return {
          draggable: true,
          onDragStart: (event: React.DragEvent) => {
            if (own) dragFile(event, own)
          },
          onClick: (event: React.MouseEvent) => {
            if ((event.metaKey || event.ctrlKey) && onOpenFile) open(file, true)
          },
          onAuxClick: (event: React.MouseEvent) => {
            if (event.button === 1 && onOpenFile) open(file, true)
          },
        }
      }}
      details={details}
      labels={labels}
    />
  )
}

/** A web page, its view the reader's by tab, its states the app's. */
function WebView({
  tab,
  page,
  content,
  labels,
}: {
  tab: string
  page: BrowserPage
  content: BrowserWebContent
  labels: BrowserLabels
}) {
  const { browser, webView, setWebView, web, resolveAddress, reload } =
    React.useContext(BrowserContext)!
  const {
    inspectElement,
    onPickElement,
    onTakeOver,
    onAskAgent,
    onRefreshNetwork,
    onRemoteInput,
    copyRemoteSelection,
    remoteShortcut,
  } = web
  return (
    <BrowserWebPage
      title={page.title}
      location={page.location}
      content={content}
      view={webView(tab)}
      onViewChange={(change) => setWebView(tab, page, change)}
      inspectElement={
        inspectElement && ((point) => inspectElement(page, point))
      }
      onPickElement={
        onPickElement &&
        ((element, request, options) =>
          onPickElement(page, element, request, options))
      }
      onTakeOver={onTakeOver && (() => onTakeOver(page))}
      onAskAgent={onAskAgent && ((message) => onAskAgent(page, message))}
      onRefreshNetwork={onRefreshNetwork && (() => onRefreshNetwork(page))}
      onRemoteInput={onRemoteInput && ((input) => onRemoteInput(page, input))}
      copyRemoteSelection={
        copyRemoteSelection && (() => copyRemoteSelection(page))
      }
      remoteShortcut={remoteShortcut}
      notRunningActions={web.notRunningActions?.(page)}
      recent={web.recent}
      onOpenAddress={(address) => {
        const next = resolveAddress(address)
        if (next) browser.navigate(next, tab)
      }}
      onRetry={() => reload(tab)}
      onOtherAddress={(event) =>
        event.currentTarget
          .closest("[data-slot=browser-pane]")
          ?.querySelector<HTMLInputElement>("[data-browser-address]")
          ?.focus()
      }
      labels={labels}
    />
  )
}

// Code to the viewer's edges, its focus ring inside them.
const codeContent =
  "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"

/**
 * A page of code in a viewer: a `CodeViewer`'s, embedded, as a diff is
 * to the viewer's edges, its tools in the viewer's toolbar.
 */
function CodePage({
  frame,
  content,
  labels,
}: {
  frame: ViewerFrameProps
  content: Extract<BrowserContent, { type: "code" }>
  labels: Partial<ViewerLabels> & CodePageLabels
}) {
  const { code, language, lineVariant, defaultFormatted } = content
  return (
    <CodeViewer
      variant="embedded"
      frame={{ ...frame, icon: frame.icon ?? icons.code, labels }}
      code={code}
      {...(language !== undefined ? { language } : {})}
      {...(lineVariant ? { lineVariant } : {})}
      {...(defaultFormatted !== undefined ? { defaultFormatted } : {})}
      labels={{ wrap: labels.wrap, lines: labels.lines, ...labels.viewer }}
    />
  )
}

/**
 * A diff in a viewer: each file under its name, its lines added and
 * removed, to the edges; how many files and lines below.
 */
function DiffPage({
  frame,
  diff,
  actions,
  status,
  numbers,
  labels,
}: {
  frame: ViewerFrameProps
  diff: string | readonly DiffFile[]
  actions?: React.ReactNode
  status?: React.ReactNode
  numbers?: "one" | "both" | undefined
  labels: Partial<ViewerLabels> & CodePageLabels
}) {
  const [wrap, setWrap] = React.useState(false)
  const files = React.useMemo(() => diffFiles(diff), [diff])
  const [picked, setPicked] = React.useState<string | undefined>(undefined)
  const { added, removed } = diffTotals(files)
  const diffLabels: DiffLabels = {
    ...defaultDiffLabels,
    ...labels.diff,
    changes: labels.changes,
  }
  // Of more than one file, the one picked in their list; else them all.
  const listed = files.length > 1
  const shown = listed
    ? [files.find((file) => file.name === picked) ?? files[0]!]
    : files
  // Its path alone is the tab's name: no toolbar for it.
  const toolbar =
    frame.onBack !== undefined ||
    frame.onForward !== undefined ||
    frame.actions !== undefined ||
    frame.onAddToChat !== undefined ||
    frame.download !== undefined ||
    frame.menu !== undefined
  return (
    <ViewerFrame
      {...frame}
      icon={frame.icon ?? icons.diff}
      labels={labels}
      toolbar={toolbar}
      {...(actions
        ? {
            footer: (
              <ViewerActionBar>
                {status}
                {actions}
              </ViewerActionBar>
            ),
          }
        : {
            controls: (
              <ViewerStatusButton
                aria-pressed={wrap}
                onClick={() => setWrap(!wrap)}
              >
                {labels.wrap}
              </ViewerStatusButton>
            ),
            facts: [labels.files(files.length), labels.changes(added, removed)],
          })}
    >
      <div
        data-slot="browser-diff"
        className="min-h-0 flex-1 scrollbar-thin overflow-auto text-xs"
      >
        {listed && (
          <DiffFileList
            files={files}
            current={shown[0]?.name}
            onSelect={setPicked}
            labels={diffLabels}
            className="border-b px-2 py-2"
          />
        )}
        {shown.map((file, index) => {
          const name = diffFileName(file, diffLabels)
          return (
            <section key={`${index}:${file.name}`} aria-label={name}>
              {listed && (
                <h3
                  data-slot="diff-touch-header"
                  className="sticky top-0 z-10 hidden h-10 items-center gap-2 bg-background px-4 text-2sm font-normal text-muted-foreground sm:h-9 pointer-coarse:flex"
                >
                  <HugeiconsIcon
                    icon={File01Icon}
                    className="size-3.5 shrink-0"
                  />
                  <span className="min-w-0 truncate">{name}</span>
                  <span className="ms-auto text-subtle-foreground">
                    {diffLabels.unified}
                  </span>
                </h3>
              )}
              {!listed && (
                <h3
                  className={cn(
                    "sticky top-0 z-10 flex items-center gap-2 border-b bg-background py-2 pe-3 font-mono text-xs font-medium",
                    diffInset
                  )}
                >
                  <span className="min-w-0 truncate">{name}</span>
                  {file.hunks.length > 0 && (
                    <DiffStat file={file} labels={diffLabels} />
                  )}
                </h3>
              )}
              <DiffFileContent
                file={file}
                labels={diffLabels}
                wrap={wrap}
                numbers={numbers}
                // As a page of code: its numbers' column, 20px lines.
                gutter="wide"
                touch
                className={cn(codeContent, "leading-5")}
              />
            </section>
          )
        })}
      </div>
    </ViewerFrame>
  )
}

export {
  Browser,
  BrowserToolbar,
  BrowserToolbarButton,
  browserFileFrom,
  browserFileType,
  resolveWebAddress,
  useBrowser,
  type BrowserAgent,
  type BrowserBox,
  type BrowserConsoleMessage,
  type BrowserDevice,
  type BrowserElement,
  type BrowserPickOptions,
  type BrowserNetworkRequest,
  type BrowserRecent,
  type BrowserWebContent,
  type BrowserWebView,
  type BrowserChatPart,
  type BrowserContent,
  type BrowserFile,
  type BrowserLabels,
  type CodePageLabels,
  type BrowserPage,
  type BrowserState,
  type BrowserTab,
}
export type {
  BrowserModifiers,
  BrowserRemote,
  BrowserRemoteBox,
  BrowserRemoteDialog,
  BrowserRemoteFrame,
  BrowserRemoteInput,
  BrowserRemoteLabels,
  BrowserRemoteOption,
  BrowserRemoteSelect,
} from "@/components/browser-remote"
