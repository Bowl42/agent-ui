"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Csv01Icon,
  FilterIcon,
  SortByDown02Icon,
  SortByUp02Icon,
} from "@hugeicons/core-free-icons"

import {
  ViewerAddToChat,
  ViewerFilter,
  ViewerFrame,
  ViewerStatusSeparator,
  ViewerStatusText,
  ViewerTool,
  type ViewerFrameProps,
  type ViewerLabels,
} from "@/components/viewer"

/**
 * CSV text as rows of cells (RFC 4180): quoted cells may hold commas,
 * quotes ("") and lines; lines end in LF or CRLF.
 */
function parseCsv(text: string, separator = ","): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let at = 0; at < text.length; at++) {
    const char = text[at]!
    if (quoted) {
      if (char === '"') {
        if (text[at + 1] === '"') {
          cell += '"'
          at++
        } else quoted = false
      } else cell += char
    } else if (char === '"' && cell === "") quoted = true
    else if (char === separator) {
      row.push(cell)
      cell = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[at + 1] === "\n") at++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += char
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

type TableColumnType = "text" | "number"

type TableViewerColumn = {
  name: string
  /** How its cells are read; by default numbers if all of them are. */
  type?: TableColumnType | undefined
}

type TableCellPosition = { row: number; column: number }

type TableViewerLabels = {
  filter: string
  /** The sort button: by the picked cell's column. */
  sort: (column: string, descending: boolean) => string
  /** The column types under their names. */
  types: Record<TableColumnType, string>
  /** The picked cell, in the status bar: "Row 4 · seats". */
  cell: (row: number, column: string) => string
  /** The total of a column of numbers: "Sum 8,822". */
  sum: (sum: string) => string
  rows: (count: number) => string
  columns: (count: number) => string
  empty: string
}

const defaultLabels: TableViewerLabels = {
  filter: "Filter rows",
  sort: (column, descending) =>
    `Sort by ${column}, ${descending ? "descending" : "ascending"}`,
  types: { text: "text", number: "num" },
  cell: (row, column) => `Row ${row} · ${column}`,
  sum: (sum) => `Sum ${sum}`,
  rows: (count) => `${count.toLocaleString()} ${count === 1 ? "row" : "rows"}`,
  columns: (count) => `${count} ${count === 1 ? "column" : "columns"}`,
  empty: "No rows",
}

/** A cell's number, if it is one: "1,204" and "9" are, "—" and "" not. */
function numberOf(cell: string | undefined) {
  if (cell === undefined) return undefined
  const text = cell.trim().replaceAll(",", "")
  if (text === "" || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?%?$/i.test(text))
    return undefined
  return Number.parseFloat(text)
}

const empty = (cell: string | undefined) =>
  cell === undefined || /^\s*(—|-|)\s*$/.test(cell)

// A row's height, in pixels: rows are drawn only near the view.
const rowHeight = 32
const overscan = 10

/**
 * A table of the app's, e.g. a CSV file: the row numbers, each column's
 * type under its name, numbers to the end; only the rows in view drawn,
 * so any number of them scroll. A cell is picked by a click or the arrow
 * keys; the status bar says which, and a column of numbers' sum. Rows
 * are filtered by text and sorted by the picked cell's column; "@" gives
 * the picked cell to the app.
 */
function TableViewer({
  columns: columnsProp,
  rows,
  totalRows,
  selected: selectedProp,
  onSelectedChange,
  onAddToChat,
  details = [],
  labels: labelsProp,
  icon = <HugeiconsIcon icon={Csv01Icon} strokeWidth={2} />,
  ...frame
}: Omit<ViewerFrameProps, "onAddToChat"> & {
  columns: readonly (string | TableViewerColumn)[]
  /** The rows' cells as text, in the columns' order. */
  rows: readonly (readonly string[])[]
  /** How many rows it has, where the app gave only some. */
  totalRows?: number | undefined
  /** The picked cell, by its place in `rows`: the viewer's own, or the app's. */
  selected?: TableCellPosition | null | undefined
  onSelectedChange?: ((cell: TableCellPosition | null) => void) | undefined
  /** "@": the picked cell (its value, row and column), or none. */
  onAddToChat?:
    | ((
        cell: (TableCellPosition & { value: string; name: string }) | null
      ) => void)
    | undefined
  labels?: Partial<TableViewerLabels & ViewerLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const columns = React.useMemo(
    () =>
      columnsProp.map(
        (column, index): { name: string; type: TableColumnType } => {
          const { name, type } =
            typeof column === "string"
              ? { name: column, type: undefined }
              : column
          return {
            name,
            type:
              type ??
              (rows.some((row) => !empty(row[index])) &&
              rows.every(
                (row) => empty(row[index]) || numberOf(row[index]) !== undefined
              )
                ? "number"
                : "text"),
          }
        }
      ),
    [columnsProp, rows]
  )

  const [ownSelected, setOwnSelected] =
    React.useState<TableCellPosition | null>(null)
  const selected = selectedProp === undefined ? ownSelected : selectedProp
  const select = (cell: TableCellPosition | null) => {
    setOwnSelected(cell)
    onSelectedChange?.(cell)
  }

  const [filtering, setFiltering] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<{
    column: number
    descending: boolean
  }>()

  // The rows shown, by their place in `rows`.
  const order = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    let shown = rows.map((_, index) => index)
    if (term)
      shown = shown.filter((index) =>
        rows[index]!.some((cell) => cell.toLowerCase().includes(term))
      )
    if (sort) {
      const { column, descending } = sort
      const numeric = columns[column]?.type === "number"
      const collator = new Intl.Collator(undefined, { numeric: true })
      shown.sort((a, b) => {
        const x = rows[a]![column]
        const y = rows[b]![column]
        // Empty cells last, either way.
        if (empty(x) !== empty(y)) return empty(x) ? 1 : -1
        const by = numeric
          ? (numberOf(x) ?? 0) - (numberOf(y) ?? 0)
          : collator.compare(x ?? "", y ?? "")
        return descending ? -by : by
      })
    }
    return shown
  }, [rows, columns, query, sort])

  const scroller = React.useRef<HTMLDivElement>(null)
  const [view, setView] = React.useState({ top: 0, height: 600 })
  React.useLayoutEffect(() => {
    const node = scroller.current
    if (!node) return
    const measure = () =>
      setView({ top: node.scrollTop, height: node.clientHeight || 600 })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const first = Math.max(0, Math.floor(view.top / rowHeight) - overscan)
  const last = Math.min(
    order.length,
    Math.ceil((view.top + view.height) / rowHeight) + overscan
  )

  // The picked cell's place among the rows shown.
  const at = selected ? order.indexOf(selected.row) : -1
  const id = React.useId()
  const cellId = (row: number, column: number) => `${id}-${row}-${column}`

  const move = (position: number, column: number) => {
    const index = Math.min(order.length - 1, Math.max(0, position))
    const row = order[index]
    if (row === undefined) return
    select({
      row,
      column: Math.min(columns.length - 1, Math.max(0, column)),
    })
    // In view, so that it is drawn: below the sticky header.
    const node = scroller.current
    if (!node) return
    const top = index * rowHeight
    const header = 32
    if (top < node.scrollTop) node.scrollTop = top
    else if (top + rowHeight + header > node.scrollTop + node.clientHeight)
      node.scrollTop = top + rowHeight + header - node.clientHeight
  }

  const column = selected ? columns[selected.column] : undefined
  const sum =
    column?.type === "number" && selected
      ? order.reduce(
          (total, row) => total + (numberOf(rows[row]![selected.column]) ?? 0),
          0
        )
      : undefined

  return (
    <ViewerFrame
      data-viewer="table"
      icon={icon}
      labels={labelsProp}
      tools={
        <>
          <ViewerTool
            label={labels.filter}
            pressed={filtering}
            onClick={() => {
              if (filtering) setQuery("")
              setFiltering(!filtering)
            }}
          >
            <HugeiconsIcon icon={FilterIcon} strokeWidth={2} />
          </ViewerTool>
          <ViewerTool
            label={labels.sort(
              columns[selected?.column ?? 0]?.name ?? "",
              sort?.column === (selected?.column ?? 0) && !sort.descending
            )}
            disabled={columns.length === 0}
            pressed={sort !== undefined}
            onClick={() => {
              const by = selected?.column ?? 0
              setSort(
                sort?.column !== by
                  ? { column: by, descending: false }
                  : !sort.descending
                    ? { column: by, descending: true }
                    : undefined
              )
            }}
          >
            {sort?.descending ? (
              <HugeiconsIcon icon={SortByDown02Icon} strokeWidth={2} />
            ) : (
              <HugeiconsIcon icon={SortByUp02Icon} strokeWidth={2} />
            )}
          </ViewerTool>
          {onAddToChat && (
            <ViewerAddToChat
              {...(labelsProp?.addToChat
                ? { label: labelsProp.addToChat }
                : {})}
              onClick={() =>
                onAddToChat(
                  selected
                    ? {
                        ...selected,
                        value: rows[selected.row]?.[selected.column] ?? "",
                        name: columns[selected.column]?.name ?? "",
                      }
                    : null
                )
              }
            />
          )}
        </>
      }
      controls={
        selected &&
        column && (
          <>
            <ViewerStatusText>
              {labels.cell(selected.row + 1, column.name)}
            </ViewerStatusText>
            {sum !== undefined && (
              <>
                <ViewerStatusSeparator />
                <ViewerStatusText>
                  {labels.sum(sum.toLocaleString())}
                </ViewerStatusText>
              </>
            )}
          </>
        )
      }
      facts={[
        labels.rows(totalRows ?? rows.length),
        labels.columns(columns.length),
        ...details,
      ]}
      {...frame}
    >
      {filtering && (
        <div className="border-b px-3 py-2">
          <ViewerFilter
            autoFocus
            icon={<HugeiconsIcon icon={FilterIcon} strokeWidth={2} />}
            label={labels.filter}
            clearLabel={labels.clearFilter}
            value={query}
            onValueChange={setQuery}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return
              event.preventDefault()
              event.stopPropagation()
              setQuery("")
              setFiltering(false)
            }}
          />
        </div>
      )}
      <div
        ref={scroller}
        data-slot="table-viewer-scroller"
        className="min-h-0 flex-1 overflow-auto"
        onScroll={(event) =>
          setView({
            top: event.currentTarget.scrollTop,
            height: event.currentTarget.clientHeight || 600,
          })
        }
      >
        <table
          role="grid"
          tabIndex={0}
          aria-label={frame.name}
          aria-rowcount={order.length + 1}
          aria-colcount={columns.length + 1}
          aria-activedescendant={
            selected && at >= 0
              ? cellId(selected.row, selected.column)
              : undefined
          }
          data-slot="table-viewer"
          className="w-full border-separate border-spacing-0 text-2sm outline-none focus-visible:[&_[aria-selected=true]]:ring-3 focus-visible:[&_[aria-selected=true]]:ring-ring/50"
          onKeyDown={(event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return
            const row = Math.max(0, at)
            const col = selected?.column ?? 0
            const page = Math.max(
              1,
              Math.floor((scroller.current?.clientHeight ?? 300) / rowHeight) -
                1
            )
            const rtl =
              getComputedStyle(event.currentTarget).direction === "rtl"
            const key =
              rtl && event.key === "ArrowLeft"
                ? "ArrowRight"
                : rtl && event.key === "ArrowRight"
                  ? "ArrowLeft"
                  : event.key
            if (!selected && key.startsWith("Arrow")) move(0, 0)
            else if (key === "ArrowDown") move(row + 1, col)
            else if (key === "ArrowUp") move(row - 1, col)
            else if (key === "ArrowRight") move(row, col + 1)
            else if (key === "ArrowLeft") move(row, col - 1)
            else if (key === "PageDown") move(row + page, col)
            else if (key === "PageUp") move(row - page, col)
            else if (key === "Home") move(event.shiftKey ? 0 : row, 0)
            else if (key === "End")
              move(event.shiftKey ? order.length - 1 : row, columns.length - 1)
            else return
            event.preventDefault()
          }}
        >
          <thead>
            <tr aria-rowindex={1}>
              <th
                aria-colindex={1}
                className="sticky top-0 z-10 h-8 w-10 border-e border-b bg-muted px-2 text-end"
              >
                <span className="sr-only">#</span>
              </th>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  aria-colindex={index + 2}
                  aria-sort={
                    sort?.column === index
                      ? sort.descending
                        ? "descending"
                        : "ascending"
                      : undefined
                  }
                  className={cn(
                    "sticky top-0 z-10 h-8 border-e border-b bg-muted px-3 text-start text-xs font-medium whitespace-nowrap text-muted-foreground last:border-e-0",
                    column.type === "number" && "text-end"
                  )}
                >
                  {column.name}{" "}
                  <small className="ms-1 text-2xs font-normal text-muted-foreground">
                    {labels.types[column.type]}
                  </small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {first > 0 && (
              <tr aria-hidden="true" style={{ height: first * rowHeight }} />
            )}
            {order.slice(first, last).map((row, offset) => {
              const position = first + offset
              const picked = selected?.row === row
              return (
                <tr
                  key={row}
                  aria-rowindex={position + 2}
                  aria-selected={picked}
                  className="group/row"
                >
                  <td
                    aria-colindex={1}
                    className="h-8 border-e border-b px-2 text-end text-2xs text-muted-foreground tabular-nums group-aria-selected/row:bg-muted"
                  >
                    {row + 1}
                  </td>
                  {columns.map((column, index) => {
                    const value = rows[row]![index] ?? ""
                    const isPicked = picked && selected?.column === index
                    return (
                      <td
                        key={index}
                        id={cellId(row, index)}
                        role="gridcell"
                        aria-colindex={index + 2}
                        aria-selected={isPicked}
                        className={cn(
                          "h-8 max-w-80 truncate border-e border-b px-3 whitespace-nowrap group-aria-selected/row:bg-muted last:border-e-0",
                          column.type === "number" && "text-end tabular-nums",
                          empty(value) && "text-muted-foreground",
                          "aria-selected:bg-background aria-selected:ring-(length:--line-mark) aria-selected:ring-foreground aria-selected:ring-inset group-aria-selected/row:aria-selected:bg-background"
                        )}
                        onClick={() => select({ row, column: index })}
                      >
                        {empty(value) && column.type === "number" ? "—" : value}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {last < order.length && (
              <tr
                aria-hidden="true"
                style={{ height: (order.length - last) * rowHeight }}
              />
            )}
          </tbody>
        </table>
        {order.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {labels.empty}
          </p>
        )}
      </div>
    </ViewerFrame>
  )
}

export {
  TableViewer,
  parseCsv,
  type TableCellPosition,
  type TableColumnType,
  type TableViewerColumn,
  type TableViewerLabels,
}
