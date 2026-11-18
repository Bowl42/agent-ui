"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowExpand01Icon, Download01Icon } from "@hugeicons/core-free-icons"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** A cell as text, quoted if it holds the separator, a quote or a line. */
function quote(cell: string, separator: string) {
  return cell.includes(separator) || /["\r\n]/.test(cell)
    ? `"${cell.replaceAll('"', '""')}"`
    : cell
}

/**
 * A table as tab-separated text, for pasting into a spreadsheet: a cell
 * with a tab, a quote or a line quoted, as spreadsheets read it.
 */
/** No value: empty, or a dash. */
const blank = (cell: string | undefined) =>
  cell === undefined || /^\s*(—|-|)\s*$/.test(cell)

/** "1,204", "9", "-3.5", "12%" are numbers; "v2", "—" are not. */
const isNumber = (cell: string) =>
  /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?%?$/i.test(
    cell.trim().replaceAll(",", "")
  )

function tableToTsv(columns: readonly string[], rows: readonly string[][]) {
  return [columns, ...rows]
    .map((row) => row.map((cell) => quote(cell, "\t")).join("\t"))
    .join("\n")
}

/** A table as CSV (RFC 4180): lines end in CRLF. */
function tableToCsv(columns: readonly string[], rows: readonly string[][]) {
  return [columns, ...rows]
    .map((row) => row.map((cell) => quote(cell, ",")).join(","))
    .join("\r\n")
}

/** A table in Markdown: pipes escaped, lines as `<br>`. */
function tableToMarkdown(
  columns: readonly string[],
  rows: readonly string[][]
) {
  const cell = (text: string) =>
    text.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>")
  const line = (row: readonly string[]) =>
    `| ${columns.map((_, index) => cell(row[index] ?? "")).join(" | ")} |`
  return [
    line(columns),
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map(line),
  ].join("\n")
}

/** Saves text as a file, by a link the browser downloads. */
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type TablePreviewLabels = {
  /** How large it is: "12 rows · 3 columns". */
  size: (rows: number, columns: number) => string
  copy: string
  copied: string
  copyFailed: string
  download: string
  csv: string
  markdown: string
  fullScreen: string
  /** Full screen's close button. */
  close: string
  empty: string
}

const defaultLabels: TablePreviewLabels = {
  size: (rows, columns) =>
    `${rows} ${rows === 1 ? "row" : "rows"} · ${columns} ${columns === 1 ? "column" : "columns"}`,
  copy: "Copy as text",
  copied: "Copied",
  copyFailed: "Could not copy",
  download: "Download",
  csv: "CSV",
  markdown: "Markdown",
  fullScreen: "Full screen",
  close: "Close",
  empty: "No data",
}

type TablePreviewProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The heading of each column. */
  columns: readonly string[]
  /** The rows' cells, as text, in the columns' order. */
  rows: readonly string[][]
  /** Its name: the full-screen view's title. */
  title?: string
  /** The downloads' name, without its extension. */
  fileName?: string
  /**
   * A cell's content; by default its text. E.g. the text with a search's
   * matches marked.
   */
  renderCell?: (
    value: string,
    cell: { row: number; column: number }
  ) => React.ReactNode
  /**
   * Saves a download; by default, as a file. E.g. through the app's own
   * save dialog.
   */
  onDownload?: (
    file: { name: string; text: string; type: string },
    format: "csv" | "markdown"
  ) => void
  labels?: Partial<TablePreviewLabels>
}

/**
 * A table of the app's to look at, copy and download: its size, buttons
 * to copy it as text (a spreadsheet takes it), download it as CSV or
 * Markdown, and see it full screen; the table scrolls sideways where it
 * is wider, its long cells wrapped.
 */
