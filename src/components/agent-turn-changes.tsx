"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, Globe02Icon } from "@hugeicons/core-free-icons"

import { ChipList, chipVariants } from "@/components/chip"
import {
  DiffBlock,
  type DiffBlockLabels,
  DiffFilesCard,
  type DiffLabels,
  DiffStat,
  defaultDiffLabels,
  diffTotals,
} from "@/components/diff-block"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { diffFiles, type DiffFile } from "@/lib/unified-diff"

type AgentTurnChangesLabels = Partial<DiffBlockLabels> & {
  /** The card's button that opens them all: "View all". */
  viewAll?: string
}

/** What `AgentTurnChangesProvider` shares with its card and its trigger. */
type ChangesContextValue = {
  files: readonly DiffFile[]
  open: boolean
  setOpen: (open: boolean) => void
  /** The card's id, for the trigger's `aria-controls`. */
  id: string
}

const ChangesContext = React.createContext<ChangesContextValue | null>(null)

/**
 * A turn's changes opened from its footer: around the turn and its
 * footer (in the `MessageContent`), it renders nothing of its own. Its
 * `AgentTurnChanges` under the answer is shown only while open; its
 * `AgentTurnChangesTrigger` in the `AgentTurnFooter` opens and closes it.
 * Closed by default; `open` / `onOpenChange` keep it where the app does.
 */
