// The checks, at once, as none needs another's output: `pnpm check:quick`
// (`node scripts/check.ts quick`: ESLint, Prettier, the two type checks,
// the registry, the grid and the content; the pre-commit hook's),
// `pnpm check:pr` (those, the story tests in Chromium and the Storybook
// build; CI's on a pull request) and `pnpm check` (the story tests in
// three browsers and the dark theme instead; the pre-push hook's and CI's
// on main). Each one's output is shown when it ends, so they don't
// interleave; the first to fail stops the others.
import { spawn, type ChildProcess } from "node:child_process"

const quick = [
  ["ESLint", "lint:eslint"],
  ["Prettier", "lint:prettier"],
  ["types", "typecheck:tsc"],
  ["types (TypeScript 5)", "typecheck:ts5"],
  ["registry", "registry:check"],
  ["grid", "check:grid"],
  ["content", "check:content"],
] as const
const mode = process.argv[2]
const tasks =
  mode === "quick"
    ? quick
    : ([
        ...quick,
        mode === "pr"
          ? ["story tests (Chromium)", "test:chromium"]
          : ["story tests", "test"],
        ["Storybook build", "storybook:build"],
      ] as const)

const running = new Set<ChildProcess>()
let failed = false
const stopAll = () => {
  for (const child of running)
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM")
      } catch {
        // Ended already.
      }
    }
}
// Interrupted: the groups are detached, so they are stopped here.
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    failed = true
    stopAll()
    process.exit(1)
  })

const results = tasks.map(
  ([name, script]) =>
    new Promise<boolean>((resolve) => {
      const started = Date.now()
      const child = spawn("pnpm", ["-s", script], {
        stdio: ["ignore", "pipe", "pipe"],
        // Its own process group, so stopping it stops what it started
        // (the browsers, Vite).
        detached: true,
        // Piped, but to a terminal in the end: colours as there.
        env: {
          ...process.env,
          ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
        },
      })
      running.add(child)
      const output: Buffer[] = []
      child.stdout.on("data", (chunk: Buffer) => output.push(chunk))
      child.stderr.on("data", (chunk: Buffer) => output.push(chunk))
      child.on("close", (code, signal) => {
        running.delete(child)
        const seconds = Math.round((Date.now() - started) / 1000)
        // Stopped because another failed: nothing of its own to say.
        if (signal && failed) return resolve(false)
        const ok = code === 0
        process.stdout.write(Buffer.concat(output))
        console.log(`${ok ? "✓" : "✗"} ${name} (${seconds}s)\n`)
        if (!ok && !failed) {
          failed = true
          stopAll()
        }
        resolve(ok)
      })
    })
)

const ok = (await Promise.all(results)).every(Boolean)
process.exit(ok ? 0 : 1)
