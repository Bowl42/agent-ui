import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FolderOpenIcon,
  LaptopIcon,
  ComputerIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, screen, waitFor, userEvent, within } from "storybook/test"

import {
  ProjectPicker,
  type AppProject,
  type ProjectPickerGroup,
} from "@/components/agent-app/project-picker"
import { composerSelectRow } from "@/components/composer-select"

import { FolderPicker } from "@/components/folder-picker"
import { folderTree, loadFolder, updateFolder } from "@/stories/folder-tree"

const projects: AppProject[] = [
  { id: "agentui", path: "~/src/agentui" },
  { id: "docs", path: "~/src/docs" },
]

function Demo({ onBrowse }: { onBrowse: () => void }) {
  const [value, setValue] = React.useState<string | null>("agentui")
  const [items, setItems] = React.useState(projects)
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<string | null>(null)
  const [tree, setTree] = React.useState(folderTree)
  return (
    <>
      <ProjectPicker
        variant="outline"
        className="w-72"
        projects={items}
        value={value}
        onValueChange={setValue}
        footer={
          <button
            type="button"
            className={composerSelectRow}
            onClick={() => {
              onBrowse()
              setOpen(true)
            }}
          >
            <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} />
            Browse folders…
          </button>
        }
      />
      <FolderPicker
        open={open}
        onOpenChange={setOpen}
        folder={tree}
        selected={selected}
        onSelect={(folder) => setSelected(folder.id)}
        // Loaded as the app would: a folder's content comes back later.
        onLoad={(folder) => {
          void loadFolder(folder).then((children) =>
            setTree((root) =>
              updateFolder(root, folder.id, (entry) => ({ ...entry, children }))
            )
          )
        }}
        onChoose={(folder) => {
          setItems((current) => [
            ...current,
            { id: folder.id, path: folder.id },
          ])
          setValue(folder.id)
          setOpen(false)
        }}
      />
    </>
  )
}

const meta = {
  title: "Blocks/Agent App/Project Picker",
  component: Demo,
  parameters: { layout: "centered" },
  args: { onBrowse: fn() },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

/** The app's own content under the list, e.g. a way to browse folders. */
export const Footer: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Project: agentui" })
    )
    const popup = await screen.findByRole("dialog", { name: "Search projects" })
    await userEvent.click(
      within(popup).getByRole("button", { name: "Browse folders…" })
    )
    await expect(args.onBrowse).toHaveBeenCalled()
    const dialog = await screen.findByRole("dialog", {
      name: "Choose a folder",
    })
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    )
    await userEvent.click(within(dialog).getByRole("option", { name: "code" }))
    await userEvent.click(
      await within(dialog).findByRole("option", { name: "vesper" })
    )
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Choose" })
    )
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Choose a folder" })
      ).not.toBeInTheDocument()
    )
    await expect(canvas.getByRole("combobox")).toHaveAccessibleName(
      "Project: vesper"
    )
  },
}

const groupedProjects: ProjectPickerGroup[] = [
  {
    id: "spare",
    label: "Spare Laptop",
    icon: <HugeiconsIcon icon={LaptopIcon} />,
    projects: [
      { id: "alpha", path: "~/src/alpha" },
      { id: "beta", path: "~/src/beta" },
    ],
  },
  {
    id: "build",
    label: "CI runner",
    icon: <HugeiconsIcon icon={ComputerIcon} />,
    unavailable: "Offline",
    projects: [{ id: "build-alpha", path: "~/builds/alpha" }],
  },
]
const changed = fn()
const added = fn()

/**
 * Projects by where they live (here machines), each group with its own
 * "No project" and "Add project…"; an offline one's rows disabled. Names
 * are told apart within a group: both machines have an "alpha".
 */
