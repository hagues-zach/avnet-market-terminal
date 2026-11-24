# Handoff: the terminal on the Avnet machine

Read this first when you pick the project up, whether you are a person or Copilot. It says what the app does today, what changed last, what has never run against a real system, and the traps. It points to the detailed documents rather than repeating them.

Written 2026-11-19, when the repository moved from the owner's personal machine and GitHub account to an Avnet-provisioned machine and Avnet's GitHub organisation.

| For | Read |
|---|---|
| Rules Copilot follows on every task | `.github/copilot-instructions.md` |
| Clean machine to running app, every environment variable, scheduled jobs | `docs/avnet-machine-setup.md` |
| What to build next and the launch date (2027-02-01) | `docs/mvp-plan.md` (see its status note) |
| Visual and copy rules | `DESIGN.md` |
| Where saved results live, Oracle and Databricks tables | `docs/storage.md` |
| Avnet's own data and the views it expects | `docs/data-contracts.md` |

## What the app is

An internal market intelligence tool for Avnet sellers, supplier managers and leaders. Next.js 15 App Router, React 19, TypeScript, Tailwind 3, pnpm 10, port 3002. Public data (SEC filings, trade press, Federal Register, FRED and other macro series, distributor line cards) is live; Avnet's own figures are synthetic mock data from `src/lib/avnet/mock.ts`, marked Mock on every page, until the Databricks views exist.

**In the sidebar today:** News (Market News, the landing page), Market (Overview, Cycle, TAM / SAM / SOM, Economic signals, Lead times & signals), Companies (Profiles, Earnings, Avnet vs Arrow), Avnet performance (Performance, Market share), Pitch Deck Builder, Setup (Data hookups, Code mapping), Roadmap, and Ask the Terminal in the top bar.

**Built but hidden** through `HIDDEN_PATHS` in `src/lib/visibility.ts` (code kept, page unreachable): Learning Center, Line Cards, Supply Chain, Lead Finder, Design Pipeline, Customers & End Markets, the cycle engine explainer, Scenario Modeler, QBR Prep. Remove a path from that list to bring a page back.

## What changed last

- **2026-11-24:** Market News article briefs are written ahead of time. `/api/cron/news-briefs` (run every 30 minutes by `.github/workflows/news-briefs.yml` and `scripts/news-briefs.sh`) writes briefs for new stories rated high or medium, at most 15 per run, so readers open a stored brief instead of waiting. Low-rated stories are still written on first open. "Why it matters to Avnet" now gets a dated, sourced Avnet profile (`src/lib/avnet/profile.ts`, reviewed each quarter after earnings; its test fails 120 days after the last review) and the story's tags; real top customers and suppliers can go in `data/private/avnet-context.json` (gitignored, never stated in a brief). Briefs moved to `news-briefs-v2`. The model is `NEWS_BRIEF_MODEL` (Opus 5.5 until the comparison below picks one). Opus vs Sonnet comparison: `scripts/news-brief-eval.ts` (sample, run, report) with a blind review page at `/dev/news-brief-eval`; not run yet, it needs a funded key.
- **2026-11-19, PR 59:** Start Here and the morning brief came out of the app. The root URL lands on Market News. The brief's pipeline is still in the code (`src/lib/brief`, the audio route, `/api/cron/brief-corpus`); its daily workflow is paused to stop it spending Claude credit on a brief nobody sees. `docs/mvp-plan.md` still lists both as MVP features: confirm with the owner before building on either.
- **2026-11-19:** Market News stories open their own page, `/news/[slug]`, instead of the outlet's site. The page shows a brief Claude writes once in its own words (takeaway, key points, why it matters to Avnet, what to watch), the byline, an About the author panel taken from the outlet's own author page, companies, topics, more stories, and newer and older story links. The original is a secondary "Read on <outlet>" link. Filings still link straight to SEC.
- **2026-11-19:** Trade-press feeds time out after 4 seconds instead of 8, so one slow outlet can't hold a cold first load of the landing page.

## Never run against a real system

Every item below is tested only against fakes or fixtures. The checklist with commands is section 4 of `docs/avnet-machine-setup.md`.

- Oracle and Databricks store adapters (`pnpm check:store oracle`).
- Databricks views for Avnet's figures.
- Claude article briefs and author lookups on Market News: the key on the old machine was rejected, so no real brief has been seen.
- Morning brief summaries and stitched audio (paused with the brief).
- Avnet SSO, roles and row-level security: not built yet.

