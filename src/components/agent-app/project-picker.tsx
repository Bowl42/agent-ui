"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Folder01Icon,
  FolderAddIcon,
  FolderRemoveIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxCollection,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** A project: the directory its conversations start in. */
type AppProject = {
  id: string
  /** Its directory: "~/code/agentui". */
  path: string
  /** Its name, if not its directory's. */
  name?: string
  /**
   * After its name, fainter, what tells it apart: e.g. "Worker". By
   * default, where two projects share a name, the directories above it.
   */
  hint?: string
  /** Why it cannot be used now, if it cannot: "The directory is gone". */
  unavailable?: string
}

/** Projects in a labelled place. Project ids must be unique across groups. */
type ProjectPickerGroup = {
  /** The place's unique id. */
  id: string
  /** The place's name, shown in the list and trigger. */
  label: string
  /** An optional icon beside its heading. */
  icon?: React.ReactNode
  /** Why the whole group cannot be used now, e.g. "Offline". */
  unavailable?: string
  /** Its projects, in the order to show them. */
  projects: AppProject[]
}

/**
 * The names projects are shown by: their directory's, and where two have
 * the same, the directories above it that tell them apart (`hint`).
 */
function projectNames(projects: AppProject[]) {
  const segments = (path: string) => path.split(/[\\/]+/).filter(Boolean)
  const names = new Map<string, { name: string; hint?: string }>()
  const byName = new Map<string, AppProject[]>()
  for (const project of projects) {
    const name = project.name ?? segments(project.path).at(-1) ?? project.path
    names.set(project.id, { name })
    byName.set(name, [...(byName.get(name) ?? []), project])
  }
  for (const [name, same] of byName) {
    if (same.length < 2) continue
    const parents = same.map((project) => segments(project.path).slice(0, -1))
    const longest = Math.max(...parents.map((parts) => parts.length))
    // As few directories above as tell them all apart.
    for (let depth = 1; depth <= longest; depth++) {
      const hints = parents.map((parts) => parts.slice(-depth).join("/"))
      if (new Set(hints).size === hints.length || depth === longest) {
        same.forEach((project, index) => {
          if (hints[index]) names.set(project.id, { name, hint: hints[index] })
        })
        break
      }
    }
  }
  // The app's own, where it gives one.
  for (const project of projects)
    if (project.hint)
      names.set(project.id, {
        name: names.get(project.id)!.name,
        hint: project.hint,
      })
  return names
}

type ProjectPickerLabels = {
  /** The picker's name, with the project picked: "Project: agentui". */
  picker: (project: string) => string
  /** The accessible name of a group's none row with more than one group. */
  noneIn: (group: string) => string
  /** The accessible name of a group's add row with more than one group. */
  addIn: (group: string) => string
  /** Between a project and its group, or a heading and its reason. */
  separator: string
  none: string
  search: string
  empty: string
  add: string
  /** While projects load, a search's or the next ones. */
  loading: string
}

const defaultLabels: ProjectPickerLabels = {
  picker: (project) => `Project: ${project}`,
  noneIn: (group) => `No project on ${group}`,
  addIn: (group) => `Add project on ${group}`,
  separator: " · ",
  none: "No project",
  search: "Search projects",
  empty: "No projects found",
  add: "Add project…",
  loading: "Loading projects…",
}

// No project's id starts with a NUL. Made, not written as "\u0000": the
// shadcn CLI writes an escape in a string as the character it stands for.
const NUL = String.fromCharCode(0)
const NONE = `${NUL}none`
const ADD = `${NUL}add`
const noneOf = (id: string) => `${NONE}${NUL}${id}`
const addOf = (id: string) => `${ADD}${NUL}${id}`

/**
 * Picks the project a new conversation starts in, or none: a button with
 * its name that opens a list to search. A project that cannot be used is
 * shown, with why, but cannot be picked; "Add project…" calls the app.
 * Projects may come in labelled groups, each with its own none and add
 * rows. An unavailable group has all rows disabled; with more than one
 * group the trigger names the picked group too.
 * `ghost`, a button in an input group's addon (a composer's);
 * `outline`, a form's field, as wide as it, as a select's trigger.
 *
 * Searched by the app (`onQueryChange`), its projects are the results,
 * shown as they are, "No project" kept for an empty search; with
 * `onLoadMore`, the next ones load as the list's end comes into view.
 * "Add project…" is apart, at the foot of the list, always in view.
 */