function TablePreview({
  columns,
  rows,
  title,
  fileName = "table",
  renderCell,
  onDownload,
  labels: labelsProp,
  className,
  ...props
}: TablePreviewProps) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [full, setFull] = React.useState(false)
  const scroller = React.useRef<HTMLDivElement>(null)
  const size = labels.size(rows.length, columns.length)

  // The buttons, each a child of the row they are in.
  const actions = (
    <>
      <CopyButton
        value={tableToTsv(columns, rows)}
        labels={{
          copy: labels.copy,
          copied: labels.copied,
          failed: labels.copyFailed,
        }}
      />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.download}
                  />
                }
              />
            }
          >
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
          </TooltipTrigger>
          <TooltipContent>{labels.download}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          {(
            [
              ["csv", labels.csv, ".csv", "text/csv", tableToCsv],
              [
                "markdown",
                labels.markdown,
                ".md",
                "text/markdown",
                tableToMarkdown,
              ],
            ] as const
          ).map(([format, label, extension, type, write]) => (
            <DropdownMenuItem
              key={format}
              onClick={() => {
                const file = {
                  name: `${fileName}${extension}`,
                  text: write(columns, rows),
                  type,
                }
                if (onDownload) onDownload(file, format)
                else download(file.text, file.name, file.type)
              }}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  // A column of numbers ("1,204", "9%", "—" for none) is aligned to the
  // end, its digits as wide as each other.
  const numeric = columns.map(
    (_, column) =>
      rows.some((row) => !blank(row[column])) &&
      rows.every((row) => blank(row[column]) || isNumber(row[column]!))
  )

  const table = (sticky: boolean) =>
    columns.length === 0 && rows.length === 0 ? (
      <p className="p-4 text-center text-sm text-muted-foreground">
        {labels.empty}
      </p>
    ) : (
      // As wide as its cells, at least its place's: a short value is one
      // line (not broken at its hyphen), and the place scrolls instead.
      <Table className="w-max min-w-full">
        <TableHeader
          // On the dialog's surface, not a band of the page's.
          className={cn(sticky && "sticky top-0 z-10 bg-popover")}
        >
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={index}
                className={cn(numeric[index] && "text-end")}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={Math.max(1, columns.length)}
                className="text-center text-muted-foreground"
              >
                {labels.empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, at) => (
              <TableRow key={at}>
                {columns.map((_, column) => (
                  <TableCell
                    key={column}
                    className={cn(
                      "align-top",
                      numeric[column] && "text-end tabular-nums"
                    )}
                  >
                    {/* Long text wraps, not one line as wide as it is: a
                        cell's own max-width a table does not keep. */}
                    <div className="max-w-80 min-w-12 break-words whitespace-pre-wrap">
                      {renderCell
                        ? renderCell(row[column] ?? "", { row: at, column })
                        : (row[column] ?? "")}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    )

  return (
    <div
      data-slot="table-preview"
      className={cn("min-w-0", className)}
      {...props}
    >
      {/* Framed as a code block, its header the same: one family; on a
          hairline as the cards beside it, darker with focus. */}
      <CodeBlock className="border-border has-[>[role=region]:focus-visible]:border-ring has-[>[role=region]:focus-visible]:ring-3 has-[>[role=region]:focus-visible]:ring-ring/50">
        <CodeBlockHeader>
          <CodeBlockTitle>{title ?? size}</CodeBlockTitle>
          {title !== undefined && (
            <span className="min-w-0 flex-1 truncate">{size}</span>
          )}
          <CodeBlockActions>
            {actions}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.fullScreen}
                    onClick={() => setFull(true)}
                  />
                }
              >
                <HugeiconsIcon icon={ArrowExpand01Icon} strokeWidth={2} />
              </TooltipTrigger>
              <TooltipContent>{labels.fullScreen}</TooltipContent>
            </Tooltip>
          </CodeBlockActions>
        </CodeBlockHeader>
        {/* It scrolls, not the table's own box: a region the keyboard
            reaches, faded at the edges it scrolls past. Its cells' text
            in line with the header's. */}
        <div
          role="region"
          aria-label={title ?? size}
          tabIndex={0}
          className="scroll-fade-x scrollbar-thin overflow-x-auto px-1 pb-1 outline-none [&_[data-slot=table-container]]:overflow-visible"
        >
          {table(false)}
        </div>
      </CodeBlock>
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent
          closeLabel={labels.close}
          // On the table: the arrow keys scroll it.
          initialFocus={scroller}
          size="full"
          // As wide as a wide table needs, and no wider.
          className="gap-3 sm:max-h-240 sm:max-w-6xl"
        >
          <DialogHeader>
            {/* The title clear of the close button (the dialog's); the
                buttons below, at the table's edge. */}
            <DialogTitle>{title ?? labels.fullScreen}</DialogTitle>
            <div className="flex items-center gap-0.5">
              <DialogDescription className="min-w-0 flex-1">
                {size}
              </DialogDescription>
              {actions}
            </div>
          </DialogHeader>
          {/* Its cells' text in line with the title. */}
          <div
            ref={scroller}
            role="region"
            aria-label={size}
            tabIndex={0}
            className="-mx-2 min-h-0 flex-1 overflow-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_[data-slot=table-container]]:overflow-visible"
          >
            {table(true)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export {
  TablePreview,
  tableToCsv,
  tableToMarkdown,
  tableToTsv,
  type TablePreviewLabels,
}
