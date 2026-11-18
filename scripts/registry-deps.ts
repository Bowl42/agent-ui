// Checks that items depend on this registry's fixed items by their full
// name ("Bowl42/agent-ui/input-group"). A bare "input-group" is shadcn's
// own, so installing the item would overwrite the fixed file with it.
import { readdirSync, readFileSync } from "node:fs"

type Item = { name: string; registryDependencies?: string[] }
const registry = JSON.parse(readFileSync("registry.json", "utf8")) as {
  items: Item[]
}
const ours = new Set(registry.items.map((item) => item.name))
const bare = registry.items.flatMap((item) =>
  (item.registryDependencies ?? [])
    .filter((dependency) => ours.has(dependency))
    .map((dependency) => `${item.name} → ${dependency}`)
)
if (bare.length) {
  console.error(
    `Use Bowl42/agent-ui/<name> for these registry dependencies:\n  ${bare.join("\n  ")}`
  )
  process.exit(1)
}

// Checks that each item depends on what its files import from other
// items or from shadcn: installed alone, it would not build otherwise.
type File = { path: string }
const items = registry.items as (Item & { files?: File[] })[]
const owner = new Map(
  items.flatMap((item) =>
    (item.files ?? []).map((file) => [
      file.path.replace(/^src\//, "@/").replace(/\.tsx?$/, ""),
      item.name,
    ])
  )
)
const missing = items.flatMap((item) => {
  // A release names them by their built file's URL at its tag, as
  // scripts/release.ts does.
  const dependencies = new Set(
    (item.registryDependencies ?? []).map((dependency) =>
      dependency.replace(
        /^https:\/\/raw\.githubusercontent\.com\/Bowl42\/agent-ui\/[^/]+\/public\/r\/([a-z0-9-]+)\.json$/,
        "Bowl42/agent-ui/$1"
      )
    )
  )
  return (item.files ?? []).flatMap((file) => {
    const source = readFileSync(file.path, "utf8")
    const imports = [
      ...source.matchAll(/from "(@\/(?:components|hooks)\/[^"]+)"/g),
    ]
    return imports.flatMap(([, path]) => {
      const mine = owner.get(path!)
      const needed =
        mine !== undefined
          ? mine === item.name
            ? undefined
            : `Bowl42/agent-ui/${mine}`
          : path!.startsWith("@/components/ui/")
            ? path!.slice("@/components/ui/".length)
            : undefined
      return needed === undefined || dependencies.has(needed)
        ? []
        : [`${item.name} → ${needed} (${file.path} imports ${path})`]
    })
  })
})
if (missing.length) {
  console.error(
    `Add these registry dependencies:\n  ${[...new Set(missing)].join("\n  ")}`
  )
  process.exit(1)
}

// Checks that no file's first statement has a comment before it: the
// shadcn CLI (4.23) drops the comments before a file's first statement,
// in any item, and, for an app with "rsc": false, a ui or lib file's
// "use client" with the comments after it. A file's header, e.g. a
// licence, goes after its imports (or after its export list, put first,
// in a file with none).
const stripped = items.flatMap((item) =>
  (item.files ?? []).flatMap((file) => {
    const { type } = file as File & { type: string }
    let source = readFileSync(file.path, "utf8").trimStart()
    if (!/\.[jt]sx?$/.test(file.path)) return []
    const directive = /^"use client";?/.exec(source)
    if (directive) {
      if (type !== "registry:ui" && type !== "registry:lib") return []
      source = source.slice(directive[0].length).trimStart()
    }
    return source.startsWith("//") || source.startsWith("/*")
      ? [`${file.path} (${item.name})`]
      : []
  })
)
if (stripped.length) {
  console.error(
    `The shadcn CLI drops the comments these files start with; move them after the imports:\n  ${stripped.join("\n  ")}`
  )
  process.exit(1)
}

// Checks that each ui file marked for check-grid (`grid: mark`, `grid:
// clear`, `motion:`) is an item's: shadcn's own, unlisted, is installed
// without the mark, and an app's check-grid then flags it.
const listed = new Set(
  items.flatMap((item) => (item.files ?? []).map((file) => file.path))
)
const unlisted = readdirSync("src/components/ui")
  .map((name) => `src/components/ui/${name}`)
  .filter(
    (path) =>
      !listed.has(path) &&
      /\/\/ (grid: (mark|clear)|motion:)|\{\/\* (grid: (mark|clear)|motion:)/.test(
        readFileSync(path, "utf8")
      )
  )
if (unlisted.length) {
  console.error(
    `These ui files are marked for check-grid but are no item's; add a fix entry:\n  ${unlisted.join("\n  ")}`
  )
  process.exit(1)
}
