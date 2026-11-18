/**
 * Writes src/index.css the way a consumer gets it: the stylesheet
 * `shadcn init` writes (scripts/shadcn-init.css) with the registry's
 * `theme` item added by `shadcn add`. Stories and tests run against it.
 *
 *   node scripts/theme.ts          write src/index.css
 *   node scripts/theme.ts --check  fail if src/index.css is out of date
 *
 * Refresh scripts/shadcn-init.css from a new `shadcn init -t vite -b base
 * -p nova` when shadcn changes its theme.
 */
import { execFileSync } from "node:child_process"
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const shadcn = join(root, "node_modules/.bin/shadcn")
const target = join(root, "src/index.css")
const check = process.argv.includes("--check")

const dir = mkdtempSync(join(tmpdir(), "agent-ui-theme-"))
try {
  execFileSync(shadcn, ["build", "-o", join(dir, "r")], {
    cwd: root,
    stdio: "pipe",
  })

  const app = join(dir, "app")
  mkdirSync(join(app, "src"), { recursive: true })
  copyFileSync(join(root, "components.json"), join(app, "components.json"))
  copyFileSync(
    join(import.meta.dirname, "shadcn-init.css"),
    join(app, "src/index.css")
  )
  writeFileSync(join(app, "package.json"), '{ "private": true }\n')
  writeFileSync(
    join(app, "tsconfig.json"),
    '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }\n'
  )
  execFileSync(
    shadcn,
    ["add", join(dir, "r/theme.json"), "--yes", "--silent"],
    {
      cwd: app,
      stdio: "pipe",
    }
  )

  const css = readFileSync(join(app, "src/index.css"), "utf8")
  // No colour of the theme's as itself in `@theme inline` (`--card:
  // var(--card)`): shadcn maps a value it does not take for a colour so,
  // e.g. a `color-mix()`; written `oklch(from …)`, it is one. Only the
  // theme's own (`cssVars.theme`, e.g. `--shadow-float`) are.
  const registry = JSON.parse(
    readFileSync(join(root, "registry.json"), "utf8")
  ) as {
    items: { name: string; cssVars?: { theme?: Record<string, string> } }[]
  }
  const own = Object.keys(
    registry.items.find((item) => item.name === "theme")?.cssVars?.theme ?? {}
  )
  const inline = /@theme inline \{([^}]*)\}/.exec(css)?.[1] ?? ""
  const itself = [...inline.matchAll(/--([\w-]+): var\(--\1\);/g)]
    .map((match) => match[1]!)
    .filter((name) => !own.includes(name))
  if (itself.length > 0) {
    console.error(
      `@theme inline maps these to themselves, not as colours: ${itself.join(", ")}`
    )
    process.exitCode = 1
  }
  // Added again, as an app updating it does: the same stylesheet, nothing
  // appended twice.
  execFileSync(
    shadcn,
    ["add", join(dir, "r/theme.json"), "--yes", "--silent", "--overwrite"],
    { cwd: app, stdio: "pipe" }
  )
  if (readFileSync(join(app, "src/index.css"), "utf8") !== css) {
    console.error(
      "adding the theme again changes the stylesheet: shadcn appends a rule of it twice"
    )
    process.exitCode = 1
  } else if (!check) {
    writeFileSync(target, css)
    console.log("wrote src/index.css")
  } else if (readFileSync(target, "utf8") !== css) {
    console.error(
      "src/index.css is out of date with registry.json: run `pnpm theme`"
    )
    process.exitCode = 1
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}
