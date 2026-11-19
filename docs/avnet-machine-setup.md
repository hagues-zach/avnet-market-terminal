# Setting up on the Avnet machine

From 2026-11-23 the terminal is developed on an Avnet-provisioned machine with GitHub Copilot. This page is everything needed to get from a clean machine to a running app, and an honest list of what has been proven against real systems and what has only been tested against fakes. What to build next is in `docs/mvp-plan.md`; the state of the app and its traps are in `docs/handoff.md`; Copilot reads `.github/copilot-instructions.md`.

## 1. Clone and install

Needs Node 20 or later (CI uses 22), pnpm 10, git, and `unzip` on the PATH (the PowerPoint export test calls it).

```bash
npm install -g pnpm@10.33.2
# Use the repository's address under Avnet's GitHub organisation once it has moved.
git clone https://github.com/hagues-zach/avnet-market-terminal.git
cd avnet-market-terminal
pnpm install
cp .env.example .env.local
pnpm dev
```

The app runs on http://localhost:3002 with no variables set: Avnet's figures are mock and marked so, AI features say they are off.

Network notes for a locked down Avnet network:

- `xlsx` installs from `cdn.sheetjs.com`, not the npm registry. Allow that host or mirror the tarball.
- Fonts are self-hosted, so `next build` needs no internet.
- Live pages call sec.gov, Federal Reserve and other macro feeds, trade press news feeds, opendart.fss.or.kr, TWSE, distributor line card pages, api.anthropic.com and texttospeech.googleapis.com. Pages whose host is blocked show their unavailable message instead of failing.

Then confirm the checkout is healthy:

```bash
pnpm -s typecheck
pnpm -s test
./scripts/ci.sh
```

## 2. Environment variables

Every variable is optional and documented in `.env.example`. Copy it to `.env.local` locally, or set the values on the host. "Avnet side" means the value has to come from Avnet IT, the data team or an Avnet-funded account; "public" means anyone can get it.