export const Groups: Story = {
  render: function Render() {
    const [value, setValue] = React.useState<string | null>("alpha")
    const [group, setGroup] = React.useState<string | null>(null)
    return (
      <ProjectPicker
        variant="outline"
        className="w-72"
        groups={groupedProjects}
        value={value}
        group={group}
        onValueChange={(project, place) => {
          changed(project, place)
          setValue(project)
          setGroup(place ?? null)
        }}
        onAddProject={added}
      />
    )
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox")
    const open = async () => {
      await userEvent.click(trigger)
      const popup = await screen.findByRole("dialog", {
        name: "Search projects",
      })
      await waitFor(() =>
        expect(within(popup).getByRole("combobox")).toHaveFocus()
      )
      return popup
    }
    await open()
    const spare = await screen.findByRole("group", { name: "Spare Laptop" })
    const build = await screen.findByRole("group", {
      name: "CI runner · Offline",
    })
    // Named "alpha" in both: no directory hint ("src", "builds") after it.
    for (const place of [spare, build])
      await expect(
        within(within(place).getByRole("option", { name: /alpha/ })).getByText(
          "alpha",
          { exact: true }
        )
      ).toBeInTheDocument()
    for (const option of within(build).getAllByRole("option"))
      await expect(option).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(within(spare).getByRole("option", { name: /beta/ }))
    await expect(changed).toHaveBeenLastCalledWith("beta", "spare")
    await expect(trigger).toHaveTextContent("beta · Spare Laptop")
    await expect(trigger).toHaveAccessibleName("Project: beta · Spare Laptop")
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await open()
    await userEvent.click(
      await screen.findByRole("option", { name: "No project on Spare Laptop" })
    )
    await expect(changed).toHaveBeenLastCalledWith(null, "spare")
    await expect(trigger).toHaveTextContent("No project · Spare Laptop")
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await open()
    await userEvent.click(
      await screen.findByRole("option", { name: "Add project on Spare Laptop" })
    )
    await expect(added).toHaveBeenLastCalledWith("spare", "")
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    const popup = await open()
    const search = within(popup).getByRole("combobox")
    await userEvent.type(search, "Build")
    await waitFor(() =>
      expect(
        screen.queryByRole("group", { name: "Spare Laptop" })
      ).not.toBeInTheDocument()
    )
    await expect(
      screen.getByRole("group", { name: "CI runner · Offline" })
    ).toBeInTheDocument()
    await expect(
      screen.queryByRole("option", { name: /beta/ })
    ).not.toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, "beta")
    await waitFor(() =>
      expect(
        screen.queryByRole("group", { name: /CI runner/ })
      ).not.toBeInTheDocument()
    )
    await expect(
      screen.getByRole("option", { name: /beta/ })
    ).toBeInTheDocument()
  },
}

/** With one group, the flat list: no heading, the trigger the name alone. */
export const OneGroup: Story = {
  render: function Render() {
    const [value, setValue] = React.useState<string | null>("alpha")
    return (
      <ProjectPicker
        variant="outline"
        className="w-72"
        groups={groupedProjects.slice(0, 1)}
        value={value}
        onValueChange={(project, group) => {
          changed(project, group)
          setValue(project)
        }}
        onAddProject={added}
      />
    )
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Project: alpha" })
    await expect(trigger).toHaveTextContent(/^alpha$/)
    await userEvent.click(trigger)
    const popup = await screen.findByRole("dialog", { name: "Search projects" })
    await expect(
      await within(popup).findByRole("option", { name: "No project" })
    ).toBeInTheDocument()
    await expect(
      within(popup).getByRole("option", { name: "Add project…" })
    ).toBeInTheDocument()
    await expect(
      within(popup).queryByRole("option", { name: /on Spare Laptop/ })
    ).toBeNull()
    await expect(
      within(popup).queryByRole("group", { name: /Spare Laptop/ })
    ).not.toBeInTheDocument()
    await expect(
      within(popup).queryByText("Spare Laptop")
    ).not.toBeInTheDocument()
    await userEvent.click(within(popup).getByRole("option", { name: /beta/ }))
    await expect(changed).toHaveBeenLastCalledWith("beta", "spare")
    await expect(trigger).toHaveTextContent(/^beta$/)
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
  },
}

const many: AppProject[] = Array.from({ length: 45 }, (_, index) => ({
  id: `p${index + 1}`,
  path: `~/src/project-${index + 1}`,
}))
const searched = fn()
const addedWith = fn()

/** The app's server: a page of what matches, a moment later. */
function serve(query: string, page: number) {
  const matching = many.filter((project) =>
    project.path.includes(query.trim().toLowerCase())
  )
  return new Promise<{ projects: AppProject[]; more: boolean }>((done) =>
    setTimeout(
      () =>
        done({
          projects: matching.slice(0, (page + 1) * 20),
          more: matching.length > (page + 1) * 20,
        }),
      50
    )
  )
}

/**
 * Searched by the app, page by page: its projects are the results as it
 * gives them, the next ones as the list's end shows, a line while they
 * load; none found, a line saying so, "Add project…" still there, given
 * what was searched. "No project" kept for an empty search.
 */
