// Makes a release's commit and tags it. `node scripts/release.ts v0.1.0`;
// the Release workflow (.github/workflows/release.yml) runs it, pushes the
// tag and makes the GitHub release.
//
// The commit holds the built registry, public/r/<name>.json (each item with
// its files' content, as `shadcn build` writes it), with this registry's
// dependencies named by their built file's URL at the tag
// (https://raw.githubusercontent.com/Bowl42/agent-ui/<tag>/public/r/<name>.json).
// An app adds an item by its URL, or as "@bowl42/<name>" with the "@bowl42"
// registry of its components.json a URL into the tag (README.md); either
// way each item, and each dependency however deep, is one request for one
// file, read at the tag, with nothing to set up.
//
// Why not "Bowl42/agent-ui/<name>#<tag>": the shadcn CLI reads such an
// address with one `gh api` call (or GitHub API request) for registry.json
// and one for each file, again for every dependency and for each of its
// passes over the tree, one after another; a full set of items takes
// minutes, and a dependency's address does not keep the tag. main keeps
// "Bowl42/agent-ui/<name>", which installs main or a checkout as it is.
import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"

const version = process.argv[2]
if (!version || !/^v\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node scripts/release.ts vX.Y.Z")
  process.exit(1)
}
const run = (command: string, ...args: string[]) =>
  execFileSync(command, args, { encoding: "utf8" }).trim()
const git = (...args: string[]) => run("git", ...args)
if (git("status", "--porcelain")) {
  console.error("Commit or stash your changes first.")
  process.exit(1)
}

const prefix = "Bowl42/agent-ui/"
type Item = { name: string; registryDependencies?: string[] }
const items = new Map(
  (
    JSON.parse(readFileSync("registry.json", "utf8")) as { items: Item[] }
  ).items.map((item) => [item.name, item])
)

// No shadcn item an item depends on may pull, at any depth, an item this
// registry fixes: installed after the fix, shadcn's file would overwrite
// it (as shadcn's sidebar once brought back shadcn's tooltip). Make such
// a dependency a fixed item too, depending on the fixes.
const style = (
  JSON.parse(readFileSync("components.json", "utf8")) as { style: string }
).style
const official = new Map<string, Promise<Item | null>>()
const fetchItem = (name: string) => {
  if (!official.has(name))
    official.set(
      name,
      fetch(`https://ui.shadcn.com/r/styles/${style}/${name}.json`)
        .then((response) =>
          response.ok ? (response.json() as Promise<Item>) : null
        )
        .catch(() => null)
    )
  return official.get(name)!
}
const pulled: string[] = []
const walk = async (path: string[], seen: Set<string>) => {
  const name = path.at(-1)!
  if (seen.has(name)) return
  seen.add(name)
  const item = await fetchItem(name)
  for (const dependency of item?.registryDependencies ?? []) {
    if (dependency.includes("/") || dependency.includes(":")) continue
    if (items.has(dependency)) pulled.push([...path, dependency].join(" → "))
    await walk([...path, dependency], seen)
  }
}
for (const item of items.values())
  for (const dependency of item.registryDependencies ?? [])
    if (!dependency.startsWith(prefix))
      await walk([item.name, dependency], new Set())
if (pulled.length) {
  console.error(
    `shadcn items that would overwrite fixed ones:\n  ${pulled.join("\n  ")}`
  )
  process.exit(1)
}

git("switch", "--detach")
// Only the strings, so the file keeps its formatting.
const released = `https://raw.githubusercontent.com/Bowl42/agent-ui/${version}/public/r/`
writeFileSync(
  "registry.json",
  readFileSync("registry.json", "utf8").replace(
    /"Bowl42\/agent-ui\/([a-z0-9-]+)(?:#[^"]*)?"/g,
    `"${released}$1.json"`
  )
)
// Built afresh: a file left from an earlier build would be released too.
rmSync("public/r", { recursive: true, force: true })
run("pnpm", "exec", "shadcn", "build", "--output", "public/r")

// Every file is an item, and an item of this registry is named by its URL
// at this tag wherever it is a dependency: a bare name installs shadcn's
// instead, over the fix, and "Bowl42/agent-ui/<name>" goes back to the
// slow path, at main.
const wrong: string[] = []
for (const file of readdirSync("public/r")) {
  if (file === "registry.json") continue
  const name = file.replace(/\.json$/, "")
  if (!items.has(name)) wrong.push(`${file}: not an item`)
  const built = JSON.parse(readFileSync(`public/r/${file}`, "utf8")) as Item
  for (const dependency of built.registryDependencies ?? [])
    if (
      dependency.startsWith(released)
        ? !items.has(dependency.slice(released.length).replace(/\.json$/, ""))
        : dependency.includes("/") || items.has(dependency)
    )
      wrong.push(`${name} → ${dependency}`)
}
if (wrong.length) {
  console.error(`The built registry is wrong:\n  ${wrong.join("\n  ")}`)
  rmSync("public/r", { recursive: true, force: true })
  git("restore", "registry.json")
  git("switch", "-")
  process.exit(1)
}
// public/r is ignored on main; a release commits it.
git("add", "--force", "registry.json", "public/r")
git("commit", "--quiet", "-m", `chore(release): ${version}, the built registry`)
git("tag", version)
console.log(
  `Tagged ${version} at ${git("rev-parse", "HEAD")} (detached).\n` +
    `Push it with: git push origin ${version}`
)