function AgentTurnChangesProvider({
  diff,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  /** The diff's text, or the files `parseUnifiedDiff` read. */
  diff: string | readonly DiffFile[]
  /** Whether the card is open, where the app keeps it. */
  open?: boolean | undefined
  /** Open at first; closed by default. */
  defaultOpen?: boolean | undefined
  /** Called as it opens or closes. */
  onOpenChange?: ((open: boolean) => void) | undefined
  children?: React.ReactNode
}) {
  const files = React.useMemo(() => diffFiles(diff), [diff])
  const [own, setOwn] = React.useState(defaultOpen)
  const open = openProp ?? own
  const id = React.useId()
  const setOpen = React.useCallback(
    (next: boolean) => {
      setOwn(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )
  const value = React.useMemo(
    () => ({ files, open, setOpen, id }),
    [files, open, setOpen, id]
  )
  return <ChangesContext value={value}>{children}</ChangesContext>
}

/**
 * The files a turn changed, under its answer once the turn has ended (not
 * while it runs: its edits are its steps'): one file as its diff (its
 * name and +n −n over its lines), several as a card of them ("3 files
 * changed +18 −3"), each row opening its file and "View all" all of
 * them, e.g. in the app's panel. The diff's text, or the files
 * `parseUnifiedDiff` read. With `lines`, a single file longer than that
 * folds in its own card. A dotted border-colour rule separates the
 * answer from the card, with 16px on either side.
 *
 * In an `AgentTurnChangesProvider` (its `diff` then the provider's), no
 * rule: the card a paragraph under the answer, shown only while the
 * footer's `AgentTurnChangesTrigger` has it open; closed, nothing of it
 * is rendered.
 */
function AgentTurnChanges({
  diff,
  onOpen,
  onViewAll,
  current,
  actions,
  numbers,
  lines,
  labels,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** Its diff; in a provider, the provider's. */
  diff?: string | readonly DiffFile[] | undefined
  /** Opens a file, by its name: e.g. its diff in the panel. */
  onOpen?: ((name: string) => void) | undefined
  /** Opens them all; with it, the card's "View all". */
  onViewAll?: (() => void) | undefined
  /** The file open beside, by its name: its row is marked. */
  current?: string | undefined
  /** In a single file's header: e.g. a copy button. */
  actions?: ((file: DiffFile) => React.ReactNode) | undefined
  /** A single file's line numbers: one column, or old and new. */
  numbers?: "one" | "both" | undefined
  /** A single file's lines shown before the rest is asked for. */
  lines?: number | undefined
  /** Its words, the fold's (`more`, `less`, `lines`, `collapse`) too. */
  labels?: AgentTurnChangesLabels | undefined
}) {
  const shared = React.useContext(ChangesContext)
  const own = React.useMemo(
    () => (diff === undefined ? undefined : diffFiles(diff)),
    [diff]
  )
  const files = own ?? shared?.files ?? []
  if (files.length === 0) return null
  const content =
    files.length === 1 ? (
      <DiffBlock
        diff={files}
        actions={actions}
        numbers={numbers}
        lines={lines}
        labels={labels}
      />
    ) : (
      <DiffFilesCard
        files={files}
        current={current}
        onSelect={onOpen}
        labels={labels}
        action={
          onViewAll && (
            <Button variant="outline" size="xs" onClick={onViewAll}>
              {labels?.viewAll ?? "View all"}
            </Button>
          )
        }
      />
    )
  if (shared)
    return (
      <Collapsible open={shared.open}>
        {/* Closed, nothing of the card is rendered. */}
        <CollapsibleContent
          id={shared.id}
          data-slot="agent-turn-changes"
          data-variant="footer"
          className={cn("min-w-0", className)}
          {...props}
        >
          <div className="pt-3">{content}</div>
        </CollapsibleContent>
      </Collapsible>
    )
  return (
    <div
      data-slot="agent-turn-changes"
      data-variant="card"
      className={cn("flow-root min-w-0", className)}
      {...props}
    >
      <div
        data-slot="agent-turn-changes-rule"
        aria-hidden="true"
        className="my-4 border-t border-dotted border-border"
      />
      {content}
    </div>
  )
}

/**
 * A fact of the turn, in its `AgentTurnInfo`, the first: "3 files changed
 * +6 −1" (`labels.filesChanged`, one file too, e.g. short, "3 files";
 * `labels.changes`) and a small chevron, in the facts' size and grey, a
 * dot after it as between them; hovered, in the text's colour alone.
 * It opens its provider's card under the answer (a disclosure: click,
 * Enter or Space). Where the footer is narrow it stays with the last
 * fact, its words cut before it is left out. Under a finger 44px to
 * press, the footer no taller.
 */
function AgentTurnChangesTrigger({
  labels: labelsProp,
  className,
  onClick,
  ...props
}: Omit<React.ComponentProps<"button">, "children"> & {
  labels?: Partial<Pick<DiffLabels, "filesChanged" | "changes">> | undefined
}) {
  const shared = React.useContext(ChangesContext)
  if (!shared || shared.files.length === 0) return null
  const { files, open, setOpen, id } = shared
  const labels = { ...defaultDiffLabels, ...labelsProp }
  return (
    <button
      type="button"
      data-slot="agent-turn-changes-trigger"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      className={cn(
        "relative inline-flex h-6 min-w-0 cursor-pointer items-center gap-1 rounded-sm whitespace-nowrap outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-colors pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:top-1/2 pointer-coarse:after:h-11 pointer-coarse:after:-translate-y-1/2",
        className
      )}
      {...props}
    >
      <span data-slot="agent-turn-changes-title" className="min-w-0 truncate">
        {labels.filesChanged(files.length)}
      </span>
      <DiffStat
        file={diffTotals(files)}
        labels={labels}
        className="text-xs text-current @max-sm:text-2sm"
      />
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        strokeWidth={2}
        aria-hidden="true"
        data-slot="agent-turn-changes-chevron"
        className={cn(
          "-ms-0.5 size-3 shrink-0 transition-transform motion-reduce:transition-none",
          !open && "-rotate-90"
        )}
      />
    </button>
  )
}

// A fact kept where the footer is narrow, before the others, out of their
// details' button.
AgentTurnChangesTrigger.keptInFooter = true

type AgentTurnSource = {
  /** Its address. */
  href: string
  /** What the chip says: by default the address's host ("vitejs.dev"). */
  title?: React.ReactNode
  /** Before it: by default a globe. */
  icon?: React.ReactNode
}

const host = (href: string) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return href
  }
}

/**
 * The pages a turn's answer drew on, as a row of chips under it: each a
 * link, its icon and its site.
 */
function AgentTurnSources({
  sources,
  label = "Sources",
  className,
  ...props
}: Omit<React.ComponentProps<"ul">, "children"> & {
  sources: readonly AgentTurnSource[]
  /** The list's name, for a screen reader. */
  label?: string
}) {
  if (sources.length === 0) return null
  return (
    <ChipList
      data-slot="agent-turn-sources"
      aria-label={label}
      className={className}
      {...props}
    >
      {sources.map((source) => (
        <li key={source.href} className="min-w-0">
          <a
            href={source.href}
            target="_blank"
            rel="noreferrer"
            className={chipVariants({ variant: "outline", size: "md" })}
          >
            {source.icon ?? (
              <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
            )}
            <span className="min-w-0 truncate">
              {source.title ?? host(source.href)}
            </span>
          </a>
        </li>
      ))}
    </ChipList>
  )
}

export {
  AgentTurnChanges,
  AgentTurnChangesProvider,
  AgentTurnChangesTrigger,
  AgentTurnSources,
  type AgentTurnChangesLabels,
  type AgentTurnSource,
}
