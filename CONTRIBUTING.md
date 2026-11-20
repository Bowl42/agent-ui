# Contributing

Thanks for helping. Please open an issue before large changes so we can agree
on the approach first.

## Setup

Node 24 or later and pnpm (the version is pinned in `package.json`; run
`corepack enable` or install it yourself).

```sh
scripts/setup.sh   # enable the git hooks
pnpm install
pnpm exec playwright install chromium-headless-shell firefox webkit
pnpm check
```

CI runs `pnpm check:pr` on every pull request: the quick checks, the
story tests in Chromium and the Storybook build, in a few minutes. On
main it runs the full `pnpm check`, with Firefox, WebKit and the dark
theme too; run that yourself before opening a pull request that changes
a component. CI's story tests run in Playwright's container image, for
the same fonts every time; where a layout test fails there and not on
your machine, run them in it (the command is in
`.github/workflows/check.yml`). The pre-commit hook runs `pnpm check:quick` (ESLint
and Prettier with their caches, types and the registry, at once, in about
twenty seconds); the pre-push hook runs the full `pnpm check` (those, the
story tests in three browsers and the dark theme, and the Storybook build,
at once) before main or a tag is pushed, with the commit pushed checked
out. Changes are tested once, together, before they are released: a source
that passed is not checked again, and a release's tag commit (main's with
the built registry added) checks only the registry once main passed. The
commit-msg hook enforces Conventional Commits. Never bypass them with
`--no-verify`.

## How the repository works

It is a shadcn project set up as `shadcn init -t vite -b base -p nova`
writes it, plus a registry and Storybook. One setting differs:
`components.json` has `"rsc": true`, so the CLI leaves files as shadcn
wrote them, `"use client"` included. The fixed files are served to every
app, React Server Components ones too: components keep the directive;
hooks and libraries have none, as shadcn's (`use-mobile`). For an app
with `"rsc": false` the CLI (4.23) removes it, with any comment after
it, from every other file it writes, whatever the item's type (its
`/^["']use client["']$/g` keeps `lastIndex` between files), so an app
should set `"rsc": true` for the same files every time. It also drops,
in any item, the comments before a file's first statement: a file's header (a
licence, a note) goes after its imports, or after its export list, put
first, in a file with none. `pnpm registry:check` checks both.

- `src/components/ui`, `src/hooks`, `src/lib`: what an app gets. Every file
  is shadcn's, from `pnpm dlx shadcn@latest add --all`, except the fixed
  ones that `registry.json` lists, which are served from here.
- `registry.json`: the registry. The `theme` item holds the colour
  variables and CSS; the other items point at the fixed files.
- `src/index.css`: written by `pnpm theme`, which applies the `theme` item
  to the stylesheet `shadcn init` writes (`scripts/shadcn-init.css`). Do not
  edit it by hand; `pnpm check` fails if it is out of date.
- `src/stories`: the stories, which are the documentation and the tests.
- `src/perf`: benchmarks of the hot paths (scrolling a long list, typing
  in a long message, output streaming into a code block), run by
  `pnpm perf` in Chromium with React's production build
  (`PERF_BROWSER=firefox` or `webkit` for another engine). They print the
  median and 95th percentile per step and the share spent in style and
  layout (some also count the browser's own style, layout and script
  time over the frames after a step, which no script in the page sees); they assert nothing, as times depend on the machine. Run them
  before and after a change to a hot path and give both in the commit.
  To find where a step's time goes, the harness's `profile(name, step)`
  writes a CPU profile to `.vitest/profiles` (for DevTools' Performance
  panel), and `selectors(name, step)` prints the selectors its style
  recalculation spent most on.

## Rules

- **shadcn is the source.** Never hand-write a component shadcn has, and
  do not rename parts or props. `pnpm upstream` lists the files that differ
  from shadcn's registry: it must be exactly the fixed ones.
- **No business logic.** agentui is for any app. A component of its own
  (in `src/components`, outside `ui`) is a general pattern more than one
  app needs, named after the pattern, made of shadcn's parts, with view
  data and callbacks as props and English defaults for its text. Apps
  adapt to the parts; see [docs/building-apps.md](docs/building-apps.md).
- **shadcn's look, not patches on it.** Use shadcn's parts as they come,
  and the part or prop meant for the place (`InputGroupButton` in an input
  group, `Spinner`, `render` over faked attributes). A look a component
  needs beyond them is its own named part, defined once and reused, not
  classes overriding shadcn's at each use, and never `!`.
