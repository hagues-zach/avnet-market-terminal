# Copilot instructions: Avnet Market Intelligence Terminal

Next.js 15 (App Router), React 19, TypeScript, Tailwind 3, pnpm 10, Node 20 or later (CI uses 22). The dev server runs on port 3002. Start with `README.md` (run, test, deploy), `DESIGN.md` (visual and copy rules) and `docs/mvp-plan.md` (what to build next, launch 2027-02-01). Setup on the Avnet machine is in `docs/avnet-machine-setup.md`.

## Public repo

This repository is public. Never commit:

- pilot users' names, or anyone's name tied to the pilot (refer to them by role, as `docs/mvp-plan.md` does);
- Avnet internal figures (billings, bookings, backlog, share, customer lists), real or realistic;
- secrets or `.env.local`. Top customers go in `BRIEF_TOP_CUSTOMERS` or the gitignored `data/private/`; licensed data goes in the gitignored `data/cycle/licensed/`.

Avnet's own numbers in the repo come from `src/lib/avnet/mock.ts` and are synthetic, marked Mock on every page.

## Check before every commit

```bash
pnpm -s typecheck
pnpm -s test
```

`./scripts/ci.sh` is the full CI check (frozen install, typecheck, tests, `next build`). `pnpm test cycle deck` runs only test files whose path contains those words.

## Tests

- A test is a plain `*.test.ts` file anywhere under `src/`, next to the code it tests. There is no Jest or Vitest.
- `scripts/test.ts` finds every one and runs each in its own `tsx` process; the exit code is the verdict.
- Write tests with `node:assert/strict`, top-level code (or an async `main`), and end with a line like `console.log("ai dashes: ok")`. Set `process.exitCode = 1` on failure if you don't throw. See `src/lib/ai/dashes.test.ts`.
- Tests must not call the network or Claude. Use recorded fixtures and fakes (`src/lib/store/fake-sql.ts`, `src/lib/brief/fixtures.ts`). Live checks are separate scripts behind a `--live` flag or under `scripts/`.
- `src/lib/deck/pptx.test.ts` needs the `unzip` command on the PATH.

## Code conventions

- Import from `src` with the `@/` alias (`@/lib/visibility`).
- Pages live in `src/app/(terminal)/<route>/page.tsx`; their parts in `src/components/<area>/`; logic in `src/lib/<area>/`, kept free of UI imports so it can be tested with `tsx`.
- **Saved results go through the store seam**, `src/lib/store` (`store` and `snapshots` from `src/lib/store/index.ts`). Never write files or call a database directly for saved data. Namespaces carry a version (`brief-corpus-v1`); change the shape by bumping the version, not by migrating. Writes never throw. `STORE_ADAPTER` picks `file`, `databricks` or `oracle`; see `docs/storage.md`.
- **Avnet's own data goes through `src/lib/avnet`** (`AVNET_DATA` picks `mock` or `databricks`), checked against the contracts in `docs/data-contracts.md`.
- **Hiding a page:** add its path to `HIDDEN_PATHS` in `src/lib/visibility.ts`. That hides it from the nav, direct URLs, links, decks, Start Here and Ask the Terminal while keeping its code. Any plain `<Link>` to a hideable page must be wrapped in `isHidden(...)`, or use `visible(links)`. Tab order and hubs are in `src/components/layout/nav.ts`.
- Roadmap items live in `src/lib/roadmap/items.ts`; edit that file to move them.
- The Claude model id is `MODEL` in `src/lib/ai/claude.ts`. Every feature that needs a key (Claude, TTS, DART, SEC) must still render without it and say what is missing.
- Every new environment variable goes in `.env.example` with what it does, its default and whether it is optional.
- PowerPoint and PDF exports build on `assets/brand/avnet-template-fy27.pptx` through `src/lib/brand/pptx`.

## Design rules (full detail in DESIGN.md)

- Light only. Use the semantic Tailwind tokens, not raw hex.
- Avnet Green `#41C363` is fill, rule and signal, never text on white. In charts, green means Avnet and nothing else; Arrow is dark blue `#4273B8`.
- **No Avnet slash mark.** The brand kit dropped it: never draw it, type "/" before titles, or use the slash pattern.
- One card level; no cards inside cards. No gradients, glows or decorative icons.
- Every figure has units, a period, a source and an as-of date. Mock data sits behind the dashed yellow hookup marker.

## Writing rules

For UI copy, docs, commit messages and every prompt that asks Claude to write text shown to users:

- No em-dashes or en-dashes. Use a full stop, a comma, a colon, or "to" for ranges.
- No slashes or middle dots in prose; write "to", "and" or "or". (Product names that contain one, such as "TAM / SAM / SOM", stay.)
- Plain sentences, as to a colleague. Lead with the answer.
- Claude prompts already carry this rule (see `src/lib/ask/claude.ts`, `src/lib/brief/synthesis.ts`); keep it in new prompts, and pass Claude's text through `plainDashes` or `plainDeep` from `src/lib/ai/dashes.ts` before showing or caching it.
- Claude output must not invent figures or include Avnet internal figures for users without access; the brief's eval (`src/lib/brief/synthesis-eval.ts`) checks both.
