import { describe, expect, test } from "vitest"

import { parseUnifiedDiff } from "@/lib/unified-diff"

describe("parseUnifiedDiff", () => {
  test("a modified file: its hunks, lines and their numbers", () => {
    const [file, ...rest] = parseUnifiedDiff(
      [
        "diff --git a/src/images.ts b/src/images.ts",
        "index 3b18e51..a9c5d2f 100644",
        "--- a/src/images.ts",
        "+++ b/src/images.ts",
        "@@ -1,4 +1,4 @@ export function cacheKey(image: Image) {",
        " import { hash } from './hash'",
        " export function cacheKey(image: Image) {",
        "-  return image.path + Date.now()",
        "+  return hash(image.content)",
        " }",
        "@@ -10 +10,2 @@",
        "-old",
        "+new",
        "+newer",
        "",
      ].join("\n")
    )
    expect(rest).toEqual([])
    expect(file).toMatchObject({
      oldPath: "src/images.ts",
      newPath: "src/images.ts",
      name: "src/images.ts",
      status: "modified",
      binary: false,
      added: 3,
      removed: 2,
    })
    expect(file!.hunks).toHaveLength(2)
    expect(file!.hunks[0]).toMatchObject({
      oldStart: 1,
      oldLines: 4,
      newStart: 1,
      newLines: 4,
      section: "export function cacheKey(image: Image) {",
    })
    expect(file!.hunks[0]!.lines).toEqual([
      {
        type: "context",
        text: "import { hash } from './hash'",
        oldLine: 1,
        newLine: 1,
      },
      {
        type: "context",
        text: "export function cacheKey(image: Image) {",
        oldLine: 2,
        newLine: 2,
      },
      { type: "removed", text: "  return image.path + Date.now()", oldLine: 3 },
      { type: "added", text: "  return hash(image.content)", newLine: 3 },
      { type: "context", text: "}", oldLine: 4, newLine: 4 },
    ])
    // A count left out is 1.
    expect(file!.hunks[1]).toMatchObject({
      oldStart: 10,
      oldLines: 1,
      newStart: 10,
      newLines: 2,
    })
    expect(file!.hunks[1]!.section).toBeUndefined()
  })

  test("several files; added and deleted ones", () => {
    const files = parseUnifiedDiff(
      [
        "diff --git a/new.ts b/new.ts",
        "new file mode 100644",
        "index 0000000..e69de29",
        "--- /dev/null",
        "+++ b/new.ts",
        "@@ -0,0 +1,2 @@",
        "+one",
        "+two",
        "diff --git a/gone.ts b/gone.ts",
        "deleted file mode 100755",
        "index e69de29..0000000",
        "--- a/gone.ts",
        "+++ /dev/null",
        "@@ -1 +0,0 @@",
        "-only",
      ].join("\n")
    )
    expect(files.map((file) => [file.name, file.status])).toEqual([
      ["new.ts", "added"],
      ["gone.ts", "deleted"],
    ])
    expect(files[0]).toMatchObject({
      oldPath: null,
      newPath: "new.ts",
      newMode: "100644",
      added: 2,
      removed: 0,
    })
    expect(files[1]).toMatchObject({
      oldPath: "gone.ts",
      newPath: null,
      oldMode: "100755",
      added: 0,
      removed: 1,
    })
  })

  test("renames and copies, with and without changes", () => {
    const files = parseUnifiedDiff(
      [
        "diff --git a/old name.ts b/new name.ts",
        "similarity index 100%",
        "rename from old name.ts",
        "rename to new name.ts",
        "diff --git a/a.ts b/lib/a.ts",
        "similarity index 90%",
        "rename from a.ts",
        "rename to lib/a.ts",
        "index 1..2 100644",
        "--- a/a.ts",
        "+++ b/lib/a.ts",
        "@@ -1 +1 @@",
        "-x",
        "+y",
        "diff --git a/b.ts b/c.ts",
        "similarity index 80%",
        "copy from b.ts",
        "copy to c.ts",
      ].join("\n")
    )
    expect(files).toHaveLength(3)
    expect(files[0]).toMatchObject({
      oldPath: "old name.ts",
      newPath: "new name.ts",
      status: "renamed",
      similarity: 100,
      hunks: [],
    })
    expect(files[1]).toMatchObject({
      oldPath: "a.ts",
      newPath: "lib/a.ts",
      status: "renamed",
      similarity: 90,
      added: 1,
      removed: 1,
    })
    expect(files[2]).toMatchObject({
      oldPath: "b.ts",
      newPath: "c.ts",
      status: "copied",
    })
  })

  test("binary files and mode changes", () => {
    const files = parseUnifiedDiff(
      [
        "diff --git a/logo.png b/logo.png",
        "index 1..2 100644",
        "Binary files a/logo.png and b/logo.png differ",
        "diff --git a/icon.png b/icon.png",
        "new file mode 100644",
        "index 0000000..2",
        "GIT binary patch",
        "literal 12",
        "zcmZ?wbhEHbRA2y",
        "",
        "literal 0",
        "HcmV?d00001",
        "",
        "diff --git a/run.sh b/run.sh",
        "old mode 100644",
        "new mode 100755",
      ].join("\n")
    )
    expect(files.map((file) => [file.name, file.status, file.binary])).toEqual([
      ["logo.png", "modified", true],
      ["icon.png", "added", true],
      ["run.sh", "modified", false],
    ])
    expect(files[2]).toMatchObject({ oldMode: "100644", newMode: "100755" })
  })

  test("the no-newline marker, on either side", () => {
    const [file] = parseUnifiedDiff(
      [
        "--- a/x",
        "+++ b/x",
        "@@ -1,2 +1,2 @@",
        " same",
        "-end",
        "\\ No newline at end of file",
        "+end",
        "\\ No newline at end of file",
      ].join("\n")
    )
    expect(file!.hunks[0]!.lines).toEqual([
      { type: "context", text: "same", oldLine: 1, newLine: 1 },
      { type: "removed", text: "end", oldLine: 2, noNewline: true },
      { type: "added", text: "end", newLine: 2, noNewline: true },
    ])
  })

  test("diff -u: timestamps, several files, lines that look like headers", () => {
    const files = parseUnifiedDiff(
      [
        "diff -ru a/one.txt b/one.txt",
        "--- a/one.txt\t2026-11-08 12:00:00.000000000 +0000",
        "+++ b/one.txt\t2026-11-08 12:01:00.000000000 +0000",
        "@@ -1,2 +1,2 @@",
        "--- a removed line that looks like a header",
        "+++ an added one",
        " ",
        "--- two.txt",
        "+++ two.txt",
        "@@ -1 +1 @@",
        "-a",
        "+b",
      ].join("\r\n")
    )
    expect(files.map((file) => file.name)).toEqual(["one.txt", "two.txt"])
    expect(files[0]!.hunks[0]!.lines.map((line) => line.type)).toEqual([
      "removed",
      "added",
      "context",
    ])
    expect(files[0]!.hunks[0]!.lines[0]!.text).toBe(
      "-- a removed line that looks like a header"
    )
  })

  test("an empty line in a hunk is an unchanged empty line", () => {
    const [file] = parseUnifiedDiff(
      ["--- a/x", "+++ b/x", "@@ -1,3 +1,3 @@", " a", "", "-b", "+c"].join("\n")
    )
    expect(file!.hunks[0]!.lines[1]).toEqual({
      type: "context",
      text: "",
      oldLine: 2,
      newLine: 2,
    })
  })

  test("a patch's mail and signature are left out; quoted paths are read", () => {
    const files = parseUnifiedDiff(
      [
        "From 1234 Mon Sep 17 00:00:00 2001",
        "Subject: [PATCH] Fix it",
        "",
        "---",
        ' "caf\\303\\251.md" | 2 +-',
        "",
        'diff --git "a/caf\\303\\251.md" "b/caf\\303\\251.md"',
        "index 1..2 100644",
        '--- "a/caf\\303\\251.md"',
        '+++ "b/caf\\303\\251.md"',
        "@@ -1 +1 @@",
        "-a",
        "+b",
        "-- ",
        "2.47.0",
      ].join("\n")
    )
    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({
      name: "café.md",
      oldPath: "café.md",
      added: 1,
      removed: 1,
    })
  })

  test("nothing to read", () => {
    expect(parseUnifiedDiff("")).toEqual([])
    expect(parseUnifiedDiff("no diff here\n")).toEqual([])
  })
})
