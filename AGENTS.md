# Working on agentui

A shadcn/ui registry for agent apps: shadcn's base-nova components,
an accessible theme and a few fixed components, tested in Storybook. Read
`CONTRIBUTING.md`; its rules apply to agents too.

- Components come from the shadcn CLI (`pnpm dlx shadcn@latest add <name>`);
  never hand-write one shadcn has. Only the files `registry.json` lists may
  differ from shadcn's (`pnpm upstream` shows them).
- No business logic: components of agentui's own are general patterns
  in `src/components` (see `docs/building-apps.md`).
- Theme changes go in the `theme` item of `registry.json`, then
  `pnpm theme` regenerates `src/index.css`. Never edit `src/index.css` by
  hand.
- Run `scripts/setup.sh` once per checkout. The pre-commit hook runs
  `pnpm check:quick`, the pre-push hook the full `pnpm check` before main
  or a tag; never bypass them with `--no-verify`.
- Never commit tokens or `.npmrc` credentials.
- Sample data is made up, never taken from real work: placeholder names
  (`acme`, `example.com`, `sam`, `~/code/app`, `linux-box`), no real
  people, machines, paths, hosts, IDs, tickets, commits or text from a
  conversation or another project. `pnpm check:content` catches some of
  it; the rest is on you.
- English throughout: code, comments, docs, samples. Another language only
  where a story tests one (German or French for translated `labels`,
  Japanese for CJK layout).
- Releases (`scripts/release.ts`, tags) are made by maintainers; a pull
  request never adds `public/r` or a tag.