function ProjectPicker({
  projects,
  groups,
  group,
  value,
  onValueChange,
  onAddProject,
  onQueryChange,
  onLoadMore,
  loading = false,
  footer,
  selected,
  variant = "ghost",
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "value" | "onChange" | "children"> & {
  /** In an input group's addon, or a form's field. */
  variant?: "ghost" | "outline"
  /**
   * The project picked, where `projects` may not have it, e.g. searched by
   * the app: the trigger shows it. By default the last of `projects` it
   * was seen among.
   */
  selected?: AppProject | undefined
  /** The project picked; `null` for none. */
  value: string | null
  /** The group picked for none; ignored when a known project is picked. */
  group?: string | null
  onValueChange: (project: string | null, group: string | undefined) => void
  /**
   * How the app adds one, e.g. by choosing a directory; with what was
   * searched, e.g. a new project's name.
   */
  onAddProject?: (group: string | undefined, query: string) => void
  /**
   * The search, as it is typed: the app searches, and its projects are
   * the results, not filtered again.
   */
  onQueryChange?: (query: string) => void
  /** Loads the next ones, where there are more: as the list's end shows. */
  onLoadMore?: () => void
  /** While projects load, a search's or the next ones. */
  loading?: boolean
  /** The app's own content under the list, e.g. a folder browser. */
  footer?: React.ReactNode
  labels?: Partial<ProjectPickerLabels>
  className?: string
} & (
    | {
        /** In the order to show them, e.g. most recently used first. */
        projects: AppProject[]
        groups?: never
      }
    | {
        /**
         * The places projects live (a machine, a workspace), each a
         * labelled group; project ids are unique across them.
         */
        groups: ProjectPickerGroup[]
        projects?: never
      }
  )) {
  const labels = { ...defaultLabels, ...labelsProp }
  const remote = onQueryChange !== undefined
  const [query, setQuery] = React.useState("")
  const searched = query.trim().toLowerCase()
  const named = groups !== undefined && groups.length > 1
  const allProjects = React.useMemo(
    () => (groups ? groups.flatMap((item) => item.projects) : projects),
    [groups, projects]
  )
  const names = React.useMemo(
    () =>
      groups
        ? new Map(groups.flatMap((item) => [...projectNames(item.projects)]))
        : projectNames(projects),
    [groups, projects]
  )
  const byId = React.useMemo(
    () => new Map(allProjects.map((project) => [project.id, project])),
    [allProjects]
  )
  const groupById = React.useMemo(
    () => new Map(groups?.map((item) => [item.id, item])),
    [groups]
  )
  const groupOf = React.useMemo(
    () =>
      new Map(
        groups?.flatMap((item) =>
          item.projects.map((project) => [project.id, item] as const)
        )
      ),
    [groups]
  )
  const special = React.useMemo(
    () =>
      new Map<string, { group: ProjectPickerGroup; add: boolean }>(
        groups?.flatMap((item) => [
          [noneOf(item.id), { group: item, add: false }] as const,
          [addOf(item.id), { group: item, add: true }] as const,
        ])
      ),
    [groups]
  )
  const label = (id: string) => {
    const name = names.get(id)
    return name ? [name.name, name.hint].filter(Boolean).join(" ") : id
  }
  const flatItems = [
    // Searched by the app, "No project" is not among its results.
    ...(remote && searched ? [] : [NONE]),
    ...allProjects.map((project) => project.id),
    ...(onAddProject ? [ADD] : []),
  ]
  const groupedItems = groups?.map((item) => ({
    value: item.id,
    items: [
      noneOf(item.id),
      ...item.projects.map((project) => project.id),
      ...(onAddProject ? [addOf(item.id)] : []),
    ],
  }))
  // The picked one as last seen among the projects: searched by the app,
  // its results may not have it.
  const [seen, setSeen] = React.useState<AppProject>()
  const listed = value === null ? undefined : byId.get(value)
  if (listed && listed !== seen) setSeen(listed)
  const known =
    listed ??
    (selected?.id === value ? selected : undefined) ??
    (seen?.id === value ? seen : undefined)
  const pickedProject = known ? known.id : null
  const pickedGroup =
    (pickedProject ? groupOf.get(pickedProject) : undefined) ??
    groupById.get(group ?? "") ??
    groups?.[0]
  const picked = pickedProject ?? (pickedGroup ? noneOf(pickedGroup.id) : NONE)
  const shown = known
    ? (names.get(known.id) ?? projectNames([known]).get(known.id)!).name
    : labels.none
  const shownGroup = named ? pickedGroup : undefined
  const fullText =
    shown + (shownGroup ? labels.separator + shownGroup.label : "")
  const matches = (id: string, query: string) => {
    const item = special.get(id)
    const place = item?.group ?? groupOf.get(id)
    const text =
      id === NONE || (item && !item.add)
        ? labels.none
        : `${label(id)} ${byId.get(id)?.path ?? ""}`
    return `${text} ${place?.label ?? ""}`.toLowerCase().includes(query)
  }
  const row = (id: string) => {
    const item = special.get(id)
    const place = item?.group ?? groupOf.get(id)
    const isAdd = id === ADD || item?.add
    const isNone = id === NONE || (item && !item.add)
    if (isAdd || isNone)
      return (
        <ComboboxItem
          key={id}
          value={id}
          disabled={place?.unavailable !== undefined}
          aria-label={
            named && item
              ? isAdd
                ? labels.addIn(item.group.label)
                : labels.noneIn(item.group.label)
              : undefined
          }
        >
          <HugeiconsIcon
            icon={isAdd ? FolderAddIcon : FolderRemoveIcon}
            strokeWidth={2}
          />
          {isAdd ? labels.add : labels.none}
        </ComboboxItem>
      )
    return (
      <ComboboxItem
        key={id}
        value={id}
        disabled={
          byId.get(id)?.unavailable !== undefined ||
          place?.unavailable !== undefined
        }
      >
        <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
        <span className="flex min-w-0 flex-col">
          {/* The chosen one's name a step bolder, beside its tick. */}
          <span className="truncate group-aria-selected/combobox-item:font-medium">
            {/* The space outside its span: names read as words. */}
            {names.get(id)?.hint
              ? `${names.get(id)!.name} `
              : names.get(id)?.name}
            {names.get(id)?.hint && (
              <span className="text-muted-foreground">
                {names.get(id)!.hint}
              </span>
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {byId.get(id)?.unavailable ??
              place?.unavailable ??
              byId.get(id)?.path}
          </span>
        </span>
      </ComboboxItem>
    )
  }
  // Searched, none of its projects found: its own line, as "No project"
  // and "Add project…" are still there.
  const found = remote
    ? allProjects.length > 0
    : allProjects.some((project) => matches(project.id, searched))
  const foot = (
    <>
      {searched && !found && !loading && (
        <div
          data-slot="project-picker-empty"
          className="px-2 py-2 text-sm text-muted-foreground"
        >
          {labels.empty}
        </div>
      )}
      {loading && (
        <div
          role="status"
          data-slot="project-picker-loading"
          className="flex min-h-8 items-center gap-2 px-2 text-sm text-muted-foreground"
        >
          <Spinner aria-hidden="true" />
          {labels.loading}
        </div>
      )}
      {onLoadMore && !loading && allProjects.length > 0 && (
        <LoadMore onLoadMore={onLoadMore} />
      )}
    </>
  )
  // Without headings (no groups, or one): "Add project…" apart, at the
  // list's foot, in view however far it scrolls.
  const flatRow = (id: string) =>
    id === ADD || special.get(id)?.add ? (
      <React.Fragment key={id}>
        {groups ? null : foot}
        <div
          data-slot="project-picker-add"
          className="sticky -bottom-1 -mx-1 mt-1 -mb-1 bg-popover p-1 before:absolute before:inset-x-2 before:top-0 before:h-px before:bg-border"
        >
          {row(id)}
        </div>
      </React.Fragment>
    ) : (
      row(id)
    )

  return (
    <Combobox
      items={groupedItems ?? flatItems}
      value={picked}
      onValueChange={(next: string | null) => {
        if (next === null) return
        const item = special.get(next)
        if (next === ADD || item?.add) onAddProject?.(item?.group.id, query)
        else if (next === NONE || item) onValueChange(null, item?.group.id)
        else onValueChange(next, groupOf.get(next)?.id)
      }}
      itemToStringLabel={(id: string) => {
        const item = special.get(id)
        if (item)
          return item.add
            ? named
              ? labels.addIn(item.group.label)
              : labels.add
            : named
              ? labels.noneIn(item.group.label)
              : labels.none
        return id === NONE
          ? labels.none
          : id === ADD
            ? labels.add
            : `${label(id)} ${byId.get(id)?.path ?? ""}`
      }}
      isItemEqualToValue={(item: string, current: string) => item === current}
      onInputValueChange={(next: string) => {
        setQuery(next)
        onQueryChange?.(next)
      }}
      filter={
        remote
          ? null
          : (id: string, query: string) => {
              const normalized = query.trim().toLowerCase()
              if (!normalized || id === ADD) return true
              const item = special.get(id)
              if (item?.add)
                return [
                  noneOf(item.group.id),
                  ...item.group.projects.map((project) => project.id),
                ].some((other) => matches(other, normalized))
              return matches(id, normalized)
            }
      }
    >
      <ComboboxTrigger
        data-slot="project-picker"
        data-variant={variant}
        // In a form, its field's label names it (`id`); else its name
        // says the project picked.
        {...(props.id === undefined && props["aria-labelledby"] === undefined
          ? { "aria-label": labels.picker(fullText) }
          : {})}
        {...props}
        render={
          variant === "outline" ? (
            <Button
              variant="outline"
              className={cn(
                "w-full min-w-0 justify-start font-normal",
                className
              )}
            />
          ) : (
            <InputGroupButton
              size="sm"
              className={cn(contextPill, "min-w-0", className)}
            />
          )
        }
      >
        {pickedProject === null ? (
          <HugeiconsIcon icon={FolderRemoveIcon} strokeWidth={2} />
        ) : (
          <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
        )}
        <span className="min-w-0 flex-1 truncate text-start">
          {shown}
          {shownGroup && (
            <span className="text-muted-foreground">
              {labels.separator}
              {shownGroup.label}
            </span>
          )}
        </span>
      </ComboboxTrigger>
      <ComboboxContent
        className={
          variant === "outline" ? "w-(--anchor-width) min-w-72" : "w-72"
        }
        aria-label={labels.search}
      >
        <ComboboxInput
          showTrigger={false}
          placeholder={labels.search}
          aria-label={labels.search}
        />
        {groups && <ComboboxEmpty>{labels.empty}</ComboboxEmpty>}
        {groups ? (
          <ComboboxList aria-label={labels.search}>
            {(item: { value: string; items: string[] }, index: number) => {
              const place = groupById.get(item.value)!
              const heading =
                groups.length > 1 || place.unavailable !== undefined
              if (!heading)
                return (
                  <React.Fragment key={item.value}>
                    {item.items.map(flatRow)}
                  </React.Fragment>
                )
              return (
                <React.Fragment key={item.value}>
                  {index > 0 && <ComboboxSeparator />}
                  <ComboboxGroup items={item.items}>
                    <ComboboxLabel className="flex items-center gap-1">
                      {place.icon && (
                        <span aria-hidden="true" className="*:size-3.5">
                          {place.icon}
                        </span>
                      )}
                      <span>
                        {place.label}
                        {place.unavailable !== undefined && (
                          <>
                            {labels.separator}
                            {place.unavailable}
                          </>
                        )}
                      </span>
                    </ComboboxLabel>
                    <ComboboxCollection>{row}</ComboboxCollection>
                  </ComboboxGroup>
                </React.Fragment>
              )
            }}
          </ComboboxList>
        ) : (
          <ComboboxList
            aria-label={labels.search}
            aria-busy={loading || undefined}
          >
            <ComboboxCollection>{flatRow}</ComboboxCollection>
            {!onAddProject && foot}
          </ComboboxList>
        )}
        {footer ? (
          <div
            data-slot="project-picker-footer"
            className="relative p-1 before:absolute before:inset-x-2 before:top-0 before:h-px before:bg-border"
          >
            {footer}
          </div>
        ) : null}
      </ComboboxContent>
    </Combobox>
  )
}

/** At the end of the list: the next ones, as it comes into view. */
function LoadMore({ onLoadMore }: { onLoadMore: () => void }) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const load = React.useEffectEvent(onLoadMore)
  React.useEffect(() => {
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) load()
      },
      { root: node.closest("[data-slot=combobox-list]"), rootMargin: "64px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return <div ref={setNode} data-slot="project-picker-more" className="h-px" />
}

/**
 * A project's name and folder, its directory in a tooltip: where it is
 * not picked. As a span the keyboard can reach, or as `render`, e.g. a
 * breadcrumb's link to the project's page.
 */
function ProjectName({
  project,
  render,
  icon = true,
  className,
}: {
  project: AppProject
  render?: React.ReactElement | undefined
  /** Its folder before its name; none where the name is a path's part. */
  icon?: boolean
  className?: string
}) {
  const name = projectNames([project]).get(project.id)!.name
  return (
    <Tooltip>
      <TooltipTrigger
        data-slot="project-name"
        // Focusable, so the keyboard can show its directory.
        render={render ?? <span tabIndex={0} />}
        className={cn(
          "inline-flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0",
          className
        )}
      >
        {icon && (
          <HugeiconsIcon
            icon={Folder01Icon}
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 truncate">{name}</span>
        <span className="sr-only">, {project.path}</span>
      </TooltipTrigger>
      <TooltipContent>{project.path}</TooltipContent>
    </Tooltip>
  )
}

/**
 * A pill of a composer's context row: 28px, no edge (a fill on hover),
 * 12px, its 14px icon a grey lighter than its value, and a 12px chevron;
 * the row puts a short line between pills. The
 * project picker's look, for the app's own pickers beside it (e.g. the
 * machine, the agent). (`:not([class*='size-'])`, as the button's own
 * 16px rule, which a plain `svg` would lose to.)
 */
const contextPill =
  "h-7 gap-1 rounded-md px-2 text-xs font-normal text-muted-foreground hover:text-foreground [&>svg:not([class*='size-'])]:size-3.5 [&>svg:last-child:not([class*='size-'])]:size-3 [&>svg:not(:last-child)]:text-subtle-foreground pointer-coarse:h-9 pointer-coarse:text-sm"

/**
 * A button of a `ComposerContext`'s row, as its project picker: e.g. a
 * menu of where it runs.
 */
function ComposerContextButton({
  className,
  ...props
}: React.ComponentProps<typeof InputGroupButton>) {
  return (
    <InputGroupButton
      size="sm"
      data-slot="composer-context-button"
      className={cn(contextPill, "min-w-0", className)}
      {...props}
    />
  )
}

/**
 * The row at the top of a `Composer` that says where its conversation
 * runs. For a new conversation, its project is picked here; once it has
 * started, its project is fixed and in the header, so the row is gone,
 * unless the app has more to show in it (`children`, e.g. the machine it
 * runs on), when its project is shown, not picked.
 */
function ComposerContext({
  started,
  children,
  className,
  ...picker
}: React.ComponentProps<typeof ProjectPicker> & {
  /** Whether its conversation has started. */
  started: boolean
  /** The app's other context. */
  children?: React.ReactNode
}) {
  const project =
    picker.value === null
      ? undefined
      : ((
          picker.groups?.flatMap((item) => item.projects) ??
          picker.projects ??
          []
        ).find((item) => item.id === picker.value) ??
        (picker.selected?.id === picker.value ? picker.selected : undefined))
  if (started && !children) return null
  return (
    <InputGroupAddon
      align="block-start"
      data-slot="composer-context"
      className={cn(
        "gap-1 px-2 pt-2 pb-0 text-xs text-muted-foreground",
        className
      )}
    >
      {[
        !started ? (
          <ProjectPicker key="project" {...picker} />
        ) : project ? (
          <ProjectName key="project" project={project} />
        ) : null,
        ...React.Children.toArray(children),
      ]
        .filter(Boolean)
        .map((part, index) => (
          <React.Fragment key={index}>
            {/* A short line between pills, as their edges were. */}
            {index > 0 && (
              <Separator
                orientation="vertical"
                data-slot="composer-context-separator"
                className="mx-0.5 data-vertical:h-4 data-vertical:self-center"
              />
            )}
            {part}
          </React.Fragment>
        ))}
    </InputGroupAddon>
  )
}

export {
  ComposerContext,
  ComposerContextButton,
  ProjectName,
  ProjectPicker,
  projectNames,
  type AppProject,
  type ProjectPickerLabels,
  type ProjectPickerGroup,
}
