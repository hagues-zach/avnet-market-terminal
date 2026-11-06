# Morning brief plan

The build plan for the per-user morning brief: a spoken and written briefing, ready each morning, scoped to the suppliers, customers and technologies a user covers. Part of the MVP in `docs/mvp-plan.md`.

Last updated: 2026-11-05

## What it is

- **Who:** each signed-in user, starting with the six pilot users; about 500 users by the end of calendar 2027.
- **When:** built ahead of time and ready by **6:00 am Eastern** every weekday, so it is waiting at first login.
- **Where:** in the app only, on Market News. Email and a podcast feed are on the roadmap.
- **What:** a written brief with linked sources and a spoken version from Google Cloud Text-to-Speech.
- **Self-serve:** the user sets their profile once at onboarding; the brief needs no upkeep after that.

## Decisions (2026-11-05)

1. **Extend the news pipeline; don't build another.** The brief reads the same sources as Market News (`getLiveNews` in `src/lib/data/live/news.ts`, `tagArticle` in `tagging.ts`, the briefing rules in `src/lib/news/briefing.ts` and the angles in `src/lib/ai/news-angles.ts`). Keep the existing names: `LiveArticle`, `ArticleTags`, `SourceStatus`, `Angle`.
2. **One shared corpus a day.** One job builds and stamps the day's corpus; per-user briefs select from it and never call a news source themselves.
3. **X ingestion is on the roadmap** (FY27 Q4), not in the MVP. It needs a $200/month budget approval first. The case for it is below.
4. **Google Cloud Text-to-Speech** at launch for cost. ElevenLabs is the later premium option.
5. **Profiles, preferences and brief history live in Oracle**, with row-level security so a user reads only their own. The shared corpus is readable by every signed-in user.
6. **Customers are a watchlist plus discovery.** A user follows Avnet's top Americas customers and the customers they serve. The brief also surfaces customers they don't serve yet when the news is relevant to their suppliers or technologies ("Worth knowing").

## Length: recommendation

The goal is 10 to 15 minutes, with 15 as a hard cap. The recommendation is to build for that but **default to about 10 minutes**, in chapters:

| Chapter | About | Content |
|---|---|---|
| 1. Top of the morning | 1 min | The three things that matter most to this user today |
| 2. Your suppliers | 3 min | Watchlist suppliers, by importance |
| 3. Your customers | 2–3 min | Watchlist customers, then "Worth knowing" |
| 4. Your technologies | 2–3 min | Segment moves: pricing, lead times, capacity, nodes |
| 5. Market and filings | 1–2 min | Earnings, SEC filings, regulatory items in the user's scope |

Why: a morning listen competes with email and the first meeting, so the most important minute has to come first and every chapter has to work as a stopping point. The length also flexes with the news: a quiet day should not be padded to 10 minutes. On a heavy day the brief stops at 15 and the rest stays in the written version.

A **Quick (about 5 minutes)** setting covers chapter 1 plus one line per item. The pilot decides the default by measuring how far people actually listen; if most stop around minute 6, the default moves down.

At about 150 spoken words a minute, 10 minutes is about 1,500 words or 9,000 characters of script.

## Architecture

```
06:00 ET deadline
  ↑
[per-user assembly]  profile → rank corpus → pick stories → intro + transitions → script → audio
  ↑                                      (cheap; per user)
[shared synthesis]   each story × tech tier → written summary + audio clip per voice
  ↑                                      (expensive; done once, shared)
[shared corpus]      getLiveNews + tagArticle (+ customer facet) → stamped, deduped, stored in Oracle
  ↑
02:00–04:00 ET corpus job
```

**Synthesis is the cost multiplier, so share it.** Each story is written once per tech tier (beginner, intermediate, advanced) and voiced once per offered voice. A user's brief is a selection of those pieces plus a short personal intro and transitions. Synthesis and audio then grow with the number of stories and voices, not users. The trade-off: stitched clips can sound less continuous than one long recording. Test this in phase B4 and fall back to whole-brief audio for the pilot if it sounds wrong (six users makes that cheap).

### Corpus

