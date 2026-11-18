export { describeCommand, type DescribedCommand }

/**
 * What a shell command did, for a line that says what was done rather
 * than what was typed: a read, a search, a listing or an edit it is
 * recognised as; else a short command as it is; else the agent's own
 * description of it; else a script.
 */
type DescribedCommand =
  /** `cat`, `head`, `tail`, `sed -n`, `nl`…: the files it read. */
  | { kind: "read"; paths: string[] }
  /** `grep`, `rg`…: what it searched for, and where. */
  | { kind: "search"; pattern: string; paths: string[] }
  /** `ls`, `find`, `tree`: the folder it listed ("." for the current one). */
  | { kind: "list"; path: string }
  /** `sed -i`, `perl -i`: the files it edited. */
  | { kind: "edit"; paths: string[] }
  /** One short command (one, no pipe, `;` or `&&`, 40 characters at most). */
  | { kind: "run"; command: string }
  /** Anything else the agent described: its words, as they are. */
  | { kind: "described"; description: string }
  /** Anything else, with no description. */
  | { kind: "script" }

/** The longest command shown as it is. */
const shortCommand = 40

type Word = { type: "word"; value: string }
type Operator = { type: "op"; value: string }
type Token = Word | Operator

/** A `cd somewhere &&` or `cd somewhere;` before the command. */
const leadingCd =
  /^\s*cd\s+("[^"]*"|'[^']*'|[^\s;&|]+)\s*(?:&&|;)\s*/

/**
 * A command line's words and operators, quotes taken off; `null` for
 * what the line cannot be read as without a shell (a heredoc, a subshell,
 * an unclosed quote).
 */
function lex(text: string): Token[] | null {
  const tokens: Token[] = []
  let word: string | null = null
  const end = () => {
    if (word !== null) tokens.push({ type: "word", value: word })
    word = null
  }
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!
    const next = text[index + 1]
    if (char === " " || char === "\t") {
      end()
    } else if (char === "\n") {
      end()
      tokens.push({ type: "op", value: ";" })
    } else if (char === "#" && word === null) {
      while (index + 1 < text.length && text[index + 1] !== "\n") index++
    } else if (char === "'") {
      const close = text.indexOf("'", index + 1)
      if (close < 0) return null
      word = (word ?? "") + text.slice(index + 1, close)
      index = close
    } else if (char === '"') {
      let value = ""
      let at = index + 1
      for (; at < text.length && text[at] !== '"'; at++) {
        if (text[at] === "\\" && at + 1 < text.length) at++
        value += text[at]
      }
      if (at >= text.length) return null
      word = (word ?? "") + value
      index = at
    } else if (char === "\\") {
      if (next === "\n") index++
      else if (next !== undefined) {
        word = (word ?? "") + next
        index++
      }
    } else if (char === "$" && next === "(") {
      // A command's output in a word: kept as written.
      let depth = 0
      let at = index
      for (; at < text.length; at++) {
        if (text[at] === "(") depth++
        else if (text[at] === ")" && --depth === 0) break
      }
      if (at >= text.length) return null
      word = (word ?? "") + text.slice(index, at + 1)
      index = at
    } else if (char === "`") {
      const close = text.indexOf("`", index + 1)
      if (close < 0) return null
      word = (word ?? "") + text.slice(index, close + 1)
      index = close
    } else if (char === "(" || char === ")") {
      return null
    } else if (char === "&" || char === "|" || char === ";") {
      end()
      const pair = char + (next ?? "")
      if (pair === "&&" || pair === "||" || pair === "|&" || pair === ";;") {
        tokens.push({ type: "op", value: pair })
        index++
      } else if (pair === "&>") {
        tokens.push({ type: "op", value: ">" })
        index++
        if (text[index + 1] === ">") index++
      } else tokens.push({ type: "op", value: char })
    } else if (char === ">" || char === "<") {
      // A file descriptor's number before it belongs to it: `2>&1`.
      if (word !== null && /^\d+$/.test(word)) word = null
      end()
      if (char === "<" && next === "<") return null
      let op: string = char
      if (char === ">" && (next === ">" || next === "|")) {
        op = ">"
        index++
      }
      if (text[index + 1] === "&") {
        // `>&2`: to another descriptor, not a file.
        index++
        while (/\d|-/.test(text[index + 1] ?? "")) index++
        continue
      }
      tokens.push({ type: "op", value: op })
    } else {
      word = (word ?? "") + char
    }
  }
  end()
  return tokens
}

type Command = { words: string[]; writes: boolean }

/**
 * The line's commands: a list of pipelines (split at `;`, `&&`, `||` and
 * `&`), each a list of commands (split at `|`). A command writes if it
 * sends its output to a file other than /dev/null.
 */
