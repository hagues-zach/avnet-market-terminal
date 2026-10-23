# Ask the Terminal: design brief (step 2.20)

## Who and why

`/copilot`, under Tools. One question: **can I get a straight answer from the app's data, with its source, without knowing which page it is on?**

- **Sellers and FAEs** before a call: "How is Microchip doing?", "Who carries Lattice?", "What's the latest on onsemi?"
- **Sales leaders and executives** between meetings: "Are we ahead of Arrow?", "Where is the cycle?", "Is supply tightening?"
- **Analysts** checking a figure: they want the number, the period, the source and the page it came from.

Today the page is a chat on the older components with scripted answers matched by keyword. The scripts carry figures the app doesn't have (Polymarket recession odds, an ISM PMI of 49.1, Avnet at "~9.8%" of a "~$176B" channel, "#4 globally behind WT, WPG and Arrow"), em-dashes, slashes ("logic/memory/analog") and a green "Copilot" label. It calls itself Market Copilot. Anything it can't match gets a stock refusal.

PRD persona 5 and section 10.2; build plan step 3.2 ("Claude with tools over the app's live data, answering with sources"). The Anthropic account is out of credits, so Claude can't answer anything new. This pass designs the page so that it answers what the app can already answer, honestly and with sources, and so that 3.2 adds Claude on top of the same answerers rather than replacing them.

## The idea: answerers now, Claude later

The app already has rule-written reads over live data: the Avnet vs Arrow verdict, the cycle phase, the economic backdrop, the supply read, the earnings season, company figures, company news and line cards. Each becomes an **answerer**: a pure function that takes a question's subject (a company, a topic) and the data, and returns a sentence, the figures behind it, the sources with their dates, and the page to open. Typed questions are routed to an answerer by recognising the company or topic in them.

In step 3.2 the same answerers become Claude's tools, so Claude's answers cite the same figures. Until then, a question no answerer covers gets an honest reply: what it can answer instead, and a Planned chip for free questions.

## Questions and data

| Question | Answerer | Data | Status |
|---|---|---|---|
| How is <company> doing? | Latest quarter revenue and growth on a year ago, gross and operating margin, next earnings date, link to the profile and QBR Prep | `getPeerRows()`, the earnings calendar | **Live** (SEC) |
| Are we ahead of Arrow? | The Avnet vs Arrow verdict and the two biggest gaps | `src/lib/competitive` scorecard and verdict | **Live** |
| Where is the cycle? | The phase and supply-chain growth for the latest quarter | `getCycle()` | **Live** |
| What is the economy doing? | The economic backdrop sentence (demand, costs, financing, dollar) | `src/lib/signals` reads | **Live** |
| Is supply tightening? | The supply read over its three signals | `src/lib/supply` read | **Live** |
| Who has reported? | The earnings season: how many have filed, who is next | `src/lib/earnings` season | **Live** |
| What's the news on <company or topic>? | The latest three stories with dates and outlets | `getCompanyNews()`, `getLiveNews()` | **Live** |
| Who carries <supplier>? | Which collected distributors list it, from the latest snapshots | `src/lib/line-cards` store | **Live** (three distributors collected) |
| How is Avnet's business? | Billings, book-to-bill and backlog | The shared mock model | **Mock**, with the hookup marker under the answer |
| Anything else | What it can answer instead, and the closest suggestions | n/a | Free questions **Planned** (step 3.2) |

Every answer shows its sources as chips (Live or Mock), with the period ("CY26 Q2") and a link to the page. Where Claude has already written something and it is cached (management commentary, news angles), the answer can quote it, marked as written by Claude; nothing new is generated.

## The rules

In pure modules, `src/lib/ask/route.ts` and `src/lib/ask/sentences.ts`, with a tsx test:

