export {
  diffFiles,
  parseUnifiedDiff,
  type DiffFile,
  type DiffHunk,
  type DiffLine,
}

/** A line of a hunk: unchanged, added or removed, and its numbers. */
type DiffLine = {
  type: "context" | "added" | "removed"
  /** Its text, without the sign. */
  text: string
  /** Its number in the old file; none for an added line. */
  oldLine?: number | undefined
  /** Its number in the new file; none for a removed line. */
  newLine?: number | undefined
  /** The last line of its file, with no newline after it. */
  noNewline?: boolean | undefined
}

/** A run of changes, under its `@@ -1,4 +1,5 @@` header. */
type DiffHunk = {
  /** Its header line as written. */
  header: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  /** What the header says after the ranges, e.g. the function it is in. */
  section?: string | undefined
  lines: DiffLine[]
}

/** A file's changes. */
type DiffFile = {
  /** Its path before, without "a/"; null for a new file. */
  oldPath: string | null
  /** Its path after, without "b/"; null for a deleted file. */
  newPath: string | null
  /** What it is called: its new path, or the old one if it was deleted. */
  name: string
  status: "added" | "deleted" | "modified" | "renamed" | "copied"
  /** Binary: its changes are not lines ("Binary files … differ"). */
  binary: boolean
  /** Its modes, where they changed or it was added or deleted: "100644". */
  oldMode?: string | undefined
  newMode?: string | undefined
  /** How alike a renamed or copied file is to its old one, in percent. */
  similarity?: number | undefined
  hunks: DiffHunk[]
  /** How many lines it adds and removes. */
  added: number
  removed: number
}

const hunkHeader = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/