| Variable | What it does | Value from |
|---|---|---|
| `SITE_PASSWORD` | Password gate for the whole site. Replaced by Avnet SSO in Step 3 of the MVP plan. | Owner's choice until SSO |
| `CRON_SECRET` | Shared secret for `/api/cron` (filing refresh, brief corpus). Unset refuses every call. `openssl rand -hex 32` | Generate; same value in GitHub secrets |
| `BRIEF_TOP_CUSTOMERS` | Dormant while the morning brief is off Market News. Avnet's top Americas customers, flagged in the brief corpus. Internal: set it on the host or write `data/private/top-customers.json`, never commit it. | **Avnet side** |
| `SEC_USER_AGENT` | Contact sent to sec.gov. Needed for revenue mix, segment history and commentary. | An Avnet contact email |
| `DART_API_KEY` | Korean suppliers' statements (SK hynix, Samsung EM). | Public, free key |
| `KCS_SERVICE_KEY` | Reserved for the cycle engine's Korea adapter; not read yet. | Public, later |
| `ANTHROPIC_API_KEY` | Claude for news angles, article briefs and author details on Market News, commentary, Ask, talking points and brief summaries. | **Avnet side**: a funded key on Avnet's account |
| `ANTHROPIC_AUTH_TOKEN` | Alternative Claude credential, e.g. through an Avnet gateway. Either this or the key turns AI on. | **Avnet side**, if a gateway is used |
| `GOOGLE_TTS_API_KEY` | Dormant while the morning brief is off Market News. Google Cloud Text-to-Speech for the brief's audio. | **Avnet side**: a Google Cloud project with billing |
| `STORE_ADAPTER` | Where saved results live: `file` (default), `databricks` or `oracle`. Per the MVP plan, Oracle. | Set to `oracle` once Oracle exists |
| `DATABRICKS_CATALOG`, `DATABRICKS_SCHEMA` | Where `store_kv` and `store_snapshots` live when `STORE_ADAPTER=databricks`. | **Avnet side** |
| `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING` | Oracle login for the store tables (thin mode, no Instant Client). | **Avnet side**: the app's Oracle schema |
| `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `DATABRICKS_WAREHOUSE_ID` | The Databricks SQL connection, shared by the store adapter and the Avnet data layer. | **Avnet side**: workspace, service principal token, SQL warehouse |
| `AVNET_DATA` | Source of Avnet's own figures: `mock` (default) or `databricks`. | Set to `databricks` once the views exist |
| `AVNET_MOCK_DATASETS` | Datasets kept on mock while `AVNET_DATA=databricks`, e.g. `markets,supply`. | Owner's choice |
| `AVNET_CACHE_MINUTES` | Minutes to keep Avnet's figures between queries; default 15. | Optional |
| `AVNET_DATA_CATALOG`, `AVNET_DATA_SCHEMA` | Where the read-only `terminal_*` views live; default `gold` and `market_intelligence`. | **Avnet side**: the data team |
| `ASK_EVAL_URL`, `QBR_EVAL_URL` | Base URL for the Ask and QBR eval scripts. Dev only. | Local |
| `NEXT_DIST_DIR` | Build folder for a second dev server. Dev only. | Local |

Avnet SSO (Entra ID) has no variables yet; they are added when Step 3 of the MVP plan builds sign-in.

## 3. Scheduled jobs

All live in `.github/workflows/`. Scheduled workflows run only from `main`, and GitHub Actions settings do not move with the code: recreate the `SITE_URL` variable and the `CRON_SECRET` secret in the new repository. The two cron jobs are skipped until the `SITE_URL` repository variable is set, and need the `CRON_SECRET` repository secret to match the site's. Each calls a shell script, so an Avnet scheduler (Azure Pipelines, a cron on the host) can run the same script with `SITE_URL` and `CRON_SECRET` set if GitHub Actions can't reach the Avnet host.

| Workflow | When | What it does |
|---|---|---|
| `terminal-ci.yml` | Every pull request and push to `main` | `scripts/ci.sh` (typecheck, tests, build) and a Docker image build. No secrets. |
| `refresh-filings.yml` | Every 6 hours | `scripts/refresh-filings.sh`: reloads cached company filings so visitors never wait. |
| `brief-corpus.yml` | By hand only; the weekday 07:00 UTC schedule is paused while the brief is off Market News (the file says how to restore it) | `scripts/brief-corpus.sh`: builds the morning brief's shared corpus for the day via `/api/cron/brief-corpus`. Needs `ANTHROPIC_API_KEY` on the site for relevance ratings. |

Manual jobs, not scheduled: `npx tsx scripts/fetch-mops.ts` after each Taiwan filing deadline (mid-May, mid-August, mid-November, end of March); a new row in `src/lib/data/live/foreign/rs-halves.ts` each November when RS Group reports its first half; `npx tsx scripts/run-cycle-engine.ts` when the cycle engine's history is refreshed.

With `STORE_ADAPTER=file` on a container, the corpus and saved results last only as long as the container. Use a mounted volume or the Oracle adapter before relying on the brief.

## 4. Verified versus tested against fakes only

Nothing below has been run against a real Avnet system. Each needs its live check on the Avnet machine before the pilot depends on it.

### Store adapters (PR 47)

- [ ] **Oracle adapter** (`src/lib/store/oracle.ts`). Tested against an in-memory SQL fake only. Create the tables with `db/migrations/oracle/001_store.sql`, set the `ORACLE_*` variables, then run `pnpm check:store oracle`. It connects, finds both tables, runs the store contract on rows of its own and deletes them; it reads nothing else.
- [ ] **Databricks adapter** (`src/lib/store/databricks.ts`). Same status. Create the tables with `db/migrations/databricks/001_store.sql`, set the `DATABRICKS_*` variables, then run `pnpm check:store databricks`. Statements wait up to five minutes so a stopped warehouse can start.

`pnpm check:store` exits 0 when every step passes, 1 when one fails and 2 for a missing setting. See `docs/storage.md`.

### Avnet data layer

- [ ] **Databricks views for Avnet's figures** (`src/lib/avnet/databricks`). Tested only with the mock written out as view rows. Once the data team publishes the `terminal_*` views (`docs/data-contracts.md`), run `AVNET_DATA=databricks npx tsx scripts/check-avnet-data.ts`.

### Market News article pages

- [ ] **Claude article briefs** (`src/lib/ai/news-brief.ts`). Never run live: the key on the old machine was rejected. With a funded key, open three stories (one with full feed text, a GDELT story, a Federal Register notice), check each brief is in plain words with no copied sentences, then reload and check the second load makes no Claude call. Expected cost: about 2 to 7 cents per story, once; see `docs/handoff.md`.
- [ ] **Author lookup** (`src/lib/news/authors.ts`). Never run live. Open a Semiconductor Engineering or EE Times story with a byline and check the About the author panel shows the outlet's own title and bio, or just the name when the outlet has no author page.
- [x] **Feed text never reaches the browser.** Checked on a production build: eight story pages and the feed, first visits, no feed text in the HTML.

### Morning brief (paused)

The brief's UI was removed from Market News on 2026-11-19 (PR 59); its pipeline (`src/lib/brief`, the audio route, the corpus cron) is still in the code. The checks below matter only if it comes back.


- [x] **Corpus, ranking, script and stitching logic** (B1, B2, B4). Covered by `pnpm test` with fixtures and a fake voice.
- [ ] **Claude story summaries** (B3, `src/lib/brief/synthesis.ts`). Never run live; the eval grades recorded answers with planted mistakes. With a funded key, run `npx tsx src/lib/brief/synthesis-eval.ts --live` (six stories, about 10 to 15 cents). It checks every figure is in its source, no Avnet internal figure appears, and prints the real cost per story against the 1.3 cent estimate in `docs/morning-brief-plan.md`.
- [ ] **Stitched audio on a full brief.** Stitched clips were chosen over whole-brief audio after one listening test, on a 1.5-minute fixture brief in one voice (en-US-Neural2-F). Recheck on a full 10-minute brief and a Chirp 3 HD voice before voices are offered at onboarding: `npx tsx scripts/build-corpus.ts`, `npx tsx scripts/summarize-corpus.ts`, then `npx tsx scripts/brief-audio.ts` (needs `GOOGLE_TTS_API_KEY`; about 18,000 characters). Listen to the joins in `.cache/brief-audio/out/`. If they sound wrong, whole-brief audio is the fallback.

### Not built yet

Avnet SSO, roles and row-level security (Step 3 of `docs/mvp-plan.md`) and brief onboarding (Step 4) don't exist in the code yet, so there is nothing to verify.