- **Fix in the theme first.** Contrast and forced-colours fixes go in the
  `theme` item. Change a component only for a bug the theme cannot fix
  (behaviour, semantics, names): make the smallest change, mark each change
  with an `// agentui:` comment saying why, add or update its item in
  `registry.json` with the fix in its description, and list it in the
  README and `docs/fixed-components.md`. Items that depend on a fixed item name it in full
  (`Bowl42/agentui/input-group`): a bare name is shadcn's file and would
  overwrite the fix (`pnpm registry:check` checks). Delete the item once
  shadcn ships the fix.
- **Checking whether shadcn fixed it.** For each fixed item, run
  `pnpm dlx shadcn@latest add <name> --diff`. If shadcn's file already does
  what every `// agentui:` change does, take shadcn's file
  (`add <name> --overwrite`), delete the item from `registry.json`, the
  README and `docs/fixed-components.md`, and say in the release notes that
  apps re-add it from shadcn.
- **Updating from shadcn.** Run `pnpm dlx shadcn@latest add --all
--overwrite`, then re-apply the fixes (`git diff` shows what the update
  undid) and drop those upstream has fixed. To pick up a new shadcn theme,
  replace `scripts/shadcn-init.css` with a fresh `shadcn init` stylesheet
  and run `pnpm theme`.
- **Apps' compilers.** `tsconfig.strict.json` type-checks what an app gets
  with the strict options apps commonly enable
  (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, …), and
  again with TypeScript 5 (`pnpm typecheck:ts5`, the compiler many apps still use, with
  Vite's template's `DOM.Iterable`), which reports what 6 does not, such
  as an attribute given twice. A shadcn file that fails either is a bug
  to fix like any other.
- **No group-has-\* over what streams.** `group-has-*/name` (a part
  styled by what its group holds) makes Chromium restyle the whole group
  whenever a node is added anywhere in it: in a message or a code block,
  every word or line streamed in. Let the group set a variable with its
  own `has-*` (`Message`'s `--message-lift`), or match a sibling
  (`[[data-slot=x]~&]:`), and measure it with `pnpm perf`.
- **Every component has stories.** Each story runs in Chromium, Firefox and
  WebKit, and again in the dark theme in Chromium; it executes its `play`
  function and fails on accessibility violations (WCAG 2.2 AA). Do not turn an axe rule off to make a story
  pass. The one exception is an upstream behaviour that is deliberate: scope
  it to the story and browser, and explain it (see the menubar stories).
  Forced colours can only be emulated in Chromium; those checks are in
  `src/test/forced-colors.browser.test.tsx`, and colour contrast of the
  theme in `src/stories/theme.stories.tsx`.
- Stories follow shadcn's examples, with Hugeicons icons. Wait for popups to
  finish opening or closing (`waitFor`) before asserting on them.
- English throughout: code, comments, docs, defaults and samples. Another
  language only where a story tests one: German or French for translated
  `labels`, Japanese for CJK layout.
- **Sample data is made up.** Stories, tests and docs use placeholders
  (`acme`, `example.com`, `sam`, `~/code/app`, `linux-box`), never real
  people, machines, paths, hosts, IDs, tickets, commits or text copied
  from a conversation or another project. `pnpm check:content` rejects
  home folders, private addresses, real email domains and other scripts
  outside stories, tests and docs.

## Pull requests

- One concern per pull request, from a branch; main only changes through
  pull requests, each reviewed by a maintainer (`.github/CODEOWNERS`).
- A fix comes with a story whose `play` test fails without it; a visual
  change with screenshots in light, dark and on a phone.
- Fill in the template's checklist. CI must pass before review.

## Commits and releases

- [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): description`, one concern per commit.
- Releases are made by the maintainers. First `pnpm readme:version
vX.Y.Z` points the README's install addresses at the new version;
  commit and push it. Then the Release workflow (the Actions tab, "Run
  workflow" on main, its version), which refuses a version the README
  does not name: once main's checks
  have passed on that commit, it runs `scripts/release.ts`, which commits
  the built registry off main (`public/r/<item>.json`, each item with its
  files' content, this registry's dependencies named by their built
  file's URL at the tag)
  and tags the result; then it makes the GitHub release, its notes the
  pull requests since the last. main keeps `Bowl42/agentui/<item>`.
- Edit the release's notes to say what an app must change, and every
  item to re-add together (an item moved, and every item that depends on
  it).
- Apps install a release from its built registry, as the README says:
  each item by its URL at the tag, or as `@bowl42/<item>` with the
  `@bowl42` registry in their `components.json`, one plain request an
  item. `Bowl42/agentui/<item>`
  works too, but the CLI then reads `registry.json` and each file with a
  GitHub request of its own, again for every dependency, one after
  another: minutes for a few dozen items.

## Licensing

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
