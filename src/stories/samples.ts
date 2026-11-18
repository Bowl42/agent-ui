/** Media made for the stories, so that none is kept in the repo. */

/** A tone of some seconds, as a WAV file: no media is kept in the repo. */
export function tone(seconds: number, hz = 440) {
  const rate = 8000
  const samples = rate * seconds
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const text = (at: number, value: string) =>
    [...value].forEach((char, index) =>
      view.setUint8(at + index, char.charCodeAt(0))
    )
  text(0, "RIFF")
  view.setUint32(4, 36 + samples * 2, true)
  text(8, "WAVE")
  text(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, "data")
  view.setUint32(40, samples * 2, true)
  for (let index = 0; index < samples; index++)
    view.setInt16(
      44 + index * 2,
      Math.sin((2 * Math.PI * hz * index) / rate) * 0.2 * 32767,
      true
    )
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }))
}

const para = (topic: string) =>
  `${topic} Run the shadcn CLI once per component you use. Files you changed locally are shown as a diff before anything is written, so nothing is overwritten silently. If you pinned an older version, bump it first; the theme item moved to a new name in this release, and the old name only logs a warning.`

/** A long answer in Markdown: release notes in sections, a few screens long. */
export const releaseNotes = `## Summary

${para("This release makes the conversation lighter.")}

${para("The vendor chunk now caches across deploys.")}

## What changed

${para("Long messages fold.")}

- The Preview tab is now Browser.
- Conversation and panel share one surface.
- Popover rows are 32px everywhere.

${para("Code blocks clamp at 12 lines.")}

## Upgrade

${para("Upgrading takes a few minutes.")}

### From v0.1.8

- Re-run \`pnpm theme\` after pulling.
- Replace \`Preview\` with \`Browser\` in your panel config.
- Popover rows changed height; check any fixed-height lists.

${para("Nothing else needs to change.")}

## Breaking changes

${para("The conversation and the right panel now share one surface.")}

${para("If you styled the gap between them, remove that rule.")}

## Performance

${para("Repeat visits load almost nothing.")}

${para("The first load is a third smaller.")}

## Next

${para("Next we will look at the composer.")}

${para("Then at the queue.")}
`
