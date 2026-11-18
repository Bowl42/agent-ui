import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

// Lists what is off agent-ui's grid (docs/grid.md:
// https://github.com/Bowl42/agent-ui/blob/main/docs/grid.md) in an app's
// .ts and .tsx files, src/components and src/lib by default:
// - a size, padding, space or line height of a half or quarter step, or
//   a pixel value not a multiple of 4 (a 2px nudge of a margin, a gap or
//   a position is allowed, as is a hairline: `h-0.5`, `w-px`);
// - a box 96px or larger not a multiple of 16px, the gutter;
// - space (padding, margins, gaps) not a step of the scale: 4, 8, 12,
//   16, 24, 32, 48, 64, 96 or 128;
// - a glyph of 10 or 18px, or any but 12, 14, 16 and 20 with text and
//   24 and 48 as a tile's or a preview's placeholder (an svg's size, or
//   a fraction of a step but 3.5);
// - type not a named size, or a line height not a whole step;
// - a colour's opacity not 5, 10, 15, 20, 30 … 90;
// - a duration or an easing of its own (`duration-200`, `ease-out`,
//   `ease-[cubic-bezier(…)]`), not the theme's motion-hover, -fade,
//   -size, -slide or -pop (a `duration-0` and a share of a --motion-*
//   are allowed);
// - a layer not z-0, z-10, z-20 or z-50;
// - a viewport breakpoint other than sm (md for a field's text size);
// - a pixel constant (`const fooWidth = 280`) or a size prop
//   (`width={280}`) off the same rules.
// A line after a comment with `grid: mark` is skipped (a mark, a swatch,
// a dot, a handle: sized as a glyph is); `grid: clear` skips its space
// (room kept for a box); `motion:` its duration (a platform's or a
// loop's). Exits 1 if there are any.
//
//   node scripts/check-grid.ts [files or directories…]

const files = (path: string): string[] =>
  statSync(path).isDirectory()
    ? readdirSync(path).flatMap((name) => files(join(path, name)))
    : /\.tsx?$/.test(path) && !path.endsWith(".d.ts")
      ? [path]
      : []

const targets = process.argv.slice(2)
const paths = (
  targets.length
    ? targets
    : ["src/components", "src/lib"].filter((dir) => existsSync(dir))
).flatMap(files)

const utility =
  "p|px|py|pt|pb|ps|pe|pl|pr|m|mx|my|mt|mb|ms|me|ml|mr|gap|gap-x|gap-y|space-x|space-y|h|w|size|min-h|min-w|max-h|max-w|top|bottom|start|end|left|right|inset|inset-x|inset-y|translate-x|translate-y|leading|scroll-m|scroll-mt|scroll-mb|scroll-p|scroll-pt|scroll-pb|basis"
// A nudge: these may be 0.5 (2px).
const nudge =
  /^(m|mx|my|mt|mb|ms|me|ml|mr|gap|gap-x|gap-y|top|bottom|start|end|left|right|inset|inset-x|inset-y|translate-x|translate-y)$/
// A hairline: a 2px or thinner rule.
const hairline = /^(h|w|min-h|min-w|max-h|max-w)$/
const step = new RegExp(
  String.raw`(?<![\w-])-?(${utility})-(\d+\.\d+|\[(-?\d+(?:\.\d+)?)px\])(?![\w.])`,
  "g"
)

// A box's size: 96px or more is a multiple of 16px.
const box = new RegExp(
  String.raw`(?<![\w-])(h|w|size|min-h|min-w|max-h|max-w|basis)-(\d+|\[(\d+)px\])(?![\w.])|(\d+)px\)`,
  "g"
)

// Space: a step of the scale (in spacing steps of 4px).
const scale = new Set([0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32])
const space = new RegExp(
  String.raw`(?<![\w-])-?(p|px|py|pt|pb|ps|pe|pl|pr|m|mx|my|mt|mb|ms|me|ml|mr|gap|gap-x|gap-y|space-x|space-y|scroll-m|scroll-mt|scroll-mb|scroll-p|scroll-pt|scroll-pb)-(\d+)(?![\w.])`,
  "g"
)
// Type: a named size, a line height of whole steps.
const type = new RegExp(
  String.raw`(?<![\w-])(?:leading-(?:tight|snug|normal|relaxed|loose)|text-(?:2xs|xs|2sm|sm|md|base|lg|xl|2xl|3xl|display)\/\d+\.\d+|text-\[[\d.]+(?:rem|em|px)\])(?![\w.-])`,
  "g"
)

// A glyph: 12, 14, 16 or 20px; 10 and 18 are off.
const glyph = /(?<![\w-])size-(2\.5|4\.5)(?![\w.])/g
// An svg's size by its parent: 12, 14, 16, 20, 24 or 48px.
const glyphs = new Set(["3", "3.5", "4", "5", "6", "12"])
const svgSize = /svg[^\s"'`]*\]:size-(\d+(?:\.\d+)?)(?![\w.])/g
// A colour's opacity.
const alphas = new Set([5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90])
const alpha = new RegExp(
  String.raw`(?<![\w-])(?:bg|border(?:-[trblxyse])?|ring|inset-ring|outline|fill|stroke|decoration|divide|caret|from|via|to|shadow|text-(?!(?:2xs|xs|2sm|sm|md|base|lg|xl|2xl|3xl|display)\/))[a-z-]*\/(\d+)(?![\w.])`,
  "g"
)
// A duration or an easing not the theme's: `duration-0`, and a value
// made of a --motion-* (`duration-(--motion-size)`), are allowed.
const timing =
  /(?<![\w-])(?:duration-(?:\d+|\[[^\]\s]*\]|\([^)\s]*\))|ease-(?:in-out|in|out|linear|\[[^\]\s]*\]))(?![\w-])/g