- **Routing.** Find the company (name, short name or ticker in `COMPANIES`, longest match first) and the intent (cycle, Arrow, economy, supply, earnings, news, line card, Avnet's business). A company with no other intent is "how is it doing".
- **Answers.** Each answerer returns `{ text, facts, sources, href }` and never invents a number: a missing figure reads "n/a" and the sentence says what is missing.
- **Fallback.** No match: "I can't answer that from the app's data yet." plus three suggestions, ranked by word overlap with the question.
- **Content.** Every suggestion routes to an answerer; no answer text has a slash, a middle dot or an em-dash.

## Links into the rest of the app

- Every answer links to its page (Company Profile, QBR Prep, Avnet vs Arrow, Market Cycle, Economic Signals, Supply Chain, Quarterly Earnings, Market News, Line Cards, Performance Tracker).
- Mock answers carry the hookup marker, which links to Data Hookups.
- The Learning Center's methods, from "How is this calculated?" under an answer.

## Layout rules

- Lead with what it can do in one line; the question box is the primary control.
- Answers are documents, not chat bubbles: the sentence first, the figures in a small table, sources as chips, the page link. No avatars, no "Copilot" sparkle label, no typing animation.
- The answerer list is visible, so people know what to ask.
- Market and company figures are ink with arrows (no green or red unless it is Avnet's own figure).
- One Planned chip for free questions with Claude, naming step 3.2 and the API key; no fake "thinking" state.
- No em-dashes, no slashes, "n/a" for missing values.

## Taste review

Reading this as: an internal question-and-answer tool for Avnet sellers, leaders and analysts, over the app's own live data, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2 (answers appear in place; no typing effect), density 5 (an answer is read, not scanned). Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A chatbot that makes things up.** The page today. Answer: only answerers over the app's data; every figure has a source and a period, and the rest is "can't answer yet".
- **AI theatre** (sparkles, avatars, typing dots, "thinking"). Answer: none; answers are plain documents.
- **A blank box.** Answer: the answerer list and suggestions show what works.
- **Pretending Claude is on.** Answer: one Planned chip; cached Claude text is labelled as Claude's.
- **Chat bubbles in brand green.** Answer: no bubbles; green only for Avnet's own figures.

## Mockups

- `ask-the-terminal-a-thread.png`: one line on what it can answer, the question box with four suggestions, then a thread of answer documents, newest first (a company, Avnet against Arrow, Avnet's business with its Mock chip and marker, and an unanswerable question with the closest suggestions and the Planned line), beside a rail listing the nine answerers with an example question each.
- `ask-the-terminal-b-one-answer.png`: a wide question bar, one answer document (subject and quarter, the sentence, "The figures" table with Avnet and Arrow columns and a Leads column in words, source chips, page links), "Ask next" suggestions, a short "Asked this session" list, then "What you can ask" as a 3 by 3 grid of the answerers, each with an example and its Live or Mock chip, and the Planned line.

The answers in both mockups are illustrative: the figures (Microchip at $1.21B, Avnet against Arrow on seven measures) were typed into the prompts while the SEC caches were cold, and the measures in B's table are partly invented (cash conversion days, revenue per employee). The build reads every figure live and uses the scorecard's own measures. Drift to correct in the build:

- **Invented chrome and claims.** A adds "Engine: Deterministic Rule Base v2.4" (a version badge), Feedback and Export Data buttons, and an "Engine rules and integrity" card claiming "audited database models" and "one-click audit drilldowns". None of these exist.
- **Suggestions that don't route.** A's closest questions for the tariff question ("What is current gross margin?", "What did management say on pricing?") aren't answerers. The build only suggests questions the router answers, and the test checks that.
- **A** prefixes every question with "Q:", separates suggestions with middle dots, sets the mock strip in amber monospace, and titles the input card "QUERY WORKSPACE" in capitals.
- **B** sets the Ask button and the answer's subject label in capitals and the quarter in monospace; its "What you can ask" grid runs past the screenshot.
- Neither drew chat bubbles, avatars or sparkles, or coloured the Leads column.

## Decision

Built variant B with A's mock answer and A's "can't answer" card, quoting cached Claude text (chosen 2026-10-21). Routing is in `src/lib/ask/route.ts`, the sentences and the answer shape in `sentences.ts` (both pure, tested in `route.test.ts`), and the answerers in `answer.ts` (server-only).

- **The question lives in the URL** (`/copilot?q=...`), so an answer can be shared or bookmarked and the form works without JavaScript. The answer streams in under a loading block; the first answer after a restart can take a minute while SEC data loads.
- **The answer document**: subject and period, "You asked", the sentence, the figures (a table; Avnet against Arrow gets Avnet, Arrow and Leads columns with the two companies' colour squares in the header), any note, the stories for news, cached Claude text, the source chips and the page links.
- **Nine answerers**, all on the app's own data: a company (revenue, growth, gross and operating margin, next earnings, with Company Profile and Prepare a QBR), Avnet against Arrow (the scorecard verdict and every comparable measure), the cycle (phase, supply-chain growth, share growing, inventory days, Avnet and Arrow), the economy (the four reads), supply (the three signals), the earnings season (how many have reported and who is next), news (the latest three stories on a company or topic), line cards (which collected distributors list a supplier, saying Avnet's own line card isn't imported yet), and Avnet's business (mock, with the Mock chip after the sentence and the hookup marker under it, from A).
- **Cached Claude text**, never generated: a company answer quotes the headline of its latest cached earnings-release summary, labelled "From the latest earnings release, summarised by Claude" with the filing date; news stories show "Why it matters, Claude" where an angle is cached. `cachedCommentary()` reads the cache by the filer's CIK without reading SEC or calling Claude, and news angles are read straight from their cache.
- **The fallback** from A: "I can't answer that from the app's data yet.", three questions it can answer ranked by shared words (each one routes, which the test checks), and the Planned line for step 3.2.
- **Ask next** (three other answerers), **Asked this session** (kept in sessionStorage, never sent anywhere), **What you can ask** as a 3 by 3 grid with a Live or Mock chip per answerer, and the Planned line.

Routing recognises every company by name, by its name without the corporate suffix, and by a few common short names (TI, ADI, on semi, MPS); words like "analog" and "benchmark" never name a company on their own. The test checks every example routes to its answerer, every one of the 77 companies routes to itself, the main edge cases (Avnet's business against how Avnet is doing, Arrow alone against Arrow against us, news on a company or a topic, line cards for suppliers outside the app's companies), the sentences with missing figures, and that no visible text has a slash, middle dot or em-dash.

The old scripted answers and their invented figures are gone, as is the legacy `/copilot` banner entry. Data Hookups' usage register now lists the page's one marker (billings, bookings, backlog, on the Avnet's business answer).

Real answers, checked in the browser on 2026-10-21: "Microchip's revenue was $1.48B in Q2 2026, up 38.0% on a year ago, with a 63.2% gross margin. It reports next around Nov 5 (estimated)." with the cached Claude headline; "Avnet grew faster in Q2 2026, Arrow kept the higher margins."; the cycle "expanding, and faster than the quarter before", supply-chain revenue up 65.6% across 53 companies; supply "mixed"; 5 of 77 companies reported for Q3 2026; Newark (Farnell) lists Lattice; TTI, Future and Newark list Murata.

Corrections from the mockups: no version badge, engine name, Feedback or Export buttons or claims about audits; no "Q:" prefixes or middle dots; suggestions only for questions that route; figures and measures from the real scorecard.

Checks: tests and typecheck pass. Audit: the form is a labelled search with a name, autocomplete off and a placeholder ending in an ellipsis; one primary button; the figures table scrolls in a focusable region with a caption; external story links say they open the source; nothing on the page is below 4.5:1 contrast; no console errors. Keyboard: type a question and press Enter, Tab moves through every control with the 2px green focus ring. No horizontal scroll or truncation at 1440px or 1280px, with the Avnet against Arrow answer open. Baseline screenshots in `docs/design/baseline/copilot-1440.png` and `copilot-1280.png` (the page before a question), status 200, no console errors, no overflow.

## Step 3.2: Claude behind the answerers

- **Routing.** A question the rules route gets its rule answer, instantly and free, with "Ask Claude instead" (`?claude=1`) in the footer. A question they can't route goes to Claude. With no API key the page stays as designed above, with the Planned line naming the key.
- **Tools.** Claude's nine tools are the answerers themselves (`src/lib/ask/claude.ts`). A company is chosen by slug from the app's list, so Claude can't name a company the app doesn't cover. Each tool returns the answerer's sentence and figures.
- **Provenance.** Sources, page links and hookup markers are the union of the answerers that ran (`src/lib/ask/compose.ts`), never taken from Claude's text. Under Claude's two to four sentences, each answerer's figures appear as that answerer wrote them, captioned with its subject, period and sentence.
- **Honesty.** Claude is told to use only figures from tool results, to call Avnet's own figures mock, and to say what the app can't answer. When it called no tool, the answer shows "Not in the app's data" with the closest questions.
- **Model and cost.** Claude Haiku 5.5 at medium effort, at most six requests per answer. On the 20-question test (2026-10-23) Haiku passed 20 of 20 at 0.036 cents and about 4 seconds a question. Sonnet 5.5 passed 6 of 20 at 0.54 cents: no invented numbers, but lists, bold and answers of six to twelve sentences. Haiku has no server-side refusal fallback; a decline shows the "can't answer" reply. Answers are kept per question per day, in memory and under `.cache/ai`.
- **The test.** `npx tsx src/lib/ask/eval.ts [models…]` with the dev server running asks 20 questions (single, multi-part, unanswerable, one injection) through the dev-only `/api/ask-eval` route. It checks that the needed tools ran, that every number in the answer appears in the tool results, that declines happen, that mock figures are called mock, that "on a year ago" isn't read as year-old data, and the writing rules. Rerun it after changing the prompt, the tools or the model.