/** A path as git writes it: quoted with C escapes if it has odd characters. */
function unquote(path: string) {
  if (!path.startsWith('"') || !path.endsWith('"') || path.length < 2)
    return path
  const bytes: number[] = []
  const encoder = new TextEncoder()
  const escapes: Record<string, number> = {
    n: 10,
    t: 9,
    r: 13,
    b: 8,
    f: 12,
    v: 11,
    a: 7,
    '"': 34,
    "\\": 92,
  }
  const body = path.slice(1, -1)
  for (let index = 0; index < body.length; index++) {
    const char = body[index]!
    if (char !== "\\") {
      bytes.push(...encoder.encode(char))
      continue
    }
    const next = body[index + 1] ?? ""
    const octal = /^[0-7]{3}/.exec(body.slice(index + 1))
    if (octal) {
      bytes.push(Number.parseInt(octal[0], 8))
      index += 3
    } else {
      bytes.push(escapes[next] ?? next.charCodeAt(0))
      index += 1
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

/**
 * A path from a `---` or `+++` line: null for /dev/null; without git's
 * "a/" or "b/", and without the timestamp `diff -u` puts after a tab.
 */
function pathOf(text: string, prefix: string) {
  let path = text.includes("\t") ? text.slice(0, text.indexOf("\t")) : text
  path = unquote(path.trimEnd())
  if (path === "/dev/null") return null
  return path.startsWith(prefix) ? path.slice(prefix.length) : path
}

/** The two paths of a `diff --git a/x b/y` line, where they can be told. */
function gitPaths(rest: string): [string, string] | undefined {
  const quoted = /^("(?:[^"\\]|\\.)*"|\S+) ("(?:[^"\\]|\\.)*"|\S+)$/.exec(rest)
  if (quoted && (quoted[1]!.startsWith('"') || quoted[2]!.startsWith('"'))) {
    const a = unquote(quoted[1]!)
    const b = unquote(quoted[2]!)
    return [a.replace(/^a\//, ""), b.replace(/^b\//, "")]
  }
  // Unquoted, a path may have spaces: "a/x y b/x y". Split where both
  // halves are the same path, else at " b/".
  if (rest.startsWith("a/")) {
    const half = (rest.length - 1) / 2
    if (Number.isInteger(half)) {
      const a = rest.slice(0, half)
      const b = rest.slice(half + 1)
      if (b.startsWith("b/") && a.slice(2) === b.slice(2))
        return [a.slice(2), b.slice(2)]
    }
    const split = rest.indexOf(" b/")
    if (split > 0) return [rest.slice(2, split), rest.slice(split + 3)]
  }
  return undefined
}

/**
 * Reads a unified diff, as `git diff`, `git show`, `git format-patch` or
 * `diff -u` write it, into its files, their hunks and lines: renames and
 * copies, new and deleted files, mode changes, binary files, and the
 * "\ No newline at end of file" marker. Text around the diff (a commit's
 * message, a mail's headers) is left out.
 */
function parseUnifiedDiff(text: string): DiffFile[] {
  const lines = text.split(/\r?\n/)
  if (lines.at(-1) === "") lines.pop()
  const files: DiffFile[] = []
  let file: DiffFile | undefined
  // The file began with a "diff --git" line: its "---" is its own.
  let git = false
  let hunk: DiffHunk | undefined
  // What the hunk still has to come, old and new lines.
  let oldLeft = 0
  let newLeft = 0
  let oldLine = 0
  let newLine = 0

  const start = (fromGit: boolean) => {
    git = fromGit
    file = {
      oldPath: null,
      newPath: null,
      name: "",
      status: "modified",
      binary: false,
      hunks: [],
      added: 0,
      removed: 0,
    }
    files.push(file)
    hunk = undefined
    oldLeft = newLeft = 0
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!

    // Within a hunk, its lines, as many as its header says.
    if (hunk && file && (oldLeft > 0 || newLeft > 0)) {
      const sign = line[0]
      const body = line.slice(1)
      if (sign === " " || line === "") {
        hunk.lines.push({ type: "context", text: body, oldLine, newLine })
        oldLine++
        newLine++
        oldLeft--
        newLeft--
        continue
      }
      if (sign === "-") {
        hunk.lines.push({ type: "removed", text: body, oldLine })
        oldLine++
        oldLeft--
        file.removed++
        continue
      }
      if (sign === "+") {
        hunk.lines.push({ type: "added", text: body, newLine })
        newLine++
        newLeft--
        file.added++
        continue
      }
      if (sign === "\\") {
        const last = hunk.lines.at(-1)
        if (last) last.noNewline = true
        continue
      }
      // Cut short: what follows is not the hunk's.
      oldLeft = newLeft = 0
    }

    if (line.startsWith("\\") && hunk) {
      const last = hunk.lines.at(-1)
      if (last) last.noNewline = true
      continue
    }

    if (line.startsWith("diff --git ")) {
      start(true)
      const paths = gitPaths(line.slice("diff --git ".length))
      if (paths) [file!.oldPath, file!.newPath] = paths
      continue
    }

    // A file of `diff -u` (or the first of one without "diff --git").
    if (
      line.startsWith("--- ") &&
      lines[index + 1]?.startsWith("+++ ") &&
      (!file || !git || file.hunks.length > 0 || hunk)
    )
      start(false)

    if (!file) continue

    if (line.startsWith("--- ")) {
      file.oldPath = pathOf(line.slice(4), "a/")
      continue
    }
    if (line.startsWith("+++ ")) {
      file.newPath = pathOf(line.slice(4), "b/")
      continue
    }

    const header = hunkHeader.exec(line)
    if (header) {
      hunk = {
        header: line,
        oldStart: Number(header[1]),
        oldLines: header[2] === undefined ? 1 : Number(header[2]),
        newStart: Number(header[3]),
        newLines: header[4] === undefined ? 1 : Number(header[4]),
        ...(header[5] ? { section: header[5] } : {}),
        lines: [],
      }
      file.hunks.push(hunk)
      oldLeft = hunk.oldLines
      newLeft = hunk.newLines
      oldLine = hunk.oldStart
      newLine = hunk.newStart
      continue
    }

    // git's extended headers, before the hunks.
    if (hunk) continue
    let match: RegExpExecArray | null
    if ((match = /^new file mode (\d+)/.exec(line))) {
      file.status = "added"
      file.newMode = match[1]
    } else if ((match = /^deleted file mode (\d+)/.exec(line))) {
      file.status = "deleted"
      file.oldMode = match[1]
    } else if ((match = /^old mode (\d+)/.exec(line))) file.oldMode = match[1]
    else if ((match = /^new mode (\d+)/.exec(line))) file.newMode = match[1]
    else if ((match = /^(?:similarity|dissimilarity) index (\d+)%/.exec(line)))
      file.similarity = line.startsWith("dis")
        ? 100 - Number(match[1])
        : Number(match[1])
    else if ((match = /^rename from (.+)/.exec(line))) {
      file.status = "renamed"
      file.oldPath = unquote(match[1]!)
    } else if ((match = /^rename to (.+)/.exec(line))) {
      file.status = "renamed"
      file.newPath = unquote(match[1]!)
    } else if ((match = /^copy from (.+)/.exec(line))) {
      file.status = "copied"
      file.oldPath = unquote(match[1]!)
    } else if ((match = /^copy to (.+)/.exec(line))) {
      file.status = "copied"
      file.newPath = unquote(match[1]!)
    } else if (line.startsWith("Binary files ") || line === "GIT binary patch")
      file.binary = true
  }

  return files.map((each) => {
    if (each.status === "added") each.oldPath = null
    if (each.status === "deleted") each.newPath = null
    if (each.status === "modified") {
      if (each.oldPath === null && each.newPath !== null) each.status = "added"
      else if (each.newPath === null && each.oldPath !== null)
        each.status = "deleted"
      else if (
        each.oldPath !== null &&
        each.newPath !== null &&
        each.oldPath !== each.newPath
      )
        each.status = "renamed"
    }
    return { ...each, name: each.newPath ?? each.oldPath ?? "" }
  })
}

/** The files of a diff, its text read, or as given. */
const diffFiles = (diff: string | readonly DiffFile[]) =>
  typeof diff === "string" ? parseUnifiedDiff(diff) : diff
