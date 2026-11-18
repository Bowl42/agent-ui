# The grid

agent-ui lays out on one grid: a 4px module for every size and space,
and 12 columns for a page's layout. Components keep to it so that what
an app puts together lines up without values of its own.

## The 4px module

- **Sizes** (`h-*`, `w-*`, `size-*`, `min-*`, `max-*`) are whole spacing
  steps: 4px each (`h-7` 28px, `h-8` 32px, `size-4` 16px). No `.5` or
  `.25` steps.
- **Large boxes** (96px and up: a popup's or a panel's width, a
  preview's height, a dialog's) are multiples of 16px, the grid's
  gutter: `w-64` 256, `w-72` 288, `w-76` 304, `w-84` 336, `w-96` 384,
  not 260, 280 or 300. A width in columns is a span (`w-span-4` 240).
- **Space** (padding, margins, `gap-*`, `space-*`) is a step of one
  scale: 4, 8, 12, 16, 24, 32, 48, 64, 96 or 128 (`1`, `2`, `3`, `4`,
  `6`, `8`, `12`, `16`, `24`, `32`). Not 20, 28, 36 or 40: those are
  sizes, not space. Insets too, so content starts on the grid: a row's
  text 8 or 12 from its edge, not 10.
- **Room kept for a box** (a row's end clear of a 36px button over it,
  `pe-9`) is the box's size, not space: mark the line with a comment
  `// grid: clear (…)` above it, saying what the room is for.
- **Type** is a named size (`text-2xs` 11, `text-xs` 12, `text-2sm` 13,
  `text-sm` 14, `text-md` 15, `text-base` 16, `text-display` 22,
  `text-readout` 32 for a short code read out), never an arbitrary one
  (`text-[0.8rem]`, `text-[0.857em]`).
- **Line heights** are whole steps: 16 (`text-xs`, `text-2xs`), 20
  (`text-2sm`, `text-sm`), 24 (`text-md`, `text-base`), 28
  (`text-display`; the conversation's 16px text, `text-base/7`, an
  answer's and the reader's, room for CJK text), 40 (`text-readout`).
  Not `leading-snug`, `leading-normal` or `leading-relaxed` (a share of
  the size, off the grid), nor `text-md/4.5`.
  A line of text in a row of a whole step is centred in it (a 20px line
  in a 32px row sits 6 from its top): the row is on the grid, which is
  what lines up.
- **The one exception** is an optical nudge of 2px (`0.5`) to line up an
  icon, a mark or a key's glyph with a line of text: `mt-0.5`,
  `-translate-y-0.5`, `gap-0.5` between keys. Never padding of a box,
  nor space between boxes.