function parse(text: string): Command[][] | null {
  const tokens = lex(text)
  if (!tokens) return null
  const pipelines: Command[][] = []
  let pipeline: Command[] = []
  let command: Command = { words: [], writes: false }
  const endCommand = () => {
    if (command.words.length > 0) pipeline.push(command)
    command = { words: [], writes: false }
  }
  const endPipeline = () => {
    endCommand()
    if (pipeline.length > 0) pipelines.push(pipeline)
    pipeline = []
  }
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!
    if (token.type === "word") command.words.push(token.value)
    else if (token.value === "|" || token.value === "|&") endCommand()
    else if (token.value === ">" || token.value === "<") {
      const target = tokens[index + 1]
      if (target?.type !== "word") return null
      index++
      if (token.value === ">" && target.value !== "/dev/null")
        command.writes = true
    } else endPipeline()
  }
  endPipeline()
  return pipelines
}

/** `NAME=value` before a command. */
const assignment = /^[A-Za-z_][A-Za-z0-9_]*=/

/** A program's name without its path: `/usr/bin/grep` is `grep`. */
const programName = (word: string) => word.split("/").at(-1) ?? word

/**
 * A command's arguments that are not options: `-n 20` and the like are
 * skipped by `takesValue`, `--` ends the options.
 */
function operands(args: string[], takesValue: (flag: string) => boolean) {
  const found: string[] = []
  let options = true
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!
    if (options && arg === "--") options = false
    else if (options && arg.startsWith("-") && arg.length > 1) {
      if (!arg.includes("=") && takesValue(arg)) index++
    } else found.push(arg)
  }
  return found
}

/** Commands that only pass their input on, shortened or sorted. */
const filters = new Set([
  "head",
  "tail",
  "grep",
  "egrep",
  "fgrep",
  "rg",
  "sort",
  "uniq",
  "wc",
  "cut",
  "nl",
  "less",
  "more",
  "cat",
  "tr",
  "column",
  "awk",
  "sed",
  "jq",
  "fold",
  "fmt",
  "tee",
])

const valueFlags = (flags: string) => (flag: string) =>
  flags.split(" ").includes(flag)

type Action =
  | { kind: "read"; paths: string[] }
  | { kind: "search"; pattern: string; paths: string[] }
  | { kind: "list"; path: string | undefined }
  | { kind: "edit"; paths: string[] }

/** What one command does, if it is one this recognises. */
function actionOf(words: string[]): Action | null {
  const rest = [...words]
  while (rest.length > 1 && assignment.test(rest[0]!)) rest.shift()
  const program = programName(rest[0] ?? "")
  const args = rest.slice(1)
  switch (program) {
    case "cat":
    case "nl":
    case "less":
    case "more": {
      const paths = operands(args, valueFlags("-b -s -w -v"))
      return paths.length > 0 && !paths.includes("-")
        ? { kind: "read", paths }
        : null
    }
    case "bat": {
      const paths = operands(
        args,
        valueFlags("-r -l -H -m --line-range --language --highlight-line")
      )
      return paths.length > 0 ? { kind: "read", paths } : null
    }
    case "head":
    case "tail": {
      const paths = operands(
        args.filter((arg) => !/^[-+]\d+$/.test(arg)),
        valueFlags("-n -c --lines --bytes")
      )
      return paths.length > 0 ? { kind: "read", paths } : null
    }
    case "sed":
      return sedAction(args)
    case "perl": {
      // `perl -pi -e 's/a/b/' file`: an edit in place.
      const edits = args.some((arg) => /^-[a-zA-Z]*i/.test(arg))
      if (!edits) return null
      const paths = operands(args, valueFlags("-e -E -I -M -m"))
      return paths.length > 0 ? { kind: "edit", paths } : null
    }
    case "grep":
    case "egrep":
    case "fgrep":
    case "rg":
    case "ag":
    case "ack": {
      const flags =
        program === "rg"
          ? "-e -f -g -t -T -A -B -C -m -M -j -r -E --glob --type --type-not --max-count --replace --context --after-context --before-context --encoding"
          : "-e -f -A -B -C -m -d -D --context --after-context --before-context --max-count --include --exclude --exclude-dir"
      const explicit = args.findIndex(
        (arg) => arg === "-e" || arg === "--regexp"
      )
      const found = operands(args, valueFlags(flags))
      const pattern =
        explicit >= 0 ? args[explicit + 1] : (found.shift() ?? undefined)
      return pattern === undefined
        ? null
        : { kind: "search", pattern, paths: found }
    }
    case "ls":
    case "tree": {
      const found = operands(
        args,
        valueFlags(program === "tree" ? "-L -I -P -o" : "-I --ignore -w")
      )
      return { kind: "list", path: found[0] }
    }
    case "find":
    case "fd": {
      if (program === "fd") {
        const found = operands(
          args,
          valueFlags("-e -t -E -d -x -X --extension --type --exclude")
        )
        return { kind: "list", path: found[1] }
      }
      const start = args.findIndex((arg) => /^[-(!]/.test(arg))
      const paths = start < 0 ? args : args.slice(0, start)
      return { kind: "list", path: paths[0] }
    }
    default:
      return null
  }
}

/** `sed -n …` reads, `sed -i …` edits; anything else is neither. */
function sedAction(args: string[]): Action | null {
  let inPlace = false
  let quiet = false
  let script = false
  const paths: string[] = []
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!
    if (arg === "-i" || arg === "--in-place") {
      inPlace = true
      // BSD sed's suffix, a word of its own: `sed -i '' …`, `-i .bak`.
      const next = args[index + 1]
      if (next === "" || next?.startsWith(".")) index++
    } else if (arg.startsWith("--in-place=") || /^-i./.test(arg)) {
      inPlace = true
    } else if (arg === "-e" || arg === "-f" || arg === "--expression") {
      script = true
      index++
    } else if (/^-[a-zA-Z]+$/.test(arg)) {
      if (arg.includes("n")) quiet = true
      if (arg.includes("i")) inPlace = true
    } else if (arg.startsWith("-") && arg.length > 1) {
      if (arg === "--quiet" || arg === "--silent") quiet = true
    } else if (!script) script = true
    else paths.push(arg)
  }
  if (paths.length === 0) return null
  if (inPlace) return { kind: "edit", paths }
  return quiet ? { kind: "read", paths } : null
}