const ownTiming = (value: string) =>
  value === "duration-0" || /var\(--motion-|\(--motion-/.test(value)
// A layer.
const layers = new Set([0, 10, 20, 50])
const layer = /(?<![\w-])z-(\d+)(?![\w.])/g
// A viewport breakpoint: sm, or md for a field's text size.
const viewport =
  /(?<![\w@-])(?:max-)?(?:lg|xl|2xl):(?=[\w[&*-])|(?<![\w@-])(?:max-)?md:(?=[\w[&*-])(?![\w\-[\]&=*:()'.]*?(?:text|leading)-)/g
// A pixel constant.
// A size prop: `width={280}`.
const sizeProp = /(?<![\w-])(width|height)=\{(\d+)\}/g
// A width or height from 40px is on 4, from 96px on 16.
const offRoom = (px: number) =>
  px >= 40 && (px % 4 !== 0 || (px >= 96 && px % 16 !== 0))
const constant =
  /^\s*(?:export )?const \w*?(Width|Height|Gap|Inset|Padding|Margin|End|Edge)\s*=\s*(\d+)\s*$/

let found = 0
for (const path of paths) {
  const lines = readFileSync(path, "utf8").split("\n")
  lines.forEach((line, index) => {
    const above = lines[index - 1] ?? ""
    if (/grid: mark/.test(above)) return
    if (!/grid: clear/.test(above))
      for (const match of line.matchAll(space)) {
        if (scale.has(Number(match[2]))) continue
        found++
        console.log(
          `${path}:${index + 1}  ${match[0]} (not a step of the scale)`
        )
      }
    for (const match of line.matchAll(glyph)) {
      found++
      console.log(
        `${path}:${index + 1}  ${match[0]} (a glyph of 12, 14, 16 or 20)`
      )
    }
    for (const match of line.matchAll(svgSize)) {
      if (glyphs.has(match[1]!)) continue
      found++
      console.log(
        `${path}:${index + 1}  ${match[0]} (a glyph of 12, 14, 16 or 20; 24 or 48 a placeholder)`
      )
    }
    for (const match of line.matchAll(alpha)) {
      if (alphas.has(Number(match[1]))) continue
      found++
      console.log(
        `${path}:${index + 1}  ${match[0]} (an opacity off the scale)`
      )
    }
    if (!/motion:/.test(above))
      for (const match of line.matchAll(timing)) {
        if (ownTiming(match[0])) continue
        found++
        console.log(
          `${path}:${index + 1}  ${match[0]} (a timing of its own: motion-hover, -fade, -size, -slide or -pop)`
        )
      }
    for (const match of line.matchAll(layer)) {
      if (layers.has(Number(match[1]))) continue
      found++
      console.log(`${path}:${index + 1}  ${match[0]} (a layer off the scale)`)
    }
    for (const match of line.matchAll(viewport)) {
      found++
      console.log(
        `${path}:${index + 1}  ${match[0]} (sm, or a container query)`
      )
    }
    const named = constant.exec(line)
    if (named) {
      const [, kind, value] = named
      const px = Number(value)
      const off = /Width|Height/.test(kind!) ? offRoom(px) : !scale.has(px / 4)
      if (off) {
        found++
        console.log(`${path}:${index + 1}  ${kind} ${px} (off the grid)`)
      }
    }
    for (const match of line.matchAll(sizeProp)) {
      if (!offRoom(Number(match[2]))) continue
      found++
      console.log(`${path}:${index + 1}  ${match[0]} (off the grid)`)
    }
    for (const match of line.matchAll(type)) {
      found++
      console.log(
        `${path}:${index + 1}  ${match[0]} (not a named size or whole line)`
      )
    }
    for (const match of line.matchAll(step)) {
      const [whole, name, value, pixels] = match
      if (pixels !== undefined) {
        const px = Math.abs(Number(pixels))
        if (px % 4 === 0) continue
        if (px <= 2 && hairline.test(name!)) continue
      } else if (name === "size" && value === "3.5") continue
      else if (value === "0.5" && nudge.test(name!)) continue
      else if (value === "0.5" && hairline.test(name!)) continue
      found++
      console.log(`${path}:${index + 1}  ${whole}`)
    }
    for (const match of line.matchAll(box)) {
      const [whole, , steps, pixels, inCalc] = match
      const px =
        inCalc !== undefined
          ? Number(inCalc)
          : pixels !== undefined
            ? Number(pixels)
            : Number(steps) * 4
      if (px < 96 || px % 16 === 0) continue
      found++
      console.log(`${path}:${index + 1}  ${whole} (${px}px, not on 16)`)
    }
  })
}
if (found) {
  console.log(`\n${found} off the grid (docs/grid.md).`)
  process.exit(1)
}