- **Glyphs** (icons, ticks) are sized as type is, not on the module,
  at one of four sizes: 12 by 11–12px text, 14 by 13px, 16 by 14–15px,
  20 by 16px or in a 40px or larger button. Not 10 or 18. A
  placeholder for what is not shown, without text beside it, is 24 in a
  tile or thumbnail (as shadcn's media) and 48 in a preview. Dots and
  swatches are marks (`grid: mark`). The box they sit in is on the
  module.
- Hairlines (borders, rings, rules of 2px or less: `h-px`, `w-0.5`) are
  drawn inside a box or as an outline; they do not move what follows
  off the grid.
- **Marks** that are not boxes (a chart's swatch, a drawer's handle, a
  scrollbar's track) are sized as glyphs are. Mark the line with a
  comment `// grid: mark` above it so the check skips it.

### Picking a step

A `.5` value rounds to a step by what it is for:

| What                                        | Rounds                      |
| ------------------------------------------- | --------------------------- |
| A control's inline padding (button, input)  | up: 10 → 12, 6 → 8          |
| A row's inline padding in a menu or list    | to 8 (from 6 or 10)         |
| A popup's or list's padding around its rows | to 4                        |
| An icon and its label                       | 8 by a 16px icon, else 4    |
| Space between related things                | down: 6 → 4, 10 → 8         |
| Space between groups (paragraphs, sections) | up: 6 → 8, 10 → 12, 14 → 16 |
| A row's height                              | to 24, 28, 32, 36, 40 or 44 |

### The conversation's rhythm

Down the conversation, space is by what it parts:

| Between                                    | Space |
| ------------------------------------------ | ----- |
| A list's items, a label and its value      | 4     |
| A heading and what it heads                | 8     |
| Blocks of a turn (paragraphs, code, steps) | 12    |
| A heading and the block before it          | 24    |
| Messages (the reader's, a turn)            | 24    |

Every line of text is on a whole step, so every block's edge is on
the 4px grid. Baselines are not snapped to it: the system's fonts
differ by platform and Firefox has no `text-box-trim`, so a baseline
grid would hold in one browser only. Boxes and line boxes are what
line up.

## 12 columns

A page's layout is 12 columns: 4 on a phone, 8 on a tablet, 12 from
`lg` (1024px). Gutters are 16px on a phone, 24px from `md`; a page's
margins are 16px on a phone, 24px from `md`, 32px from `xl`.

- **Panes** of an app (`AgentApp`): the sidebar and the main column
  are not columns of the page; they are panes, each with its own grid.
  The sidebar's default width is 240px; it is resized freely.
- **In a pane**, what is laid out in columns spans them: a settings
  page's label 4 of 12 and its control 8 (`Field orientation="responsive"`
  does this from its `FieldGroup`'s `@md`, 448px; a short control, a
  switch or a select, at the row's end, where a wide one ends; a
  description or an error under the control, from its start), a gallery's tiles 3 of 12 (four across), 4
  (three), 6 (two): `VirtualGrid` takes as many columns as fit, then as
  many as divide 12.
- **The conversation's column** (`AgentAppColumn`, `AgentAppPage`) is
  12 columns of 48px, 16 apart: 752px of content, 16px each side
  (`max-w-column`, 784px), centred in the main area; narrower, its
  columns narrower. Its text reads at that measure. What is in it spans its columns:

  | What                                                | Columns                               |
  | --------------------------------------------------- | ------------------------------------- |
  | Text, steps, cards, a code block, the composer      | 12                                    |
  | The reader's message (`UserMessage`)                | at most 9, at the end; 10 when long   |
  | A steer in a turn (`AgentTurn`)                     | at most 9, at the end                 |
  | A video (`MediaGallery`)                            | at most 9                             |
  | A recording (`MediaGallery`)                        | at most 6                             |
  | An image alone (`MediaGallery`)                     | at most 6                             |
  | Images in cards (`layout="flow"`)                   | 6 each of two, 4 of more              |
  | A thumbnail                                         | 3, 16px apart                         |
  | A settings field (`Field orientation="responsive"`) | label 4, control 8                    |
  | The details card beside it (`ConversationDetails`)  | 3 and a gutter (192px), in the margin |

  A span is `w-span-N` (or `max-w-span-N`): N of its container's 12
  columns and the gutters between them (`--grid-gutter`, 16px). On a
  phone the same spans are of its 4 columns: 9 of 12 is 3 of 4, 6 is
  2, 3 is 1.

- **Popups** are sized by what is in them, on the module, not by
  columns: a dialog `sm:max-w-sm` (384px), `md` (448px), `lg` (512px).

- **A page of its own** in the main area (a new tab's start page, a
  settings page) is the same column, `max-w-column px-4`. The reader
  (`MessageReader`) keeps a reading measure of its own, 640px.

## Tracks

A region (the sidebar, the composer, a palette) is laid out on columns
of its own, its **tracks**: what starts a row starts on its leading
line, what ends one ends on its trailing line, and text starts on its
text line, row after row, whatever the box around it. A glyph is placed
by its own edges, not its button's: a 28px button is 6px wider each
side than its 16px glyph, so it starts 6px before the line.

Where a box must sit off the module to put its glyph on a track, the
value is computed from the track, with a comment `// grid: track (…)`
above it saying how (`ps-[calc(var(--composer-lead)-(--spacing(1.5)))]`).
Stories measure each region's tracks in the browser, in all three
browsers, light and dark, on a desktop and a phone: a line is held
within a pixel (`onOneLine` in `src/stories/grid-lines.ts`).

### The sidebar (`AgentAppSidebar`)

| Track    | `inset`  | `sidebar`, a titlebar's | What is on it                                                      |
| -------- | -------- | ----------------------- | ------------------------------------------------------------------ |
| Margin   | 8        | 16                      |                                                                    |
| Leading  | 16       | 16                      | the search's icon, a group's label, a project's icon, a row's icon |
| Gap      | 8        | 8                       |                                                                    |
| Text     | the rest | the rest                | the search's words, a project's and a conversation's title         |
| Trailing | 16       | 16                      | new conversation, ⌘K, a group's +, a row's count, mark and menu    |
| Margin   | 8        | 16                      |                                                                    |

On a phone, as `sidebar`. The trailing line is a glyph's or a key's
end; a count's last digit.

### The composer (`Composer`, `ComposerShelf`)

| Track   | Width                               | What is on it                                                                 |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| Leading | `--composer-lead`, 16 from its edge | its text and placeholder, a shelf bar's icon, the toolbar's first glyph ("+") |

### A palette (`Command`, `CommandDialog`)

| Track   | Where                                  | What is on it                                      |
| ------- | -------------------------------------- | -------------------------------------------------- |
| Leading | a row's padding (8) in from the list's | the search's icon, a group's heading, a row's icon |
| Text    | 24 past it (a 16px icon, 8 between)    | the search's text, a row's words                   |

### A dialog (`Dialog`)

| Track    | From its edge | What is on it                                                        |
| -------- | ------------- | -------------------------------------------------------------------- |
| Leading  | 16            | its title, its words, its fields                                     |
| Trailing | 16            | the close button's glyph, its fields' ends, its footer's last button |

### Rows (`Item`, `Field`)

| Track    | What is on it, row after row                                                       |
| -------- | ---------------------------------------------------------------------------------- |
| Media    | an item's icon                                                                     |
| Text     | an item's title and description; a field's label and description                   |
| Control  | a field's input (`orientation="responsive"`: 4 of 12 columns in, to the end)       |
| Trailing | an item's last action; a field's switch or select (`responsive`: at the row's end) |

## Beyond space and size

- **Opacity** of a colour (`bg-muted/50`, `text-foreground/80`) is one
  of 5, 10, 15, 20, 30, 40, 50, 60, 70, 80 or 90.
- **Motion** is timed by the theme, by name: `motion-hover` (100ms),
  `motion-fade` (150), `motion-size` (200), `motion-slide` (400) and
  `motion-pop` (a popup: in at 150, out at 100), never a component's own
  `duration-200` or `ease-[cubic-bezier(…)]`; `duration-0` for none, a
  share of a `--motion-*` (a drawer's, by the swipe's strength) where
  one is needed. A loop's (a caret's blink) or a stream's (words fading
  in) is marked with a comment `// motion: …` above it.
- **Layers**: `z-0` and `z-10` within a component (a sticky header, an
  overlay over its own content), `z-20` for the app's own chrome over
  its content (the titlebar, the rail, a find bar), `z-50` for what is
  portalled over everything (menus, popovers, dialogs, sheets; Base
  UI's), toasts over those.
- **Breakpoints**: the viewport has one, `sm` (40rem): a phone or not,
  with `pointer-coarse` for a finger. A field's text size switches at
  `md`, as shadcn's Input does (16px under 48rem, so iOS does not zoom
  into it). Everything else a component lays out by its own width,
  with container queries (`@md`, `@3xl`…).
- **Pixel constants** in code (`const paneWidth = 288`) follow the same
  rules: a width or height on 4 (16 from 96 up), a gap or an inset a
  step of the scale.

`pnpm check:grid` lists anything off these rules; `pnpm check` runs it.
An app checks its own views by the same rules with the `check-grid`
item (`shadcn add @bowl42/check-grid`): `node scripts/check-grid.ts`
reads src/components and src/lib, or the files and directories it is
given, and exits 1 with what it found, for CI.
