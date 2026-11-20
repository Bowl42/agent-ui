import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import { FolderPicker, FolderPickerPanel } from "@/components/folder-picker"
import type { ViewerFile } from "@/components/files-viewer"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Clock01Icon,
  HardDriveIcon,
  Home01Icon,
} from "@hugeicons/core-free-icons"
import { folderTree, loadFolder, updateFolder } from "@/stories/folder-tree"

const places = [
  {
    id: "home",
    name: "Home",
    icon: <HugeiconsIcon icon={Home01Icon} strokeWidth={2} />,
  },
  {
    id: "recent",
    name: "Recent",
    icon: <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />,
  },
  {
    id: "volumes",
    name: "Volumes",
    icon: <HugeiconsIcon icon={HardDriveIcon} strokeWidth={2} />,
  },
]
// Recent and Volumes are lists, not folders: no path of their own.
const virtualPlaces = new Set(["recent", "volumes"])
function Demo({
  onChoose,
  onPlaceChange,
  onNavigate,
  files,
  withPlaces = false,
  create = false,
  embedded = false,
}: {
  onChoose: (folder: ViewerFile) => void
  onPlaceChange: (id: string) => void
  onNavigate: (path: string) => void
  files?: "hidden" | "dimmed"
  withPlaces?: boolean
  create?: boolean
  embedded?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [tree, setTree] = React.useState(folderTree)
  const [selected, setSelected] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(new Set())
  const [place, setPlace] = React.useState("home")
  const [chosen, setChosen] = React.useState("")
  const folder =
    place === "home"
      ? tree
      : {
          id: place,
          name: place === "recent" ? "Recent" : "Volumes",
          directory: true,
          children:
            place === "recent"
              ? tree.children?.filter((entry) => entry.id === "~/code")
              : [],
        }
  const props = {
    folder,
    selected,
    onSelect: (entry: ViewerFile) => setSelected(entry.id),
    expanded,
    onExpandedChange: (next: ReadonlySet<string>) => setExpanded(next),
    onLoad: (entry: ViewerFile, { signal }: { signal: AbortSignal }) => {
      return loadFolder(entry).then((children) => {
        if (signal.aborted) return
        setTree((current) =>
          updateFolder(current, entry.id, (parent) => ({ ...parent, children }))
        )
      })
    },
    files,
    pathOf: (entry: ViewerFile) =>
      virtualPlaces.has(entry.id) ? "" : entry.id,
    places: withPlaces ? places : undefined,
    place,
    onPlaceChange: (id: string) => {
      onPlaceChange(id)
      setPlace(id)
      setSelected(null)
    },
    onNavigate: (path: string) => {
      onNavigate(path)
      const found = findIn(tree, path)
      if (!found?.directory) return
      setPlace("home")
      setSelected(path)
      const parts = path.split("/")
      setExpanded(
        new Set(
          parts.slice(1).map((_, index) => parts.slice(0, index + 2).join("/"))
        )
      )
    },
    onCreateFolder: create
      ? (parent: ViewerFile, name: string) =>
          Promise.resolve().then(() => {
            if (name === "exists")
              throw new Error("A folder with that name already exists")
            setTree((current) =>
              updateFolder(current, parent.id, (entry) => ({
                ...entry,
                children: [
                  ...(entry.children ?? []),
                  {
                    id: `${parent.id}/${name}`,
                    name,
                    directory: true,
                    children: [],
                  },
                ],
              }))
            )
          })
      : undefined,
    onChoose: (entry: ViewerFile) => {
      onChoose(entry)
      setChosen(entry.id)
      setOpen(false)
    },
  }
  return (
    <div className={embedded ? "w-full" : "flex items-center gap-3"}>
      {embedded ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">Add a project</h2>
          <FolderPickerPanel
            {...props}
            className="h-120"
            status={
              selected === "~/Documents" ? "Not a git repository" : undefined
            }
            canChoose={(entry) => entry.id !== "~/Documents"}
          />
        </>
      ) : (
        <>
          <Button onClick={() => setOpen(true)}>Choose folder…</Button>
          <FolderPicker {...props} open={open} onOpenChange={setOpen} />
        </>
      )}
      <output aria-label="Chosen folder">{chosen}</output>
    </div>
  )
}
function findIn(tree: ViewerFile, id: string): ViewerFile | undefined {
  if (tree.id === id) return tree
  for (const child of tree.children ?? []) {
    const found = findIn(child, id)
    if (found) return found
  }
  return undefined
}
const meta = {
  title: "Components/Folder Picker",
  component: Demo,
  parameters: { layout: "centered" },
  args: { onChoose: fn(), onPlaceChange: fn(), onNavigate: fn() },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

async function openPicker(canvas: ReturnType<typeof within>) {
  await userEvent.click(canvas.getByRole("button", { name: "Choose folder…" }))
  const dialog = await screen.findByRole("dialog", { name: "Choose a folder" })
  await waitFor(() =>
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  )
  // Its opening animation over, so what is in it is visible.
  await waitFor(() =>
    expect(
      dialog
        .getAnimations({ subtree: true })
        .filter((animation) => animation.playState === "running")
    ).toHaveLength(0)
  )
  return within(dialog)
}
async function closed() {
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Choose a folder" })
    ).not.toBeInTheDocument()
  )
}
export const Default: Story = {
  play: async ({ canvas, args }) => {
    args.onChoose.mockClear()
    let picker = await openPicker(canvas)
    await expect(picker.getByText("4 items")).toBeVisible()
    await expect(
      picker.getByRole("button", { name: "Columns" })
    ).toHaveAttribute("aria-pressed", "true")
    await expect(picker.queryByText("readme.txt")).not.toBeInTheDocument()
    await userEvent.click(picker.getByRole("option", { name: "code" }))
    await expect(
      await picker.findByRole("listbox", { name: "code" })
    ).toBeInTheDocument()
    const loading = fn()
    const observer = new MutationObserver(() => {
      if (picker.queryByText("Loading…")) loading()
    })
    observer.observe(screen.getByRole("dialog", { name: "Choose a folder" }), {
      childList: true,
      subtree: true,
    })
    try {
      await userEvent.click(picker.getByRole("option", { name: "samples" }))
      await waitFor(() => expect(loading).toHaveBeenCalled())
    } finally {
      observer.disconnect()
    }
    await expect(
      await picker.findByRole("option", { name: "examples" })
    ).toBeInTheDocument()
    await userEvent.keyboard("{Enter}")
    await expect(args.onChoose).not.toHaveBeenCalled()
    await expect(picker.getByRole("textbox", { name: "Path" })).toHaveValue(
      "~/code/samples/examples"
    )
    await userEvent.click(picker.getByRole("button", { name: "Choose" }))
    await closed()
    await expect(args.onChoose).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "~/code/samples/examples" })
    )
    await openPicker(canvas)
    await userEvent.keyboard("{Control>}{Enter}{/Control}")
    await closed()
    await expect(args.onChoose).toHaveBeenCalledTimes(2)
    picker = await openPicker(canvas)
    await userEvent.click(picker.getByRole("button", { name: "Cancel" }))
    await closed()
    await expect(args.onChoose).toHaveBeenCalledTimes(2)
  },
}
export const Places: Story = {
  args: { withPlaces: true },
  play: async ({ canvas, args }) => {
    const picker = await openPicker(canvas)
    const nav = within(picker.getByRole("navigation", { name: "Places" }))
    await expect(nav.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "true"
    )
    await userEvent.click(nav.getByRole("button", { name: "Recent" }))
    await expect(args.onPlaceChange).toHaveBeenLastCalledWith("recent")
    await expect(nav.getByRole("button", { name: "Recent" })).toHaveAttribute(
      "aria-current",
      "true"
    )
    // Recent is no folder: no path, the placeholder instead.
    const path = picker.getByRole("textbox", { name: "Path" })
    await expect(path).toHaveValue("")
    await expect(path).toHaveAttribute("placeholder", "Type a path")
    await expect(
      nav.getByRole("button", { name: "Recent" }).querySelector("svg")
    ).toBeInTheDocument()
    // One column keeps a column's width.
    const column = picker.getByRole("listbox", { name: "Recent" })
    const browser = column.closest("[data-slot=files-columns]")!
    await expect(column.getBoundingClientRect().width).toBeLessThan(
      browser.getBoundingClientRect().width / 2
    )
  },
}
export const NewFolder: Story = {
  args: { create: true },
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    const button = picker.getByRole("button", { name: "New folder" })
    await userEvent.click(button)
    let input = picker.getByRole("textbox", { name: "Folder name" })
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.type(input, "workspace{Enter}")
    await waitFor(() =>
      expect(
        picker.queryByRole("textbox", { name: "Folder name" })
      ).not.toBeInTheDocument()
    )
    await expect(button).toHaveFocus()
    await userEvent.click(
      await picker.findByRole("option", { name: "workspace" })
    )
    await expect(picker.getByRole("textbox", { name: "Path" })).toHaveValue(
      "~/workspace"
    )
    await userEvent.click(button)
    input = picker.getByRole("textbox", { name: "Folder name" })
    await userEvent.type(input, "exists{Enter}")
    await expect(
      await picker.findByText("A folder with that name already exists")
    ).toBeVisible()
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveFocus()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(input).not.toBeInTheDocument())
    await expect(
      screen.getByRole("dialog", { name: "Choose a folder" })
    ).toBeVisible()
    await expect(button).toHaveFocus()
  },
}
export const FilesDimmed: Story = {
  args: { files: "dimmed" },
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    const file = picker.getByRole("option", { name: "readme.txt" })
    await expect(file).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(file)
    await expect(picker.getByRole("textbox", { name: "Path" })).toHaveValue("~")
    await expect(file).toHaveAttribute("aria-selected", "false")
    // Neither a click nor the keys focus it.
    await expect(file).not.toHaveFocus()
    await expect(file).not.toHaveAttribute("tabindex")
    picker.getByRole("option", { name: "Pictures" }).focus()
    await userEvent.keyboard("{ArrowDown}")
    await expect(picker.getByRole("option", { name: "Pictures" })).toHaveFocus()
  },
}
export const TypedPath: Story = {
  play: async ({ canvas, args }) => {
    const picker = await openPicker(canvas)
    const path = picker.getByRole("textbox", { name: "Path" })
    await userEvent.clear(path)
    await userEvent.type(path, "~/code/vesper{Enter}")
    await expect(args.onNavigate).toHaveBeenLastCalledWith("~/code/vesper")
    await expect(
      await picker.findByRole("option", { name: "vesper" })
    ).toHaveAttribute("aria-selected", "true")
    await expect(path).toHaveValue("~/code/vesper")
    await userEvent.type(path, "/edited")
    await userEvent.keyboard("{Escape}")
    await expect(path).toHaveValue("~/code/vesper")
    await expect(
      screen.getByRole("dialog", { name: "Choose a folder" })
    ).toBeVisible()
  },
}
export const Phone: Story = {
  args: { withPlaces: true },
  parameters: {
    viewport: {
      options: {
        phone: {
          name: "Phone",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas }) => {
    let picker = await openPicker(canvas)
    await expect(
      picker.queryByRole("separator", { name: /^Resize/ })
    ).toBeNull()
    await expect(picker.getByRole("listbox", { name: "~" })).toBeInTheDocument()
    // Visible once the dialog's opening animation is over.
    await waitFor(() => {
      for (const name of ["code", "Documents", "Downloads", "Pictures"])
        expect(picker.getByRole("option", { name })).toBeVisible()
    })
    await userEvent.click(picker.getByRole("option", { name: "code" }))
    await waitFor(() =>
      expect(picker.getByRole("listbox", { name: "code" })).toBeVisible()
    )
    await expect(picker.getByRole("textbox", { name: "Path" })).toHaveValue(
      "~/code"
    )
    await expect(
      picker.queryByRole("option", { name: "Documents" })
    ).not.toBeInTheDocument()
    // The places select stands for the place's root: no crumb says it
    // again; chosen again, it goes back there.
    await expect(
      picker.getByRole("navigation", { name: "Path, code" })
    ).toHaveTextContent("code")
    await expect(
      picker.queryByRole("button", { name: /^~$/ })
    ).not.toBeInTheDocument()
    await userEvent.click(picker.getByRole("combobox", { name: "Places" }))
    const home = await screen.findByRole("option", { name: "Home" })
    await waitFor(() => expect(home).toBeVisible())
    await userEvent.click(home)
    const code = await picker.findByRole("option", { name: "code" })
    await expect(
      picker.queryByRole("navigation", { name: /^Path/ })
    ).not.toBeInTheDocument()
    code.focus()
    await userEvent.keyboard("{ArrowDown}")
    await expect(
      picker.getByRole("option", { name: "Documents" })
    ).toHaveFocus()
    await expect(picker.getByRole("textbox", { name: "Path" })).toHaveValue("~")
    await userEvent.keyboard("{Home}{Enter}")
    await waitFor(() =>
      expect(picker.getByRole("option", { name: "agentui" })).toHaveFocus()
    )
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() =>
      expect(picker.getByRole("option", { name: "code" })).toHaveFocus()
    )
    await expect(
      picker.queryByRole("button", { name: "Columns" })
    ).not.toBeInTheDocument()
    await userEvent.click(picker.getByRole("option", { name: "code" }))
    await userEvent.click(picker.getByRole("option", { name: "samples" }))
    await expect(
      await picker.findByRole("option", { name: "examples" })
    ).toBeVisible()
    await expect(
      picker.getByRole("option", { name: "templates" })
    ).toBeVisible()
    await userEvent.click(picker.getByRole("button", { name: "code" }))
    await userEvent.click(picker.getByRole("button", { name: /^Choose$/ }))
    await expect(canvas.getByLabelText("Chosen folder")).toHaveTextContent(
      "~/code"
    )
    await closed()
    picker = await openPicker(canvas)
    await expect(picker.getByRole("listbox", { name: "code" })).toBeVisible()
    await userEvent.click(picker.getByRole("combobox", { name: "Places" }))
    const option = await screen.findByRole("option", { name: "Recent" })
    await waitFor(() => expect(option).toBeVisible())
    await userEvent.click(option)
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: "Recent" })
      ).not.toBeInTheDocument()
    )
    await expect(picker.getByRole("textbox", { name: "Path" })).toHaveValue("")
    // No sort header: the list's sort is in the menu.
    await expect(
      picker.queryByRole("button", { name: "Sort by Name" })
    ).not.toBeInTheDocument()
    // The whole screen, once its opening animation is over.
    await waitFor(() => {
      const rect = screen
        .getByRole("dialog", { name: "Choose a folder" })
        .getBoundingClientRect()
      expect(Math.abs(rect.width - window.innerWidth)).toBeLessThan(2)
      expect(Math.abs(rect.height - window.innerHeight)).toBeLessThan(2)
    })
    // The buttons whole on the screen, with the footer's padding below.
    const cancel = picker
      .getByRole("button", { name: "Cancel" })
      .getBoundingClientRect()
    await expect(cancel.bottom).toBeLessThanOrEqual(window.innerHeight - 8)
  },
}
export const Embedded: Story = {
  args: { embedded: true },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("option", { name: "Documents" }))
    const status = canvas.getByText("Not a git repository")
    await expect(status).toHaveAttribute("role", "status")
    await expect(status).toHaveAttribute("aria-live", "polite")
    await expect(canvas.getByRole("button", { name: "Choose" })).toBeDisabled()
  },
}

