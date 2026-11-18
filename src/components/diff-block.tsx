"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { File01Icon, FileDiffIcon } from "@hugeicons/core-free-icons"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockRest,
  CodeBlockTitle,
  useCodeBlockCut,
  type CodeBlockLabels,
} from "@/components/ui/code-block"
import { diffFiles, type DiffFile } from "@/lib/unified-diff"

type DiffLabels = {
  /** What a file adds and removes: "+3 −1". */
  changes: (added: number, removed: number) => string
  /** How many files changed, over their list: "3 files changed". */
  filesChanged: (files: number) => string
  /** A file's status, for a screen reader: "modified". */
  status: (status: DiffFile["status"]) => string
  /** A renamed or copied file's name: "old.ts → new.ts". */
  moved: (from: string, to: string) => string
  /** The unified view label over a file. */
  unified: string
  /** In place of the lines of a binary file. */
  binary: string
  /** In place of the lines of a file whose lines did not change. */
  unchanged: string
}

/** A `DiffBlock`'s words: a diff's, and its fold's (`CodeBlock`'s). */
type DiffBlockLabels = DiffLabels & CodeBlockLabels

const defaultDiffLabels: DiffLabels = {
  changes: (added, removed) => `+${added} −${removed}`,
  filesChanged: (files) => `${files} ${files === 1 ? "file" : "files"} changed`,
  status: (status) => status,
  moved: (from, to) => `${from} → ${to}`,
  unified: "Unified",
  binary: "Binary file",
  unchanged: "No lines changed",
}

/** A file's name, its old one before it where it was renamed or copied. */
const diffFileName = (file: DiffFile, labels: Pick<DiffLabels, "moved">) =>
  (file.status === "renamed" || file.status === "copied") &&
  file.oldPath !== null &&
  file.newPath !== null
    ? labels.moved(file.oldPath, file.newPath)
    : file.name

/** How many lines the files add and remove, all told. */
const diffTotals = (
  files: readonly { added?: number | undefined; removed?: number | undefined }[]
) =>
  files.reduce<{ added: number; removed: number }>(
    (total, file) => ({
      added: total.added + (file.added ?? 0),
      removed: total.removed + (file.removed ?? 0),
    }),
    { added: 0, removed: 0 }
  )

/** What a file adds and removes, after its name: "+3 −1". */
function DiffStat({
  file,
  labels = defaultDiffLabels,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  file: Pick<DiffFile, "added" | "removed">
  labels?: Pick<DiffLabels, "changes"> | undefined
}) {
  return (
    <span
      data-slot="diff-stat"
      className={cn(
        "shrink-0 text-2xs font-normal text-subtle-foreground tabular-nums",
        className
      )}
      {...props}
    >
      {labels.changes(file.added, file.removed)}
    </span>
  )
}

/**
 * A diff's inset: its lines' text a gutter's width in, clear of the sign
 * the code block draws at a line's start; a file's name over them in
 * line with the code.
 */
// (Said again at sm, past the code block's small line inset.)
const diffInset = "ps-6 group-data-[size=sm]/code-block:ps-6"

/**
 * A diff's line with its number: in a gutter as wide as the widest
 * (`--diff-gutter`, set by `DiffFileContent`), the faintest grey, then
 * the line's sign in a column of its own, then its text.
 */
const diffNumbered =
  "ps-[calc(var(--diff-gutter)+2.375rem)] group-data-[size=sm]/code-block:ps-[calc(var(--diff-gutter)+2.375rem)] before:absolute before:start-3 group-data-[size=sm]/code-block:before:start-3 before:top-0 before:w-(--diff-gutter) before:text-end before:text-subtle-foreground before:content-[attr(data-number)] before:whitespace-pre before:select-none data-[variant=added]:before:text-muted-foreground after:start-[calc(var(--diff-gutter)+1.5rem)] group-data-[size=sm]/code-block:after:start-[calc(var(--diff-gutter)+1.375rem)]"