- Sources: everything `getLiveNews` reads today (RSS, GDELT, SEC EDGAR, Federal Register). X joins later behind a feature flag.
- Freshness stamps on every item: `ingestedAt`, source `publishedAt`, source id.
- Dedup as today (URL, normalized title); X post id later.
- **New customer facet** in `tagArticle`: a curated Americas customer universe (OEMs and EMS) with aliases, plus a `topCustomer` flag. Like the supplier facet, it uses rules, not Claude.

### Ranking

Score each item for a user from: facet matches against the profile (supplier, customer, technology, region), the existing High / Useful / Low relevance, freshness and source quality (trade press ahead of GDELT, as today). Pick per chapter until the length budget is spent.

As built (`src/lib/brief/rank.ts`): each chapter has a share of about 10 minutes (1, 3, 2.5, 2.5 and 1.5 minutes). Stories below a floor score are never used as padding, so a quiet day gives a short brief. On a heavy day the strongest leftovers may run a chapter to twice its share, up to the 15-minute cap, and the rest go to the written brief. A story already in an earlier brief is held back. The top three must match the user's own suppliers, customers or technologies; a top customer the user only follows goes in Your customers. Quick is the top three plus one line per story, up to 5 minutes. Ranking leans on Claude's relevance ratings: on a corpus built without them, general items with a keyword match get in, so the corpus job should run with Claude on.

### Synthesis rules

- Tiers as the handoff describes: **beginner** (plain language, acronyms defined), **intermediate** (the default analyst level), **advanced** (lead times, book-to-bill, packaging, nodes, competitive moves).
- Every claim cites a linked source. No made-up numbers, quotes or news. Drop a sentence whose figure is not in its source, as QBR Prep's talking points do (`src/lib/qbr/talking-points.ts`).
- Claude adds angles **after** tags and never invents tags (same as `getNewsAngles`).
- **Never** include confidential Avnet sales figures, including the supplier sheet. The script must be fit to post publicly.

### Profile (Oracle)

| Field | Notes |
|---|---|
| `user_id` | From the SSO subject |
| `role`, `region` | Drive access and Start Here |
| `suppliers[]` | From the supplier facet / line-card universe |
| `customers[]` | From the customer universe |
| `technologies[]` | The existing segments (Memory, Analog and Power, Logic and Processors, MCU and Embedded, Sensors and Opto, IP&E, Foundry and Equipment, RF and Connectivity) |
| `tech_tier` | `beginner` \| `intermediate` \| `advanced` |
| `voice` | A Google TTS voice id |
| `length` | `standard` (about 10 min) \| `quick` (about 5 min) |

Tables: `brief_profiles`, `brief_runs` (one per user per day: script, sources, audio location, timings) and `brief_feedback` (thumbs, listened-to position). All three use row-level security keyed on the signed-in user. The corpus tables (`corpus_items`, `corpus_story_summaries`, `corpus_story_audio`) are shared and read-only for users.

## Phases