## What AI costs

Prices are Claude Opus 5.5 on Anthropic's own API ($4 per million input tokens, $20 per million output), the model in `MODEL` in `src/lib/ai/claude.ts`. Bedrock and Vertex price separately. All estimates until a funded key logs real usage.

| Call | When | Estimate |
|---|---|---|
| Article brief (`src/lib/ai/news-brief.ts`, `src/lib/news/prewrite.ts`) | Ahead of time for each high or medium story (about 40 to 80 a day), or on first open for the rest; then stored | 2 to 7 cents on Opus, about half on Sonnet; the Avnet profile is a cached prefix, so it costs a tenth after the first call in a run |
| Author lookup (`src/lib/news/authors.ts`) | First story by each author, then stored | About 1 to 1.5 cents |
| News angles (`src/lib/ai/news-angles.ts`) | Up to 80 new stories per feed refresh, then stored | One batched call per refresh |

Writing ahead, article briefs run about $1 to $5 a day on Opus (roughly $30 to $150 a month), about half on Sonnet; `scripts/news-brief-eval.ts run` measures the real per-brief cost. Claude Sonnet 5.5 would roughly halve that; Claude Haiku 5.5 would cost a fraction of a cent per story, but compare the briefs side by side before switching.

## Traps

- **Article links never prefetch.** Rendering `/news/[slug]` writes its brief when the prewrite job hasn't, so a prefetch would buy a brief for every low-rated headline a reader scrolls past. Keep `prefetch={false}` on any new link to an article page.
- **The outlet's feed text stays on the server.** `LiveArticle.body` is Claude's input only; `getLiveNews()` strips it; only `getArticleWithText()` and `getLiveNewsWithText()` (the prewrite job and the eval sample) return it. Never render, store or pass it to a client component. The brief must stay in Claude's own words (copyright).
- **Check leaks on a production build.** `pnpm dev` adds React debug data to pages, which can include raw fetched responses on a first load. Build and `next start` before concluding that something reaches the browser.
- **SEC rate limits.** With an empty cache, opening several company pages quickly fires many sec.gov requests and SEC answers 429; data comes back on the next refresh. `refresh-filings.yml` keeps the cache warm once `SITE_URL` is set.
- **`SEC_USER_AGENT` must be an Avnet contact.** SEC asks for a real contact email; don't reuse a personal address.
- **The file store does not survive a container restart.** Saved briefs, angles and author profiles live in `.cache/ai` with `STORE_ADAPTER=file`. Use Oracle (the plan) or a mounted volume on any shared host.
- **`xlsx` installs from `cdn.sheetjs.com`,** not npm. Allow that host on the Avnet network or mirror the tarball.
- **Manual data chores:** a row in `src/lib/data/live/foreign/rs-halves.ts` each November when RS Group reports its first half; `npx tsx scripts/fetch-mops.ts` after each Taiwan filing deadline.
- **Old build output in git history.** A local build folder (`.next-hubs/`) was committed on 2026-10-29 and removed in the next commit. It holds no real secrets (only keys Next generated for that one local build, and cached public responses), but it adds about 96,000 lines to the history. A fresh push of the current tree instead of a repository transfer leaves it behind.

## Moving checklist

- [ ] Article pages merged to `main` before the move.
- [ ] Repository under Avnet's organisation, **private**. The repo was public, which is why the docs keep pilot users by role and Avnet figures synthetic; keep those rules anyway.
- [ ] Clone address updated in `docs/avnet-machine-setup.md` section 1.
- [ ] GitHub Actions settings recreated: the `SITE_URL` variable and the `CRON_SECRET` secret.
- [ ] Keys provisioned on Avnet's accounts, not copied from the old machine: `ANTHROPIC_API_KEY` (or a gateway token), `DART_API_KEY`, and `GOOGLE_TTS_API_KEY` if the brief returns.
- [ ] Hosting moved off the owner's personal Vercel project to wherever Avnet hosts it (the MVP plan says Oracle for storage; the Dockerfile builds a standalone server).
- [ ] `pnpm -s typecheck`, `pnpm -s test` and `./scripts/ci.sh` pass on the new machine.
