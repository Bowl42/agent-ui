"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CodeIcon } from "@hugeicons/core-free-icons"

import { Clamp, type ClampLabels } from "@/components/clamp"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { Toggle } from "@/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"

type ToolCallDataLabels = {
  /** The header's toggle between its fields and the JSON as it came. */
  raw: string
  copy: string
  copied: string
  /** Copying was refused. */
  failed: string
  /** A field whose value is an empty string. */
  empty: string
  /** A long value's "Show all" and its length. */
  clamp?: Partial<ClampLabels> | undefined
}

const defaultToolCallDataLabels: ToolCallDataLabels = {
  raw: "Raw JSON",
  copy: "Copy",
  copied: "Copied",
  failed: "Could not copy",
  empty: "Empty",
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type JsonObject = { [key: string]: Json }

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Text that is a JSON object or array, parsed; else undefined. */
function parseJson(text: string): Json | undefined {
  const trimmed = text.trim()
  if (!/^[[{]/.test(trimmed)) return undefined
  try {
    return JSON.parse(trimmed) as Json
  } catch {
    return undefined
  }
}

/**
 * An MCP tool's name, `mcp__<server>__<tool>`, as its server and tool
 * (`mcp__github__create_issue`: github, create_issue), for a title such as "create_issue ·
 * github"; undefined for any other name.
 */
function mcpToolName(
  name: string
): { server: string; tool: string } | undefined {
  const match = /^mcp__(.+?)__(.+)$/.exec(name)
  return match ? { server: match[1]!, tool: match[2]! } : undefined
}

/** A JSON value, formatted and coloured, folding past 8 lines. */
function JsonBlock({ value }: { value: Json }) {
  const lines = useHighlightedCode(JSON.stringify(value, null, 2), "json")
  return (
    <CodeBlock size="sm" lines={8} data-slot="tool-call-data-json">
      <CodeBlockContent wrap>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

/**
 * A field's value: text as text, its lines kept, long text cut to 6 lines
 * over "Show all"; a number, true, false or null as code; an object or an
 * array, or text that is one in JSON, a JSON block.
 */
function FieldValue({
  value,
  labels,
}: {
  value: Json
  labels: ToolCallDataLabels
}) {
  if (typeof value === "string") {
    const parsed = parseJson(value)
    if (parsed !== undefined) return <JsonBlock value={parsed} />
    if (value === "")
      return (
        <span className="text-subtle-foreground italic">{labels.empty}</span>
      )
    return (
      <Clamp
        lines={6}
        labels={labels.clamp ?? {}}
        className="font-sans text-xs/5 wrap-break-word whitespace-pre-wrap text-foreground"
      >
        {value}
      </Clamp>
    )
  }
  if (value === null || typeof value !== "object")
    return (
      <code
        data-type={value === null ? "null" : typeof value}
        className="font-mono text-xs/5 text-foreground"
      >
        {String(value)}
      </code>
    )
  return <JsonBlock value={value} />
}

/**
 * A tool call's input or output, to read: a JSON object (as text or a
 * value) as its fields, each its key beside its value (over it where
 * narrow; see `FieldValue`);
 * other text as text, coloured in `language` (e.g. "ansi" for a
 * terminal's, its lines not wrapped; plain text and JSON wrap), folding
 * past 12 lines. Its header has its title, the
 * app's actions, a toggle to the JSON as it came (formatted) and copy,
 * which copies it as it came.
 */
function ToolCallData({
  value,
  title,
  language = "text",
  note,
  actions,
  raw: rawProp,
  defaultRaw = false,
  onRawChange,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title" | "children"> & {
  /** What was sent or came back: text (JSON or not) or a JSON value. */
  value: unknown
  /** Whose it is: "Input", "Output". */
  title?: React.ReactNode
  /** Text that is not a JSON object: its language. */
  language?: string
  /** Under it, e.g. that it was cut short. */
  note?: React.ReactNode
  /** Before the toggle and copy, e.g. a button that opens it beside. */
  actions?: React.ReactNode
  /** Showing the JSON as it came rather than its fields. */
  raw?: boolean
  defaultRaw?: boolean
  onRawChange?: (raw: boolean) => void
  labels?: Partial<ToolCallDataLabels>
}) {
  const labels = { ...defaultToolCallDataLabels, ...labelsProp }
  const [ownRaw, setOwnRaw] = React.useState(defaultRaw)
  const raw = rawProp ?? ownRaw
  const text =
    typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? "")
  const parsed = React.useMemo(
    () => (typeof value === "string" ? parseJson(value) : (value as Json)),
    [value]
  )
  const fields =
    isObject(parsed) && Object.keys(parsed).length > 0 ? parsed : undefined
  const shown =
    parsed === undefined
      ? { code: text, language }
      : { code: JSON.stringify(parsed, null, 2), language: "json" }
  const lines = useHighlightedCode(shown.code, shown.language)
  const view = fields && !raw ? "fields" : parsed === undefined ? "text" : "raw"
  const setRaw = (next: boolean) => {
    setOwnRaw(next)
    onRawChange?.(next)
  }

  return (
    <CodeBlock
      size="sm"
      lines={view === "fields" ? undefined : 12}
      data-slot="tool-call-data"
      data-view={view}
      className={className}
      {...props}
    >
      <CodeBlockHeader>
        {title !== undefined && <CodeBlockTitle>{title}</CodeBlockTitle>}
        <CodeBlockActions>
          {actions}
          {fields && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Toggle
                    size="sm"
                    aria-label={labels.raw}
                    pressed={raw}
                    onPressedChange={setRaw}
                  >
                    <HugeiconsIcon icon={CodeIcon} strokeWidth={2} />
                  </Toggle>
                }
              />
              <TooltipContent>{labels.raw}</TooltipContent>
            </Tooltip>
          )}
          <CodeBlockCopyButton
            value={text}
            labels={{
              copy: labels.copy,
              copied: labels.copied,
              failed: labels.failed,
            }}
          />
        </CodeBlockActions>
      </CodeBlockHeader>
      {view === "fields" ? (
        <dl
          data-slot="tool-call-data-fields"
          className="@container flex flex-col divide-y divide-border font-sans"
        >
          {Object.entries(fields!).map(([key, field]) => (
            <div
              key={key}
              data-slot="tool-call-data-field"
              className="flex min-w-0 flex-col gap-0.5 px-3 py-2 @sm:flex-row @sm:gap-3"
            >
              <dt className="font-mono text-xs/5 break-all text-muted-foreground @sm:w-28 @sm:shrink-0">
                {key}
              </dt>
              <dd className="min-w-0 flex-1">
                <FieldValue value={field} labels={labels} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <CodeBlockContent wrap={view === "raw" || language === "text"}>
          {lines.map((line, index) => (
            <CodeBlockLine key={index}>{line}</CodeBlockLine>
          ))}
        </CodeBlockContent>
      )}
      {note !== undefined && <CodeBlockFooter>{note}</CodeBlockFooter>}
    </CodeBlock>
  )
}

export {
  ToolCallData,
  defaultToolCallDataLabels,
  mcpToolName,
  type ToolCallDataLabels,
}