const remote = {
  calls: [] as { id: string; signal: AbortSignal; resolve: () => void }[],
}
function SlowDemo() {
  const [open, setOpen] = React.useState(false)
  const [tree, setTree] = React.useState<ViewerFile>({
    id: "~",
    name: "Home",
    directory: true,
    children: ["alpha", "beta", "gamma"].map((name) => ({
      id: name,
      name,
      directory: true,
    })),
  })
  const [selected, setSelected] = React.useState<string | null>(null)
  return (
    <>
      <Button
        onClick={() => {
          remote.calls = []
          setOpen(true)
        }}
      >
        Choose folder…
      </Button>
      <FolderPicker
        open={open}
        onOpenChange={setOpen}
        folder={tree}
        selected={selected}
        onSelect={(entry) => setSelected(entry.id)}
        defaultView="list"
        onLoad={(entry, { signal }) =>
          new Promise<void>((resolve) => {
            remote.calls.push({
              id: entry.id,
              signal,
              resolve: () => {
                if (!signal.aborted)
                  setTree((current) =>
                    updateFolder(current, entry.id, (parent) => ({
                      ...parent,
                      children: [
                        {
                          id: `${entry.id}/child`,
                          name: "child",
                          directory: true,
                          children: [],
                        },
                      ],
                    }))
                  )
                resolve()
              },
            })
          })
        }
        onChoose={() => {}}
      />
    </>
  )
}
export const SlowMachine: Story = {
  render: () => <SlowDemo />,
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    const ids = () => remote.calls.map((call) => call.id)
    // Focus on a folder not loaded: it is asked for ahead of opening.
    picker.getByRole("treeitem", { name: "alpha" }).focus()
    await waitFor(() => expect(ids()).toEqual(["alpha"]))
    const alpha = remote.calls[0]!
    // Moving on: the newer intent aborts the older prefetch.
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(ids()).toEqual(["alpha", "beta"]))
    await expect(alpha.signal.aborted).toBe(true)
    const beta = remote.calls[1]!
    // Opened while prefetching: the same load goes on, not a second.
    await userEvent.keyboard("{ArrowRight}")
    await expect(await picker.findByText("Loading…")).toBeVisible()
    await expect(ids()).toEqual(["alpha", "beta"])
    await expect(beta.signal.aborted).toBe(false)
    beta.resolve()
    await expect(
      await picker.findByRole("treeitem", { name: "child" })
    ).toBeVisible()

    await userEvent.click(picker.getByRole("button", { name: "Columns" }))
    // The pointer resting on a folder prefetches it.
    await userEvent.hover(picker.getByRole("option", { name: "gamma" }))
    await waitFor(() => expect(ids().at(-1)).toBe("gamma"))
    const hovered = remote.calls.at(-1)!
    // Picked: its own column loads while the first stays usable.
    await userEvent.click(picker.getByRole("option", { name: "gamma" }))
    await expect(
      await picker.findByRole("listbox", { name: "gamma" })
    ).toHaveAttribute("aria-busy", "true")
    await expect(ids().filter((id) => id === "gamma")).toHaveLength(1)
    await userEvent.click(picker.getByRole("option", { name: "alpha" }))
    await waitFor(() => expect(ids().at(-1)).toBe("alpha"))
    await expect(hovered.signal.aborted).toBe(true)
    // Back to it: asked for again, and shown once it comes.
    await userEvent.click(picker.getByRole("option", { name: "gamma" }))
    await waitFor(() => expect(ids().at(-1)).toBe("gamma"))
    remote.calls.at(-1)!.resolve()
    await expect(
      await picker.findByRole("option", { name: "child" })
    ).toBeVisible()
    // Closed: what is still under way is aborted.
    await userEvent.click(picker.getByRole("option", { name: "alpha" }))
    await waitFor(() => expect(ids().at(-1)).toBe("alpha"))
    const last = remote.calls.at(-1)!
    await userEvent.click(picker.getByRole("button", { name: "Cancel" }))
    await closed()
    await waitFor(() => expect(last.signal.aborted).toBe(true))
  },
}