| Phase | Where | Done when |
|---|---|---|
| B1. Corpus job | This machine, file store | Job builds and stamps a day's corpus; customer facet tags it; runs on a schedule. **Built 2026-11-05:** `src/lib/brief/corpus.ts`, `/api/cron/brief-corpus`, `.github/workflows/brief-corpus.yml`; customers in `CUSTOMERS` in `tagging.ts`; top-customer list from `BRIEF_TOP_CUSTOMERS` or a gitignored file |
| B2. Ranking | This machine | Hard-coded test profiles get sensible picks per chapter (a fixture eval like `src/lib/qbr/eval.ts`). **Built 2026-11-05:** `src/lib/brief/rank.ts` with test profiles in `profile.ts`; `rank-eval.ts` grades 10 cases on normal, quiet and heavy fixture days (`--live` adds today's corpus) and runs in `pnpm test` |
| B3. Tiered synthesis | This machine | Story summaries at three tiers with sources; an eval checks every figure is in its source and no Avnet internal figures appear. **Built 2026-11-05, not yet run live:** `src/lib/brief/synthesis.ts`; `synthesis-eval.ts` grades recorded answers with planted mistakes in `pnpm test`, and `--live` runs real calls and measures cost |
| B4. Google TTS | This machine | Clips per story and voice; a stitched 10-minute brief sounds continuous enough, or whole-brief audio is chosen. **Built 2026-11-05, listening test pending:** `script.ts`, `audio.ts`, `tts.ts`, tested against a fake voice; `scripts/brief-audio.ts` renders a brief both ways for the listening test |
| B5. Profiles in Oracle | Avnet machine | Profile, runs and feedback tables with row-level security; a user cannot read another's rows (test it) |
| B6. Onboarding | Avnet machine | Suppliers, customers, technologies, tier, voice (live samples) and length, from Start Here and settings |
| B7. Pilot | Avnet machine | Six pilot users get a brief by 6:00 am Eastern for two weeks in January; feedback captured on quality, length, latency and onboarding |

## Costs (planning estimates; confirm live rates)

**As built (B4).** Story summaries, chapter openings and the sign-off are shared clips, one per voice and text, kept so no user pays for them twice. A brief's only personal audio is its opening line (about 140 characters: the day and the chapters ahead). Clips are 24 kHz LINEAR16; stitching levels each clip to the same loudness, fades the edges so joins don't click, and puts fixed pauses between stories (0.65 s) and before chapters (0.9 s). The 15-minute cap, or 5 for Quick, is enforced on the real audio length by dropping the last stories and rewriting the opening to match. Whole-brief audio, the fallback, voices each chapter in one request (Google takes at most 5,000 bytes a request, so a 9,000-character brief is several requests either way) and costs every character per user.

**Google Cloud Text-to-Speech** is billed per character. Planning rates: about $16 per million characters for Neural2 voices and about $30 per million for Chirp 3 HD voices, with a monthly free allowance. Check the Google Cloud pricing page before budgeting.

| Users | Whole-brief audio per user | Shared clips + personal intro |
|---|---|---|
| 6 (pilot) | About 1.2M characters a month: free to a few dollars | Not needed |
| 500 | About 99M characters a month: about $1,600 (Neural2) to $3,000 (Chirp HD) | About 26M characters a month: about $400 to $800 |

Assumptions: 22 briefing days a month, 9,000 characters per brief, about 40 stories a day at three tiers and four voices.

**Claude synthesis.** QBR talking points cost about 1.3 cents each today. Shared story summaries keep the per-user cost to the intro and transitions. Measure it in B3 and B7 before quoting a figure for 500 users.

B3 estimate (2026-11-05, before any live call): one Claude Opus 5.5 call per story at low effort returns all three tiers plus a one-line Quick version, about 600 tokens in and 530 out, so **about 1.3 cents a story**. At 40 stories a day and 22 briefing days that is **about $11 a month for any number of users**. Filings use a template and cost nothing. Running the shared synthesis through the Message Batches API between the corpus job and 6:00 am would halve that. Confirm with `npx tsx src/lib/brief/synthesis-eval.ts --live` (six stories, about 10 cents) once spending is approved.

**X (roadmap, FY27 Q4).** About $200 a month at the planning ceiling: 30,000 post reads at $0.005 and 5,000 user reads at $0.010, pay-per-use, with a spend cap of $500 or lower in the X Developer Console. Reads only, one shared pull a day, never per user. `news.new` events stay behind a flag until access is confirmed.

### The case for X, for the budget conversation

- **Speed:** suppliers, customers and their executives often announce on X before trade press covers it; the brief at 6:00 am should not be a day behind.
- **Coverage:** about 100 supplier and 50 customer accounts, plus 15 to 20 technology searches. That is about 500 to 1,000 unique posts a day after dedup.
- **Fixed cost per user:** the pull is shared, so $200 a month is about $33 per pilot user and about $0.40 per user at 500 users.
- **Low risk:** pay-per-use with no contract and a hard monthly cap.
- **Measurable:** during a trial month, count how many brief stories came from X first and how many were X-only.

## Out of scope and safety

- No posting to X.
- No confidential Avnet sales figures in text or audio; the supplier sheet only chooses whom to cover.
- No made-up news, numbers or quotes; every claim links its source.
- No row-level security policy that lets one user read another's profile or briefs.