export const Remote: Story = {
  render: function Render() {
    const [value, setValue] = React.useState<string | null>(null)
    const [query, setQuery] = React.useState("")
    const [page, setPage] = React.useState(0)
    const [result, setResult] = React.useState<{
      projects: AppProject[]
      more: boolean
    }>({ projects: [], more: false })
    const [loading, setLoading] = React.useState(true)
    React.useEffect(() => {
      let current = true
      setLoading(true)
      void serve(query, page).then((next) => {
        if (!current) return
        setResult(next)
        setLoading(false)
      })
      return () => {
        current = false
      }
    }, [query, page])
    return (
      <ProjectPicker
        variant="outline"
        className="w-72"
        projects={result.projects}
        value={value}
        onValueChange={setValue}
        onQueryChange={(next) => {
          searched(next)
          setQuery(next)
          setPage(0)
        }}
        loading={loading}
        {...(result.more ? { onLoadMore: () => setPage(page + 1) } : {})}
        onAddProject={addedWith}
      />
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox"))
    const popup = await screen.findByRole("dialog", { name: "Search projects" })
    const list = within(popup)
    // The search a field in the popup: its icon, 4px in from its edges,
    // no rule under it.
    const field = popup.querySelector<HTMLElement>("[data-slot=input-group]")!
    await expect(getComputedStyle(field).borderTopWidth).toBe("0px")
    await expect(getComputedStyle(field).borderBottomWidth).toBe("0px")
    await expect(field.querySelector("svg")).toBeInTheDocument()
    await expect(field.getBoundingClientRect().width).toBeCloseTo(
      popup.getBoundingClientRect().width - 8,
      0
    )
    // The first page, "No project" before it.
    await waitFor(() =>
      expect(list.getAllByRole("option", { name: /project-/ })).toHaveLength(20)
    )
    await expect(
      list.getByRole("option", { name: "No project" })
    ).toHaveAttribute("aria-selected", "true")
    // To the end: the next page.
    const scroller = popup.querySelector<HTMLElement>(
      "[data-slot=combobox-list]"
    )!
    // (Again while the list still takes its size.)
    await waitFor(() => {
      scroller.scrollTop = scroller.scrollHeight
      expect(list.getAllByRole("option", { name: /project-/ })).toHaveLength(40)
    })
    // "Add project…" in view, at the foot, however far it is scrolled.
    const add = list.getByRole("option", { name: "Add project…" })
    await expect(add.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      popup.getBoundingClientRect().bottom + 1
    )
    // Picked, then searched for others: the trigger keeps its name.
    await userEvent.click(list.getByRole("option", { name: /^project-12 / }))
    const trigger = canvas.getByRole("combobox", {
      name: "Project: project-12",
    })
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await userEvent.click(trigger)
    const again = within(
      await screen.findByRole("dialog", { name: "Search projects" })
    )
    // Searched: the app's results, not filtered again; no "No project".
    const search = again.getByRole("combobox")
    await userEvent.type(search, "project-4")
    await expect(searched).toHaveBeenLastCalledWith("project-4")
    await waitFor(() =>
      expect(again.getAllByRole("option", { name: /project-/ })).toHaveLength(7)
    )
    await expect(again.queryByRole("option", { name: "No project" })).toBeNull()
    // None found: a line, and "Add project…" with what was searched.
    await userEvent.type(search, "x")
    await expect(await again.findByText("No projects found")).toBeVisible()
    await userEvent.click(again.getByRole("option", { name: "Add project…" }))
    await expect(addedWith).toHaveBeenLastCalledWith(undefined, "project-4x")
    await expect(trigger).toHaveAccessibleName("Project: project-12")
  },
}

/** The picked one given apart, not among the projects: its name shown. */
export const Selected: Story = {
  render: () => (
    <ProjectPicker
      variant="outline"
      className="w-72"
      projects={[]}
      value="far"
      selected={{ id: "far", path: "~/src/far-away" }}
      onValueChange={fn()}
      onQueryChange={fn()}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toHaveAccessibleName(
      "Project: far-away"
    )
  },
}

/**
 * The chosen project as the toolbar's other menus have theirs: its name a
 * step bolder and a grey tick; highlighted, its path still grey, so its
 * fill says only where the keys are.
 */
export const ChosenLook: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Project: agentui" })
    )
    const popup = await screen.findByRole("dialog", { name: "Search projects" })
    const chosen = within(popup).getByRole("option", { name: /^agentui/ })
    const other = within(popup).getByRole("option", { name: /^docs/ })
    const name = (option: HTMLElement) =>
      option.querySelector("span > span")! as HTMLElement
    await expect(
      Number(getComputedStyle(name(chosen)).fontWeight)
    ).toBeGreaterThan(Number(getComputedStyle(name(other)).fontWeight))
    await waitFor(() => expect(chosen).toHaveAttribute("data-highlighted"))
    const path = chosen.querySelector("span > span:last-child")!
    const tick = chosen.lastElementChild!
    const grey = getComputedStyle(
      other.querySelector("span > span:last-child")!
    ).color
    await expect(getComputedStyle(path).color).toBe(grey)
    await expect(getComputedStyle(tick).color).not.toBe(
      getComputedStyle(name(chosen)).color
    )
    await userEvent.keyboard("{Escape}")
  },
}
