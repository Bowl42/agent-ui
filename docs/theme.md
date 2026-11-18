# Theme

`theme` is shadcn's neutral theme with these changes:

- **Contrast (WCAG 2.2 AA).** `--input` (field edges, switch tracks) and
  `--ring` (focus) are darker in light and lighter in dark, so they reach
  3:1. Light `--muted-foreground` and `--destructive` are darker, and dark
  `--destructive` lighter, so text reaches 4.5:1 on muted surfaces and on
  the destructive tint. The `Theme/Colours` story tests every pair.
- **Fonts.** The platform's own: `--font-sans` is the system UI face
  (San Francisco, Segoe UI, Roboto…), `--font-mono` SF Mono or the
  platform's monospace. Geist is no longer used; an app may drop
  `@fontsource-variable/geist` and its import.
- **A third grey.** `--subtle-foreground` (`text-subtle-foreground`), a
  step fainter than `--muted-foreground`, for what is read last:
  placeholders, counts, times, section labels, a breadcrumb's parent. It
  is at least 4.5:1 on the page, cards and the sidebar in both themes; on
  a muted surface use `--muted-foreground`.
- **Status colours.** `--success`, `--warning` and `--info`, used like
  `--destructive`, as [shadcn adds colours](https://ui.shadcn.com/docs/theming):
  `<Badge className="bg-success/10 text-success dark:bg-success/20">`.
- **Chart colours.** shadcn's neutral `--chart-1`…`--chart-5` are greys,
  the lightest 1.5:1 on white. These are five hues (blue, orange, green,
  ochre, pink) at 3:1 or more on the page, cards and popovers in both
  themes, ordered so neighbouring series stay apart with red-green colour
  blindness. Where any two series can touch (scatter plots, maps), use at
  most the first three; add a legend whenever there are two or more series.
- **Floating shadow.** `--shadow-float`, the `shadow-float` utility: a
  hairline and a soft shadow, a step deeper in dark, for what floats over
  the page (the composer, its popovers, find bars, jump buttons). Flat
  things keep a 1px border. shadcn's `shadow-md` and `shadow-lg` (menus,
  popovers, hover cards, sheets, toasts) are this shadow too, so all that
  floats has one edge; `shadow-xl` stays deeper. Dialogs and alert dialogs
  get a deeper one, `--shadow-dialog`, and in dark a darker overlay.
- **Type scale.** Three steps added to Tailwind's, each with its line
  height, so that components use named sizes, not pixel values:
  `text-2xs` 11px/16px (captions, counts, badges, keys), Tailwind's
  `text-xs` 12px/16px, `text-2sm` 13px/20px (secondary text in a dense
  place: a turn's work, viewers' rows, the address bar, an outline),
  shadcn's `text-sm` 14px/20px, `text-md` 15px/24px (a reader's text)
  and Tailwind's `text-base` 16px. A `2` step is the one just under its
  name, as `2xs` is under `xs`; the names are T-shirt sizes so that
  `cn` merges them as sizes, not as colours.
- **Radius.** `rounded-xs` is the theme's `--radius` × 0.4 (4px), the
  step under `rounded-sm` (6px) on shadcn's ladder (8, 10, 14, 18px), for
  thumbnails and marks; Tailwind's own `rounded-xs` was 2px, off it.
- **Greys everywhere.** Selected text is a grey, menu items' leading icons
  are muted, and dark `--muted` is a step lighter than cards and popovers,
  so tracks, skeletons and the drawer's handle show on them. `--input` is
  as light as 3:1 allows.
- **Disabled items.** A disabled accordion trigger and radio item are
  dimmed, as other disabled controls are (shadcn's classes missed them).
- **Icon lines.** An outline icon whose paths carry their own stroke (an
  `<svg fill="none">` whose shapes have a `stroke`, as Hugeicons draws
  them) draws it 1.5px at any size (`vector-effect: non-scaling-stroke`)
  instead of thinning and thickening with the icon. Filled shapes
  (`stroke="none"`), lucide icons (the stroke on the `<svg>`) and charts
  keep theirs; a `stroke-*` class still wins.
- **Scroll fades.** shadcn's `scroll-fade-*` utilities (code blocks,
  the message scroller, attachment groups) animate the fade with the
  scroll position, through a gradient in a custom property that every
  element inside inherited, so each scroll restyled all of it: 57 ms a
  scroll for a code block of 3,500 lines. The theme resets
  `--scroll-fade-block` and `--scroll-fade-inline` on the children of a
  fading element, so the change stops there; the fades look the same.
  (Not with `@property`: the shadcn CLI adds an `@property` rule again on
  each install.)
