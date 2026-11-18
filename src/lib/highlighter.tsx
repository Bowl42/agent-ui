import * as React from "react"
import {
  createHighlighterCore,
  type GrammarState,
  type HighlighterCore,
  type ThemeRegistration,
} from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

// The languages it knows. Each one loads the first time it is used; an app
// adds its own with registerLanguages.
type LanguageLoader = Parameters<HighlighterCore["loadLanguage"]>[0]

const languages: Record<string, LanguageLoader> = {
  astro: () => import("shiki/langs/astro.mjs"),
  bash: () => import("shiki/langs/shellscript.mjs"),
  bat: () => import("shiki/langs/bat.mjs"),
  c: () => import("shiki/langs/c.mjs"),
  clojure: () => import("shiki/langs/clojure.mjs"),
  cmake: () => import("shiki/langs/cmake.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  csharp: () => import("shiki/langs/csharp.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  csv: () => import("shiki/langs/csv.mjs"),
  dart: () => import("shiki/langs/dart.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
  docker: () => import("shiki/langs/docker.mjs"),
  dotenv: () => import("shiki/langs/dotenv.mjs"),
  elixir: () => import("shiki/langs/elixir.mjs"),
  erlang: () => import("shiki/langs/erlang.mjs"),
  fish: () => import("shiki/langs/fish.mjs"),
  fsharp: () => import("shiki/langs/fsharp.mjs"),
  glsl: () => import("shiki/langs/glsl.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  graphql: () => import("shiki/langs/graphql.mjs"),
  groovy: () => import("shiki/langs/groovy.mjs"),
  haskell: () => import("shiki/langs/haskell.mjs"),
  hcl: () => import("shiki/langs/hcl.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  ini: () => import("shiki/langs/ini.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  json5: () => import("shiki/langs/json5.mjs"),
  jsonc: () => import("shiki/langs/jsonc.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  julia: () => import("shiki/langs/julia.mjs"),
  kotlin: () => import("shiki/langs/kotlin.mjs"),
  latex: () => import("shiki/langs/latex.mjs"),
  less: () => import("shiki/langs/less.mjs"),
  lua: () => import("shiki/langs/lua.mjs"),
  makefile: () => import("shiki/langs/makefile.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  matlab: () => import("shiki/langs/matlab.mjs"),
  mdx: () => import("shiki/langs/mdx.mjs"),
  nginx: () => import("shiki/langs/nginx.mjs"),
  nix: () => import("shiki/langs/nix.mjs"),
  "objective-c": () => import("shiki/langs/objective-c.mjs"),
  ocaml: () => import("shiki/langs/ocaml.mjs"),
  perl: () => import("shiki/langs/perl.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  powershell: () => import("shiki/langs/powershell.mjs"),
  prisma: () => import("shiki/langs/prisma.mjs"),
  proto: () => import("shiki/langs/proto.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  r: () => import("shiki/langs/r.mjs"),
  ruby: () => import("shiki/langs/ruby.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  sass: () => import("shiki/langs/sass.mjs"),
  scala: () => import("shiki/langs/scala.mjs"),
  scss: () => import("shiki/langs/scss.mjs"),
  solidity: () => import("shiki/langs/solidity.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  svelte: () => import("shiki/langs/svelte.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  terraform: () => import("shiki/langs/terraform.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  vim: () => import("shiki/langs/vim.mjs"),
  vue: () => import("shiki/langs/vue.mjs"),
  wgsl: () => import("shiki/langs/wgsl.mjs"),
  xml: () => import("shiki/langs/xml.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  zig: () => import("shiki/langs/zig.mjs"),
}

const aliases: Record<string, string> = {
  "c++": "cpp",
  cjs: "javascript",
  cs: "csharp",
  "c#": "csharp",
  cts: "typescript",
  dockerfile: "docker",
  "f#": "fsharp",
  golang: "go",
  h: "c",
  hpp: "cpp",
  hs: "haskell",
  js: "javascript",
  kt: "kotlin",
  kts: "kotlin",
  make: "makefile",
  md: "markdown",
  mjs: "javascript",
  mts: "typescript",
  objc: "objective-c",
  pl: "perl",
  protobuf: "proto",
  ps1: "powershell",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "bash",
  shell: "bash",
  shellscript: "bash",
  svg: "xml",
  tex: "latex",
  tf: "terraform",
  ts: "typescript",
  yml: "yaml",
  zsh: "bash",
}

/**
 * Adds languages, or replaces one it knows: each a name and a loader,
 * e.g. `{ elm: () => import("shiki/langs/elm.mjs") }`, and other names
 * for them (`{ el: "elm" }`). Call it before the code is shown.
 */
export function registerLanguages(
  added: Record<string, LanguageLoader>,
  addedAliases: Record<string, string> = {}
) {
  for (const [name, loader] of Object.entries(added))
    languages[name.toLowerCase()] = loader
  for (const [alias, name] of Object.entries(addedAliases))
    aliases[alias.toLowerCase()] = name.toLowerCase()
}

// agent-ui: terminal output's colours. Every colour, and each one dimmed
// (ANSI 2m), is at least 4.5:1 on the page, the muted surface and a diff
// line's tint, in its theme.
const syntax = {
  light: { text: "#171717", comment: "#636363" },
  dark: { text: "#ededed", comment: "#aeaeae" },
}

type Mode = keyof typeof syntax

// Each ANSI colour and its dimmed step.
const ansi: Record<Mode, Record<string, [color: string, dim: string]>> = {
  light: {
    black: ["#171717", "#636363"],
    red: ["#a2021a", "#cb1d2b"],
    green: ["#16662c", "#2b773c"],
    yellow: ["#704d25", "#85623a"],
    blue: ["#0050ad", "#0064d5"],
    magenta: ["#6328b8", "#7b48d7"],
    cyan: ["#006168", "#09737a"],
    white: ["#5d5d5d", "#686868"],
    brightBlack: ["#505050", "#686868"],
    brightRed: ["#bc001f", "#cb1d2b"],
    brightGreen: ["#29753a", "#2b773c"],
    brightYellow: ["#7e5b33", "#85623a"],
    brightBlue: ["#015ec7", "#0064d5"],
    brightMagenta: ["#703bc9", "#7b48d7"],
    brightCyan: ["#037178", "#09737a"],
    brightWhite: ["#676767", "#686868"],
  },
  dark: {
    black: ["#a4a4a4", "#a3a3a3"],
    red: ["#ff9b92", "#ff7b72"],
    green: ["#62d86e", "#3fb950"],
    yellow: ["#e9af41", "#d29922"],
    blue: ["#89befe", "#5aa6fe"],
    magenta: ["#c9a7ff", "#bc8cff"],
    cyan: ["#48d0da", "#1ab4be"],
    white: ["#dedede", "#b7b7b7"],
    brightBlack: ["#b1b1b1", "#a3a3a3"],
    brightRed: ["#ffbfb8", "#fe7f76"],
    brightGreen: ["#7af084", "#50c85e"],
    brightYellow: ["#fec764", "#d99f2c"],
    brightBlue: ["#b1d4ff", "#6aaefe"],
    brightMagenta: ["#dac5fe", "#be90ff"],
    brightCyan: ["#64e7f1", "#31c0ca"],
    brightWhite: ["#ffffff", "#d7d7d7"],
  },
}

/** Terminal output's theme: its ANSI colours, in light or dark. */
function terminal(mode: Mode): ThemeRegistration {
  const { text } = syntax[mode]
  const colors = Object.fromEntries(
    Object.entries(ansi[mode]).map(([name, [color]]) => [
      `terminal.ansi${name[0]!.toUpperCase()}${name.slice(1)}`,
      color,
    ])
  )
  return {
    name: `terminal-${mode}`,
    type: mode,
    colors: { "editor.foreground": text, ...colors },
    tokenColors: [{ settings: { foreground: text } }],
  }
}

/*
 * agent-ui: code's tokens by kind, each a class (code-keyword, …) whose
 * colour is a theme variable (--code-keyword, …): in colour by default,
 * every one 4.5:1 on the page, cards, the muted surface, the sidebar and
 * a diff line's tint; in greys under [data-code-tone=graphite]. Light,
 * dark or a tone, the tokens are the same; only the variables change.
 * The theme here only tells the kinds apart, by a stand-in colour each.
 */
const kinds = {
  "#000001": "code-comment",
  "#000002": "code-string",
  "#000003": "code-keyword",
  "#000004": "code-number",
  "#000005": "code-function",
  "#000006": "code-type",
  "#000007": "code-tag",
  "#000008": "code-property",
} as const

const text = "#000000"
const kind = (name: (typeof kinds)[keyof typeof kinds]) =>
  Object.entries(kinds).find(([, value]) => value === name)![0]

const tokens: ThemeRegistration = {
  name: "agent-ui-tokens",
  type: "light",
  colors: { "editor.foreground": text },
  tokenColors: [
    { settings: { foreground: text } },
    {
      scope: [
        "comment",
        "punctuation.definition.comment",
        "string.comment",
        "meta.diff.range",
        "meta.diff.header",
      ],
      settings: { foreground: kind("code-comment") },
    },
    {
      scope: [
        "string",
        "punctuation.definition.string",
        "string.regexp",
        "constant.character.escape",
        "markup.inline.raw",
        "markup.fenced_code",
        "markup.inserted",
      ],
      settings: { foreground: kind("code-string") },
    },
    {
      scope: [
        "meta.template.expression",
        "punctuation.definition.template-expression",
        "punctuation.section.embedded",
      ],
      settings: { foreground: text },
    },
    {
      scope: [
        "keyword",
        "storage",
        "storage.type",
        "storage.modifier",
        "keyword.operator.new",
        "keyword.operator.expression",
        "markup.heading",
        "markup.bold",
      ],
      settings: { foreground: kind("code-keyword") },
    },
    {
      scope: ["keyword.operator", "keyword.operator.assignment"],
      settings: { foreground: text },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "constant.other",
        "variable.language",
        "support.constant",
      ],
      settings: { foreground: kind("code-number") },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "variable.function",
      ],
      settings: { foreground: kind("code-function") },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "entity.other.inherited-class",
        "support.type",
        "support.class",
        "support.type.primitive",
      ],
      settings: { foreground: kind("code-type") },
    },
    {
      scope: ["entity.name.tag", "markup.deleted"],
      settings: { foreground: kind("code-tag") },
    },
    {
      scope: [
        "entity.other.attribute-name",
        "support.type.property-name",
        "meta.object-literal.key",
        "variable.other.key",
      ],
      settings: { foreground: kind("code-property") },
    },
  ],
}

/** A token's class by its stand-in colour; none for plain text. */
function kindClass(color: string | undefined) {
  return color ? kinds[color.toLowerCase() as keyof typeof kinds] : undefined
}

// agent-ui: dimmed ANSI text (2m), which Shiki gives half opacity and
// left every colour under 4.5:1, gets its colour's dimmed step instead.
const dimmed = Object.fromEntries(
  (Object.keys(ansi) as Mode[]).map((mode) => [
    mode,
    new Map<string, string>([
      ...Object.values(ansi[mode]).map(([color, dim]) => [color, dim] as const),
      [syntax[mode].text, syntax[mode].comment],
    ]),
  ])
) as Record<Mode, Map<string, string>>

function undim(style: Record<string, string>) {
  for (const mode of ["light", "dark"] as const) {
    const key = `--shiki-${mode}`
    const value = style[key]
    if (value && /^#[0-9a-f]{6}80$/i.test(value)) {
      const color = value.slice(0, 7).toLowerCase()
      style[key] = dimmed[mode].get(color) ?? color
    }
  }
  return style
}

// agent-ui: a token's weight, slant and line as well as its colour (bold
// keywords, italic comments, ANSI 1m, 3m, 4m, 9m); both themes give a
// token the same ones.
function tokenClass(style: Record<string, string> | undefined) {
  let className = "text-(--shiki-light) dark:text-(--shiki-dark)"
  if (!style) return className
  if (style["--shiki-light-font-weight"] === "bold") className += " font-semibold"
  if (style["--shiki-light-font-style"] === "italic") className += " italic"
  const line = style["--shiki-light-text-decoration"]
  if (line?.includes("underline")) className += " underline"
  if (line?.includes("line-through")) className += " line-through"
  return className
}

let highlighter: Promise<HighlighterCore> | undefined

function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [terminal("light"), terminal("dark"), tokens],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  })

  return highlighter
}

function getLanguage(language: string) {
  const name = language.toLowerCase()

  if (name === "ansi") {
    return name
  }

  if (name in languages) {
    return name
  }

  const alias = aliases[name]
  return alias && alias in languages ? alias : null
}

// Loads a language and returns a highlighter for it, or null for a language
// that is not listed.
export async function loadHighlighter(language: string) {
  const lang = getLanguage(language)

  if (!lang) {
    return null
  }

  const shiki = await getHighlighter()

  if (lang !== "ansi" && !shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(languages[lang]!)
  }

  return {
    // Returns one React node per line, and the grammar state after the last
    // line. Pass that state back to continue where the code left off.
    highlight(code: string, state?: GrammarState) {
      // ANSI has no grammar state, so each line is tokenized on its own and
      // gets the same colors whether it arrives in one piece or streams.
      if (lang === "ansi") {
        const lines = code.split("\n").flatMap(
          (line) =>
            shiki.codeToTokens(line, {
              lang,
              themes: { light: "terminal-light", dark: "terminal-dark" },
              defaultColor: false,
            }).tokens
        )
        return {
          lines: lines.map((line) =>
            line.map((token, index) => {
              const style = token.htmlStyle && undim(token.htmlStyle)
              return (
                <span
                  key={index}
                  style={style as React.CSSProperties}
                  className={tokenClass(style)}
                >
                  {token.content}
                </span>
              )
            })
          ),
          state: undefined,
        }
      }

      const tokens = shiki.codeToTokens(code, {
        lang,
        theme: "agent-ui-tokens",
        // agent-ui: only pass a state there is; an explicit undefined
        // fails to build with exactOptionalPropertyTypes.
        ...(state && { grammarState: state }),
      }).tokens

      return {
        lines: tokens.map((line) =>
          line.map((token, index) => {
            const className = kindClass(token.color)
            return className ? (
              <span key={index} className={className}>
                {token.content}
              </span>
            ) : (
              token.content
            )
          })
        ),
        state: shiki.getLastGrammarState(tokens),
      }
    },
  }
}

// Returns one React node per line, or null for a language that is not listed.
export async function highlightCode(code: string, language: string) {
  const highlighter = await loadHighlighter(language)

  return highlighter ? highlighter.highlight(code).lines : null
}