const unique = (values: string[]) => [...new Set(values)]

/**
 * What a shell command did, as a step's line says it, by the first of
 * these that holds:
 *
 * - it reads files (`cat`, `head`, `tail`, `sed -n`, `nl`, `less`): a read
 *   of them, "Read composer.tsx", "Read 3 files";
 * - it searches (`grep`, `rg`): a search for its pattern;
 * - it lists files (`ls`, `find`, `tree`): a listing of its folder;
 * - it edits files in place (`sed -i`, `perl -i`): an edit of them;
 * - it is one short command (no pipe, `;` or `&&`, 40 characters at most):
 *   the command as it is, "Ran pnpm build";
 * - the agent described it: its description, as it is;
 * - else a script, "Ran a script".
 *
 * A `cd somewhere &&` before it is left out (a listing with no folder of
 * its own lists that one). Reads, searches and listings may be piped into
 * filters (`| head -80`) and several of a kind joined (`cat a; head b`);
 * one that writes to a file is not a read. It reads the line as words and
 * operators, not as a shell would: anything it cannot read so (a heredoc,
 * a subshell) is not recognised.
 */
function describeCommand(
  command: string,
  description?: string | undefined
): DescribedCommand {
  let text = command.trim()
  let folder: string | undefined
  for (let match = leadingCd.exec(text); match; match = leadingCd.exec(text)) {
    folder = match[1]!.replace(/^["']|["']$/g, "")
    text = text.slice(match[0].length)
  }
  const pipelines = parse(text)
  const actions = pipelines?.map((pipeline) => {
    const [first, ...piped] = pipeline
    if (!first || pipeline.some((command) => command.writes)) return null
    const filtered = piped.every((command) =>
      filters.has(programName(command.words[0] ?? ""))
    )
    return filtered ? actionOf(first.words) : null
  })
  const kind = actions?.[0]?.kind
  if (
    actions &&
    kind !== undefined &&
    actions.every((action) => action?.kind === kind)
  ) {
    const all = actions as Action[]
    if (kind === "read" || kind === "edit")
      return {
        kind,
        paths: unique(
          all.flatMap((action) => ("paths" in action ? action.paths : []))
        ),
      }
    if (kind === "search") {
      const first = all[0] as Extract<Action, { kind: "search" }>
      return {
        kind,
        pattern: first.pattern,
        paths: unique(
          all.flatMap((action) => ("paths" in action ? action.paths : []))
        ),
      }
    }
    const first = all[0] as Extract<Action, { kind: "list" }>
    return { kind: "list", path: first.path ?? folder ?? "." }
  }
  const single =
    pipelines !== null && pipelines.length === 1 && pipelines[0]!.length === 1
  if (single && text.length > 0 && text.length <= shortCommand)
    return { kind: "run", command: text }
  const described = description?.trim()
  if (described) return { kind: "described", description: described }
  return { kind: "script" }
}