- **Shimmer.** shadcn's `shimmer` (a running step, an uploading file)
  sweeps toward stronger contrast in dark but in light fades the text to
  a fifth of its alpha, about 1.3:1 for muted text. In light the theme's
  `--shimmer-color` is the text's colour 0.35 darker (muted text sweeps
  to about the foreground), so in both themes the words never drop below
  their own contrast. A `shimmer-color-*` class still wins.
- **Forced colours.** In Windows high contrast, focus shows as an outline
  and highlighted, pressed and active items as `Highlight`, where the
  components use box shadows and fills that the mode removes.
- **The page's root.** `html` is painted in `--background` as `body` is,
  so a native shell that reads the page's colour (WKWebView's
  `underPageBackgroundColor`, the overscroll area) follows the theme and
  an app's palette.

## Palettes

An app picks its own colours in a CSS file of its own, which adding the
theme again never touches. It sets seven base roles; the theme derives
the rest from them (`color-mix()` in oklch), so they follow in light and
dark:

| Base role      | Derived from it                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--background` | `--card`, `--popover`, `--primary-foreground`, and with `--foreground` the greys: `--secondary`, `--muted`, `--muted-foreground`, `--subtle-foreground`, `--input`, `--sidebar-tree` |
| `--foreground` | `--card-`, `--popover-`, `--secondary-`, `--accent-` and `--sidebar-foreground`, `--code-comment` (as `--muted-foreground`), the shadows' hairlines                                  |
| `--primary`    | `--sidebar-primary`                                                                                                                                                                  |
| `--accent`     | `--sidebar-accent` (in dark, a step of `--foreground` over `--sidebar`)                                                                                                              |
| `--sidebar`    |                                                                                                                                                                                      |
| `--border`     | `--sidebar-border`                                                                                                                                                                   |
| `--ring`       | `--sidebar-ring`                                                                                                                                                                     |

```css
/* src/palette.css, imported after the theme's CSS */
:root[data-palette="warm"] {
  --background: oklch(0.985 0.008 85);
  --foreground: oklch(0.21 0.015 60);
  --primary: oklch(0.27 0.025 50);
  --accent: oklch(0.95 0.015 80);
  --sidebar: oklch(0.97 0.012 82);
  --border: oklch(0.9 0.02 80);
  --ring: oklch(0.55 0.03 70);
}
:root[data-palette="warm"].dark {
  --background: oklch(0.2 0.012 70);
  --foreground: oklch(0.93 0.015 85);
  --primary: oklch(0.9 0.02 85);
  --accent: oklch(0.28 0.015 70);
  --sidebar: oklch(0.165 0.01 70);
  --border: oklch(0.93 0.015 85 / 10%);
  --ring: oklch(0.7 0.02 75);
}
```

with `<html data-palette="warm">`. The `Theme/Colours` story `AppPalette`
tests this palette.

- **On the root, both themes.** The derived roles are computed where the
  theme declares them, on `:root`; set on an element inside the page, a
  base role changes only itself. `:root[data-palette]` outranks the
  theme's `.dark` too, so a palette sets its dark roles as well, or its
  light ones stay in the dark theme.
- **Contrast is the app's.** The greys are fixed steps between the
  background and the foreground, so they keep their contrast when the
  two are about as far apart as the theme's (L 0.205 on 1, 0.947 on
  0.192). Status colours (`--destructive`, `--success`, `--warning`,
  `--info`), `--chart-1`…`--chart-5` and the `--code-*` tokens are the
  theme's own; a palette whose surfaces move far from the theme's sets
  them too. Check the pairs `Theme/Colours` lists against the palette.
- **The native shell.** The root is painted in `--background`, so a
  WKWebView's under-page colour follows. `<meta name="theme-color">` is
  the app's: read it from the page, e.g.
  `getComputedStyle(document.documentElement).backgroundColor`, again
  when the theme or palette changes.