/**
 * A hunk's `@@ -1,4 +1,5 @@` line: a band across the code, between
 * rules, small and in the faintest grey.
 */
function DiffHunkHeader({
  className,
  ...props
}: React.ComponentProps<typeof CodeBlockLine>) {
  return (
    <CodeBlockLine
      data-diff="hunk"
      className={cn(
        "my-2 border-y border-border bg-sidebar py-1 text-2xs/6 text-subtle-foreground first:mt-0 dark:bg-muted/50 dark:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * A file's lines, in a `CodeBlockContent`: each hunk under its header
 * (none over a file's only hunk), added and removed lines in the code
 * block's greys with their signs, each line with its number in the new
 * file, a removed one's in the old. In a folded block, only the lines it
 * shows; the rest, @@ lines too, one plain text until it opens.
 */
function DiffFileContent({
  file,
  numbers = "one",
  gutter = "fit",
  touch = false,
  labels: labelsProp,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<typeof CodeBlockContent>, "children"> & {
  file: DiffFile
  /**
   * Its gutter: a line's number in the new file (a removed line's in the
   * old), or both, old then new.
   */
  numbers?: "one" | "both" | undefined
  /**
   * The numbers' column: as wide as their digits, or, `wide`, at least
   * 36px, a viewer's, the code clear of them as a page of code is.
   */
  gutter?: "fit" | "wide" | undefined
  /** On coarse pointers, signs alone, without numbers or hunk headers. */
  touch?: boolean | undefined
  labels?: Partial<DiffLabels> | undefined
}) {
  const labels = { ...defaultDiffLabels, ...labelsProp }
  // As wide as the largest number's digits.
  const largest = file.hunks.reduce(
    (most, hunk) =>
      Math.max(
        most,
        hunk.oldStart + hunk.oldLines,
        hunk.newStart + hunk.newLines
      ),
    0
  )
  const digits = String(largest).length
  const both = (line: DiffFile["hunks"][number]["lines"][number]) =>
    `${String(line.oldLine ?? "").padStart(digits)} ${String(line.newLine ?? "").padStart(digits)}`
  const lineClass = cn(
    diffNumbered,
    touch &&
      // grid: clear (room for the line numbers)
      "pointer-coarse:ps-8 group-data-[size=sm]/code-block:pointer-coarse:ps-8 pointer-coarse:before:content-none pointer-coarse:after:start-4 group-data-[size=sm]/code-block:pointer-coarse:after:start-4 sm:pointer-coarse:ps-9 group-data-[size=sm]/code-block:sm:pointer-coarse:ps-9"
  )
  const cut = useCodeBlockCut()
  const lines: React.ReactNode[] = []
  const rest: string[] = []
  let shown = 0
  let restLines = 0
  file.hunks.forEach((hunk, index) => {
    const header = file.hunks.length > 1 ? hunk.header : null
    if (rest.length > 0 && header !== null) rest.push(header)
    else if (header !== null)
      lines.push(
        <DiffHunkHeader
          key={`${index}`}
          className={touch ? "pointer-coarse:hidden" : undefined}
        >
          {header}
        </DiffHunkHeader>
      )
    hunk.lines.forEach((line, at) => {
      if (cut !== undefined && shown >= cut) {
        rest.push(line.text)
        restLines++
        return
      }
      shown++
      lines.push(
        <CodeBlockLine
          key={`${index}:${at}`}
          variant={line.type === "context" ? "default" : line.type}
          {...(numbers === "both"
            ? { "data-number": both(line) }
            : {
                number: line.type === "removed" ? line.oldLine : line.newLine,
              })}
          className={lineClass}
        >
          {line.text}
        </CodeBlockLine>
      )
    })
  })
  return (
    <CodeBlockContent
      className={cn(touch && "pointer-coarse:py-0", className)}
      style={
        {
          "--diff-gutter":
            numbers === "both"
              ? `${digits * 2 + 1}ch`
              : `max(${gutter === "wide" ? "2.25rem" : "1rem"}, ${digits}ch)`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {file.hunks.length === 0 ? (
        <DiffHunkHeader>
          {file.binary ? labels.binary : labels.unchanged}
        </DiffHunkHeader>
      ) : (
        lines
      )}
      {rest.length > 0 && (
        <CodeBlockRest lines={restLines} className={lineClass}>
          {rest.join("\n")}
        </CodeBlockRest>
      )}
    </CodeBlockContent>
  )
}

/**
 * A diff in code blocks, one for each file: its name and what it adds
 * and removes in the header, its hunks below. The diff's text, read as a
 * unified diff, or the files `parseUnifiedDiff` read. With `lines`, a
 * file longer than that folds in its own block (`CodeBlock`'s `lines`).
 */
function DiffBlock({
  diff,
  size,
  wrap = false,
  numbers,
  lines,
  actions,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  diff: string | readonly DiffFile[]
  size?: "default" | "sm" | undefined
  wrap?: boolean | undefined
  /** Its lines' numbers: one column (the default), or old and new. */
  numbers?: "one" | "both" | undefined
  /**
   * A file's lines shown before the rest is asked for, its @@ lines not
   * counted; all of them by default.
   */
  lines?: number | undefined
  /** In a file's header, after its counts: e.g. copy, open beside. */
  actions?: ((file: DiffFile) => React.ReactNode) | undefined
  /** Its words, the fold's too (`more`, `less`, `lines`, `collapse`). */
  labels?: Partial<DiffBlockLabels> | undefined
}) {
  const labels = { ...defaultDiffLabels, ...labelsProp }
  const files = React.useMemo(() => diffFiles(diff), [diff])
  return (
    <div
      data-slot="diff-block"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    >
      {files.map((file, index) => {
        const name = diffFileName(file, labels)
        const own = actions?.(file)
        return (
          <CodeBlock
            key={`${index}:${file.name}`}
            {...(size ? { size } : {})}
            lines={lines}
            labels={labelsProp}
            role="group"
            aria-label={name}
          >
            <CodeBlockHeader>
              <CodeBlockTitle>
                <HugeiconsIcon
                  icon={File01Icon}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {name}
              </CodeBlockTitle>
              {file.hunks.length > 0 && (
                <DiffStat file={file} labels={labels} />
              )}
              {own && <CodeBlockActions>{own}</CodeBlockActions>}
            </CodeBlockHeader>
            <DiffFileContent
              file={file}
              labels={labels}
              wrap={wrap}
              numbers={numbers}
            />
          </CodeBlock>
        )
      })}
    </div>
  )
}

/** A file as its list shows it: its path, status and counts. */
/**
 * A file in a list of the files changed: its counts where they are known
 * (none for a file a command changed, say), and an `id` where two share
 * a name (one path in two roots): its key, `current` and `onSelect`'s.
 */
type DiffFileSummary = Pick<DiffFile, "name" | "status"> & {
  added?: number | undefined
  removed?: number | undefined
  id?: string | undefined
}

/** A file's own in a list: its `id`, else its name. */
const diffFileKey = (file: DiffFileSummary) => file.id ?? file.name

const statusLetters: Record<DiffFile["status"], string> = {
  added: "A",
  deleted: "D",
  modified: "M",
  renamed: "R",
  copied: "C",
}

/** A file's status as a small boxed letter: M, A, D, R, C. */
function DiffFileStatus({
  status,
  labels = defaultDiffLabels,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  status: DiffFile["status"]
  labels?: Pick<DiffLabels, "status"> | undefined
}) {
  return (
    <span
      data-slot="diff-file-status"
      className={cn(
        "inline-grid size-4 shrink-0 place-items-center rounded-xs font-mono text-2xs leading-none font-semibold text-muted-foreground ring-1 ring-border ring-inset pointer-coarse:size-5",
        className
      )}
      {...props}
    >
      <span aria-hidden="true">{statusLetters[status]}</span>
      <span className="sr-only">{labels.status(status)}</span>
    </span>
  )
}

/**
 * A file's row: its status, its path (the directory fainter), and what it
 * adds and removes at the end, the added count a step stronger. A button
 * where the list has `onSelect`; the current one marked. Under a finger,
 * every name in the text's colour, only the directory faint; a card's
 * rows without their status.
 */
function DiffFileRow({
  file,
  current,
  onSelect,
  wrap,
  labels,
}: {
  file: DiffFileSummary
  current: boolean
  onSelect: ((id: string) => void) | undefined
  wrap: boolean
  labels: DiffLabels
}) {
  const slash = file.name.lastIndexOf("/")
  const content = (
    <>
      <DiffFileStatus status={file.status} labels={labels} />
      <span className={cn("min-w-0 flex-1", wrap ? "break-all" : "truncate")}>
        {slash >= 0 && (
          <span
            data-slot="diff-file-dir"
            className="text-subtle-foreground in-data-current:text-muted-foreground pointer-coarse:in-data-current:text-subtle-foreground"
          >
            {file.name.slice(0, slash + 1)}
          </span>
        )}
        {file.name.slice(slash + 1)}
      </span>
      {file.added !== undefined && file.removed !== undefined && (
        <span
          data-slot="diff-file-stat"
          className="shrink-0 text-2xs text-subtle-foreground tabular-nums in-data-current:text-muted-foreground pointer-coarse:text-2sm"
        >
          +{file.added} −{file.removed}
        </span>
      )}
    </>
  )
  const row =
    "flex w-full min-w-0 items-center gap-2 text-start text-2sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-current:text-foreground max-sm:pointer-coarse:text-md pointer-coarse:text-foreground"
  return (
    <li data-slot="diff-file" data-wrap={wrap || undefined} className="min-w-0">
      {onSelect ? (
        <button
          type="button"
          data-slot="diff-file-row"
          data-current={current || undefined}
          aria-current={current || undefined}
          onClick={() => onSelect(diffFileKey(file))}
          className={cn(row, "hover:text-foreground")}
        >
          {content}
        </button>
      ) : (
        <div
          data-slot="diff-file-row"
          data-current={current || undefined}
          className={row}
        >
          {content}
        </div>
      )}
    </li>
  )
}

/**
 * The files a diff changes, one row each: as a panel's list (rounded
 * rows, the current one filled), or in a `DiffFilesCard` (rows across
 * it, the current one marked by a bar at its start). With `onSelect`,
 * the rows pick the file a diff beside it shows.
 */
function DiffFileList({
  files,
  current,
  onSelect,
  variant = "list",
  wrap = false,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"ul">, "onSelect"> & {
  files: readonly DiffFileSummary[]
  /** The file shown, by its `id`, else its name. */
  current?: string | undefined
  /** On a file picked: its `id`, else its name. */
  onSelect?: ((id: string) => void) | undefined
  variant?: "list" | "card"
  /** Long paths wrap, not cut short: e.g. in a narrow panel. */
  wrap?: boolean
  labels?: Partial<DiffLabels> | undefined
}) {
  const labels = { ...defaultDiffLabels, ...labelsProp }
  return (
    <ul
      data-slot="diff-file-list"
      data-variant={variant}
      className={cn(
        "group/diff-files flex min-w-0 flex-col",
        // A row as tall as its path wraps to, at least its own height.
        "**:data-[wrap]:*:data-[slot=diff-file-row]:items-start **:data-[wrap]:*:data-[slot=diff-file-row]:py-1",
        "data-[variant=list]:**:data-[slot=diff-file-row]:min-h-8 data-[variant=list]:**:data-[slot=diff-file-row]:rounded-md data-[variant=list]:**:data-[slot=diff-file-row]:px-2 data-[variant=list]:**:data-[slot=diff-file-row]:hover:bg-muted data-[variant=list]:**:data-[slot=diff-file-row]:data-current:bg-muted pointer-coarse:data-[variant=list]:**:data-[slot=diff-file-row]:min-h-12",
        "data-[variant=card]:**:data-[slot=diff-file-row]:min-h-9 data-[variant=card]:**:data-[slot=diff-file-row]:px-3 data-[variant=card]:**:data-[slot=diff-file-row]:hover:bg-sidebar data-[variant=card]:**:data-[slot=diff-file-row]:data-current:bg-sidebar data-[variant=card]:**:data-[slot=diff-file-row]:data-current:shadow-mark-start dark:data-[variant=card]:**:data-[slot=diff-file-row]:hover:bg-muted/50 dark:data-[variant=card]:**:data-[slot=diff-file-row]:data-current:bg-muted/50 pointer-coarse:data-[variant=card]:*:not-first:border-t pointer-coarse:data-[variant=card]:**:data-[slot=diff-file-row]:min-h-12 pointer-coarse:data-[variant=card]:**:data-[slot=diff-file-row]:px-4 pointer-coarse:data-[variant=card]:**:data-[slot=diff-file-status]:hidden",
        className
      )}
      {...props}
    >
      {files.map((file) => (
        <DiffFileRow
          key={diffFileKey(file)}
          file={file}
          current={diffFileKey(file) === current}
          onSelect={onSelect}
          wrap={wrap}
          labels={labels}
        />
      ))}
    </ul>
  )
}

/**
 * A message's card of the files a turn changed: "3 files changed +18 −3"
 * and the app's `action` (e.g. "Review all", which opens them beside),
 * over a `DiffFileList` of them.
 */
function DiffFilesCard({
  files,
  current,
  onSelect,
  action,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "onSelect"> & {
  files: readonly DiffFileSummary[]
  current?: string | undefined
  onSelect?: ((name: string) => void) | undefined
  /** At the header's end: e.g. a button that opens the changes. */
  action?: React.ReactNode
  labels?: Partial<DiffLabels> | undefined
}) {
  const labels = { ...defaultDiffLabels, ...labelsProp }
  const id = React.useId()
  return (
    <section
      data-slot="diff-files-card"
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border pointer-coarse:rounded-2xl",
        className
      )}
      {...props}
    >
      <div
        data-slot="diff-files-card-header"
        className="flex h-9 shrink-0 items-center gap-2 border-b border-border ps-3 pe-2 text-xs text-muted-foreground pointer-coarse:h-11 pointer-coarse:bg-sidebar pointer-coarse:ps-4 pointer-coarse:text-sm dark:pointer-coarse:bg-muted/50 [&>svg]:size-3.5 [&>svg]:shrink-0"
      >
        <HugeiconsIcon icon={FileDiffIcon} strokeWidth={2} aria-hidden="true" />
        <h3
          id={id}
          className="min-w-0 truncate font-normal pointer-coarse:font-medium pointer-coarse:text-foreground"
        >
          {labels.filesChanged(files.length)}
        </h3>
        {/* Under a finger, the counts at the end, beside the action. */}
        <DiffStat
          file={diffTotals(files)}
          labels={labels}
          className="pointer-coarse:ms-auto pointer-coarse:text-2sm"
        />
        {action && (
          <div className="ms-auto flex shrink-0 items-center pointer-coarse:ms-0">
            {action}
          </div>
        )}
      </div>
      <DiffFileList
        files={files}
        current={current}
        onSelect={onSelect}
        variant="card"
        labels={labels}
      />
    </section>
  )
}

export {
  DiffBlock,
  type DiffBlockLabels,
  DiffFileList,
  DiffFileStatus,
  DiffFilesCard,
  type DiffFileSummary,
  DiffFileContent,
  DiffHunkHeader,
  DiffStat,
  defaultDiffLabels,
  diffInset,
  diffFileName,
  diffTotals,
  type DiffLabels,
}
