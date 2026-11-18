import { describe, expect, test } from "vitest"

import { describeCommand } from "@/lib/describe-command"

describe("describeCommand", () => {
  test("reads: cat, head, tail, sed -n, nl, less, bat", () => {
    expect(describeCommand("sed -n 100,180p src/app.tsx")).toEqual({
      kind: "read",
      paths: ["src/app.tsx"],
    })
    expect(describeCommand("cat a.ts b.ts; head -40 c.ts")).toEqual({
      kind: "read",
      paths: ["a.ts", "b.ts", "c.ts"],
    })
    expect(describeCommand("head -n 20 a.ts && tail -5 a.ts")).toEqual({
      kind: "read",
      paths: ["a.ts"],
    })
    expect(describeCommand("nl -ba src/app.tsx | sed -n 1,80p")).toEqual({
      kind: "read",
      paths: ["src/app.tsx"],
    })
    expect(describeCommand("tail -f log.txt")).toEqual({
      kind: "read",
      paths: ["log.txt"],
    })
    expect(describeCommand("bat -r 10:20 notes.md")).toEqual({
      kind: "read",
      paths: ["notes.md"],
    })
    expect(describeCommand('cat "my file.md" 2>/dev/null')).toEqual({
      kind: "read",
      paths: ["my file.md"],
    })
  })

  test("a leading cd is left out", () => {
    expect(describeCommand("cd ~/proj && cat package.json")).toEqual({
      kind: "read",
      paths: ["package.json"],
    })
    expect(describeCommand('cd "/a b"; cd sub && pnpm build')).toEqual({
      kind: "run",
      command: "pnpm build",
    })
  })

  test("searches: grep and rg, with their pattern", () => {
    expect(
      describeCommand('grep -n "useSyncExternalStore" composer.tsx')
    ).toEqual({
      kind: "search",
      pattern: "useSyncExternalStore",
      paths: ["composer.tsx"],
    })
    expect(describeCommand("rg -n -g '*.tsx' -C 2 ComposerSubmit src")).toEqual(
      { kind: "search", pattern: "ComposerSubmit", paths: ["src"] }
    )
    expect(describeCommand("grep -rn -e foo -A 3 src lib | head")).toEqual({
      kind: "search",
      pattern: "foo",
      paths: ["src", "lib"],
    })
    expect(describeCommand("rg TODO")).toEqual({
      kind: "search",
      pattern: "TODO",
      paths: [],
    })
  })

  test("listings: ls, find, tree; a cd's folder for none of its own", () => {
    expect(describeCommand("ls /tmp/build/out | head -80")).toEqual({
      kind: "list",
      path: "/tmp/build/out",
    })
    expect(describeCommand("find src -name '*.ts' -type f")).toEqual({
      kind: "list",
      path: "src",
    })
    expect(describeCommand("tree -L 2 docs")).toEqual({
      kind: "list",
      path: "docs",
    })
    expect(describeCommand("cd ~/proj && ls -la")).toEqual({
      kind: "list",
      path: "~/proj",
    })
    expect(describeCommand("ls")).toEqual({ kind: "list", path: "." })
  })

  test("edits in place: sed -i and perl -i", () => {
    expect(
      describeCommand(
        "sed -i '' 's/^import …/…/' src/stories/agent-turn.stories.tsx"
      )
    ).toEqual({ kind: "edit", paths: ["src/stories/agent-turn.stories.tsx"] })
    expect(describeCommand("sed -i 's/a/b/g' a.ts b.ts")).toEqual({
      kind: "edit",
      paths: ["a.ts", "b.ts"],
    })
    expect(describeCommand("sed -i.bak -e 's/a/b/' a.ts")).toEqual({
      kind: "edit",
      paths: ["a.ts"],
    })
    expect(describeCommand("perl -pi -e 's/foo/bar/' x.py")).toEqual({
      kind: "edit",
      paths: ["x.py"],
    })
  })

  test("a short command is shown as it is", () => {
    expect(describeCommand("pnpm build")).toEqual({
      kind: "run",
      command: "pnpm build",
    })
    expect(describeCommand("  CI=1 pnpm test  ", "Run the tests")).toEqual({
      kind: "run",
      command: "CI=1 pnpm test",
    })
    // A redirect is not a second command.
    expect(describeCommand("pnpm lint 2>&1")).toEqual({
      kind: "run",
      command: "pnpm lint 2>&1",
    })
  })

  test("else the agent's description, as it is", () => {
    const line =
      "python3 scripts/codemod.py src/stories/agent-turn.stories.tsx codemods/one.py; grep -c x a"
    expect(
      describeCommand(line, "Apply the edit script to the stories")
    ).toEqual({
      kind: "described",
      description: "Apply the edit script to the stories",
    })
    // Piped, or chained: not short, however long.
    expect(describeCommand("pnpm test | tail", "Run the tests")).toEqual({
      kind: "described",
      description: "Run the tests",
    })
    expect(describeCommand("pnpm i && pnpm build", "Build")).toEqual({
      kind: "described",
      description: "Build",
    })
    // Too long to be shown as it is.
    expect(
      describeCommand(
        "pnpm exec tsc -p tsconfig.app.json --noEmit --pretty false",
        "Type-check the app"
      )
    ).toEqual({ kind: "described", description: "Type-check the app" })
  })

  test("else a script", () => {
    expect(
      describeCommand(
        "for f in composer-select composer-queue; do pnpm lint $f; done"
      )
    ).toEqual({ kind: "script" })
    expect(describeCommand("python3 - <<'E'\nprint(1)\nE", "  ")).toEqual({
      kind: "script",
    })
  })

  test("not a read: what writes to a file, or is piped into a program", () => {
    expect(describeCommand("cat a.ts > b.ts", "Copy a.ts")).toEqual({
      kind: "run",
      command: "cat a.ts > b.ts",
    })
    expect(
      describeCommand("cat src/one.ts src/two.ts >> build/all.ts", "Join them")
    ).toEqual({ kind: "described", description: "Join them" })
    expect(describeCommand("cat a.ts | python3 x.py", "Check")).toEqual({
      kind: "described",
      description: "Check",
    })
    // A read and a search together are neither.
    expect(describeCommand("cat a.ts; grep b c.ts", "Look")).toEqual({
      kind: "described",
      description: "Look",
    })
    // sed that prints everything is not a read: a short command.
    expect(describeCommand("sed 's/a/b/' a.ts", "Preview")).toEqual({
      kind: "run",
      command: "sed 's/a/b/' a.ts",
    })
  })
})
