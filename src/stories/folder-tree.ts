import type { ViewerFile } from "@/components/files-viewer"

const directory = (id: string, children?: ViewerFile[]): ViewerFile => ({
  id,
  name: id.split("/").at(-1)!,
  directory: true,
  children,
})
export const folderTree: ViewerFile = directory("~", [
  directory("~/code", [
    directory("~/code/agent-ui", [directory("~/code/agent-ui/src", [])]),
    directory("~/code/vesper", [directory("~/code/vesper/app", [])]),
    directory("~/code/samples"),
    { id: "~/code/notes.txt", name: "notes.txt" },
  ]),
  directory("~/Documents", []),
  directory("~/Downloads", []),
  directory("~/Pictures", []),
  { id: "~/readme.txt", name: "readme.txt" },
])
export function updateFolder(
  tree: ViewerFile,
  id: string,
  update: (folder: ViewerFile) => ViewerFile
): ViewerFile {
  if (tree.id === id) return update(tree)
  return tree.children
    ? {
        ...tree,
        children: tree.children.map((child) => updateFolder(child, id, update)),
      }
    : tree
}
export function loadFolder(folder: ViewerFile): Promise<ViewerFile[]> {
  return Promise.resolve().then(() => [
    directory(`${folder.id}/examples`, []),
    directory(`${folder.id}/templates`, []),
  ])
}