export const TypePath: Story = {
  play: async ({ canvas, args }) => {
    const picker = await openPicker(canvas)
    const input = picker.getByRole("textbox", {
      name: "Path",
    }) as HTMLInputElement
    const completed = async (name: string, value: string, start: number) => {
      await waitFor(() => {
        expect(picker.getByRole("option", { name })).toHaveAttribute(
          "aria-selected",
          "true"
        )
        expect(input).toHaveValue(value)
        expect(input.selectionStart).toBe(start)
        expect(input.selectionEnd).toBe(value.length)
      })
    }
    await userEvent.clear(input)
    await userEvent.type(input, "~/co")
    await waitFor(() => expect(args.onNavigate).toHaveBeenCalledWith("~"))
    await completed("code", "~/code", 4)
    await userEvent.keyboard("{Tab}")
    await waitFor(() => {
      expect(input).toHaveValue("~/code/")
      expect(args.onNavigate).toHaveBeenLastCalledWith("~/code")
      expect(input).toHaveFocus()
      expect(picker.getByRole("listbox", { name: "code" })).toBeVisible()
    })
    await userEvent.keyboard("a")
    await completed("agentui", "~/code/agentui", 8)
    await userEvent.clear(input)
    await userEvent.type(input, "~/code/s")
    await completed("samples", "~/code/samples", 8)
    const codeRows = () =>
      within(picker.getByRole("listbox", { name: "code" }))
        .getAllByRole("option")
        .map((row) => row.textContent)
    await waitFor(() => expect(codeRows()).toEqual(["samples"]))
    for (const name of ["code", "Documents", "Downloads", "Pictures"])
      await expect(picker.getByRole("option", { name })).toBeVisible()
    await expect(picker.getByText("1 of 3 items")).toBeVisible()
    await userEvent.keyboard("{Backspace}")
    await expect(input).toHaveValue("~/code/s")
    await expect(codeRows()).toEqual(["samples"])
    await userEvent.keyboard("{Backspace}")
    await waitFor(() =>
      expect(codeRows()).toEqual(["agentui", "samples", "vesper"])
    )
    await expect(picker.queryByText(/of 3 items/)).not.toBeInTheDocument()
    await userEvent.keyboard("s{Tab}")
    await waitFor(() => expect(input).toHaveValue("~/code/samples/"))
    await expect(
      await picker.findByRole("option", { name: "examples" })
    ).toBeVisible()
    await expect(
      picker.getByRole("option", { name: "templates" })
    ).toBeVisible()
    await userEvent.clear(input)
    await userEvent.type(input, "~/code/zz")
    await expect(
      await picker.findByRole("group", { name: "code" })
    ).toHaveTextContent("No matches")
    await expect(
      picker.queryByRole("listbox", { name: "samples" })
    ).not.toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.type(input, "~/D")
    await completed("Documents", "~/Documents", 3)
    await expect(picker.getByText("2 of 4 items")).toBeVisible()
    await expect(
      picker.queryByRole("option", { name: "code" })
    ).not.toBeInTheDocument()
    await expect(
      picker.queryByRole("option", { name: "Pictures" })
    ).not.toBeInTheDocument()
    await userEvent.keyboard("{ArrowDown}")
    await completed("Downloads", "~/Downloads", 3)
    await userEvent.keyboard("{ArrowUp}")
    await completed("Documents", "~/Documents", 3)
    await userEvent.keyboard("{Backspace}")
    await waitFor(() => {
      expect(input).toHaveValue("~/D")
      expect(input.selectionStart).toBe(3)
      expect(input.selectionEnd).toBe(3)
    })
    await userEvent.keyboard("o")
    await completed("Documents", "~/Documents", 4)
    // Escape drops the completion, then restores the picked folder's path.
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(input).toHaveValue("~/Do"))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(input).toHaveValue("~/Documents"))
    await expect(
      screen.getByRole("dialog", { name: "Choose a folder" })
    ).toBeVisible()
    await userEvent.clear(input)
    await userEvent.type(input, "~/code/agentui{Enter}")
    await waitFor(() => {
      expect(args.onNavigate).toHaveBeenLastCalledWith("~/code/agentui")
      expect(picker.getByRole("option", { name: "agentui" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    })
    // The level picked in counted, as while typing into it; the path
    // field the only location, the path field the only filter.
    await expect(picker.getByText("3 items")).toBeVisible()
    await expect(
      picker.queryByRole("navigation", { name: /^Path/ })
    ).not.toBeInTheDocument()
    await expect(
      picker.queryByRole("button", { name: "Filter" })
    ).not.toBeInTheDocument()
  },
}
export const TypePathPhone: Story = {
  parameters: Phone.parameters,
  globals: Phone.globals,
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    const input = picker.getByRole("textbox", { name: "Path" })
    await userEvent.clear(input)
    await userEvent.type(input, "~/co")
    await waitFor(() => {
      expect(picker.getByRole("option", { name: "code" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
      expect(input).toHaveValue("~/code")
    })
    await userEvent.keyboard("{Tab}")
    await waitFor(() => expect(input).toHaveValue("~/code/"))
    await userEvent.keyboard("v")
    await waitFor(() => {
      expect(picker.getByRole("option", { name: "vesper" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
      expect(input).toHaveValue("~/code/vesper")
      expect(picker.getByText("1 of 3 items")).toBeVisible()
    })
    await userEvent.clear(input)
    await userEvent.type(input, "~/code/")
    await expect(
      await picker.findByRole("option", { name: "samples" })
    ).toBeVisible()
    await userEvent.keyboard("zz")
    await expect(await picker.findByText("No matches")).toBeVisible()
    // With no places, the breadcrumb's root goes back up.
    await userEvent.clear(input)
    await userEvent.type(input, "~/code{Enter}")
    await userEvent.click(await picker.findByRole("button", { name: "~" }))
    await waitFor(() => expect(input).toHaveValue("~"))
    await expect(picker.getByRole("option", { name: "Pictures" })).toBeVisible()
  },
}

export const FilesDimmedPhone: Story = {
  parameters: Phone.parameters,
  globals: Phone.globals,
  args: { files: "dimmed" },
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    const file = picker.getByRole("option", { name: "readme.txt" })
    await expect(file).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(file)
    await expect(picker.getByRole("textbox", { name: "Path" })).toHaveValue("~")
  },
}

const unloaded = { calls: [] as { resolve: () => void }[] }
function UnloadedDemo({ phone = false }: { phone?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [tree, setTree] = React.useState<ViewerFile>(
    phone
      ? folderTree
      : {
          id: "~",
          name: "Home",
          directory: true,
          children: [{ id: "~/code", name: "code", directory: true }],
        }
  )
  const [selected, setSelected] = React.useState<string | null>(
    phone ? "~/code" : null
  )
  return (
    <>
      <Button
        onClick={() => {
          unloaded.calls = []
          setOpen(true)
        }}
      >
        Choose folder…
      </Button>
      <FolderPicker
        open={open}
        onOpenChange={setOpen}
        folder={tree}
        selected={selected}
        onSelect={(entry) => setSelected(entry.id)}
        onNavigate={(path) => {
          if (findIn(tree, path)?.directory) setSelected(path)
        }}
        onLoad={(entry, { signal }) =>
          new Promise<void>((resolve) => {
            unloaded.calls.push({
              resolve: () => {
                if (!signal.aborted)
                  setTree((current) =>
                    updateFolder(current, entry.id, (parent) => ({
                      ...parent,
                      children: (phone
                        ? ["examples", "templates"]
                        : ["agentui", "vesper"]
                      ).map((name) => ({
                        id: `${entry.id}/${name}`,
                        name,
                        directory: true,
                        children: [],
                      })),
                    }))
                  )
                resolve()
              },
            })
          })
        }
        onChoose={() => {}}
      />
    </>
  )
}
export const TypePathUnloaded: Story = {
  render: () => <UnloadedDemo />,
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    const input = picker.getByRole("textbox", {
      name: "Path",
    }) as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, "~/code/")
    await waitFor(() => {
      expect(picker.getByRole("listbox", { name: "code" })).toHaveAttribute(
        "aria-busy",
        "true"
      )
      expect(unloaded.calls).toHaveLength(1)
    })
    await userEvent.keyboard("v")
    await waitFor(() => {
      expect(input).toHaveValue("~/code/v")
      expect(
        picker.queryByRole("option", { name: "vesper" })
      ).not.toBeInTheDocument()
    })
    unloaded.calls[0]!.resolve()
    await waitFor(() => {
      expect(picker.getByRole("option", { name: "vesper" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
      expect(input).toHaveValue("~/code/vesper")
      expect(input.selectionStart).toBe(8)
      expect(input.selectionEnd).toBe(13)
    })
    await expect(
      picker.queryByRole("option", { name: "agentui" })
    ).not.toBeInTheDocument()
    await expect(picker.getByText("1 of 2 items")).toBeVisible()
  },
}

/**
 * On a phone, a whole path typed, with no slash at its end: Choose takes
 * the folder it names, as on a larger screen, not the one its list is of.
 */
export const PhoneTypedPath: Story = {
  parameters: Phone.parameters,
  globals: Phone.globals,
  play: async ({ args, canvas }) => {
    const picker = await openPicker(canvas)
    const field = picker.getByRole("textbox", { name: "Path" })
    await userEvent.clear(field)
    await userEvent.type(field, "~/code/")
    await waitFor(() =>
      expect(picker.getByRole("option", { name: "agentui" })).toBeVisible()
    )
    await userEvent.type(field, "agentui")
    await userEvent.click(picker.getByRole("button", { name: "Choose" }))
    await expect(args.onChoose).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "~/code/agentui" })
    )
  },
}

/** A name no folder there has: Choose waits, rather than take its parent. */
export const PhoneTypedNothing: Story = {
  parameters: Phone.parameters,
  globals: Phone.globals,
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    const field = picker.getByRole("textbox", { name: "Path" })
    await userEvent.clear(field)
    await userEvent.type(field, "~/code/nothing")
    await waitFor(() =>
      expect(picker.getByRole("button", { name: "Choose" })).toBeDisabled()
    )
  },
}

export const PhoneLoading: Story = {
  parameters: Phone.parameters,
  globals: Phone.globals,
  render: () => <UnloadedDemo phone />,
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    const code = picker.getByRole("option", { name: "samples" })
    code.focus()
    await userEvent.keyboard("{Enter}")
    await expect(await picker.findByText("Loading…")).toBeVisible()
    await waitFor(() => expect(unloaded.calls).toHaveLength(1))
    unloaded.calls[0]!.resolve()
    // Loaded, and its first folder holding the focus, as the reader sees it.
    await waitFor(() => expect(picker.queryByText("Loading…")).toBeNull())
    await waitFor(() =>
      expect(picker.getByRole("option", { name: "examples" })).toHaveFocus()
    )
    await userEvent.keyboard("{Backspace}")
    await waitFor(() =>
      expect(picker.getByRole("option", { name: "samples" })).toHaveFocus()
    )
  },
}

export const ColumnsResize: Story = {
  play: async ({ canvas }) => {
    const picker = await openPicker(canvas)
    await userEvent.click(picker.getByRole("option", { name: "code" }))
    await picker.findByRole("listbox", { name: "code" })
    const column = picker.getByRole("listbox", { name: "~" })
    const handle = picker.getByRole("separator", { name: "Resize ~ column" })
    const start = column.getBoundingClientRect().width
    handle.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(handle).toHaveAttribute("aria-valuenow", "192")
    await expect(Math.round(column.getBoundingClientRect().width)).toBe(
      Math.round(start + 16)
    )
    await userEvent.keyboard("{End}")
    await expect(handle).toHaveAttribute("aria-valuenow", "480")
    await expect(Math.round(column.getBoundingClientRect().width)).toBe(480)
  },
}
