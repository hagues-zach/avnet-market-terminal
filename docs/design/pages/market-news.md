# Market News: design brief (step 2.8)

## Who and why

`/news`, the first page under Knowledge. Three groups open it, most of them daily:

- **Sellers** want what to bring up with a customer this week: a price rise, a shortage, an end market heating up, a new rule on exports.
- **FAEs** want what changes for the parts they design in: a new product family, a supplier's capacity, a technology shift (SiC, HBM, RISC-V).
- **Supplier managers and leaders** want what their suppliers and competitors did: results, agreements, plant news, filings, and what the trade rules mean for the channel.

All three are short on time. The page has to say, in under a minute, which few stories matter to Avnet today and why. The full feed comes after that, for when they need to dig. Today the page is a filter panel above one long list, and the "why it matters" lines are hidden inside it.

The page starts the plan's "news to action" loop: a story about a supplier links to that supplier's Company Profile, and from the story or the profile to a QBR brief that picks up the story.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| What matters to Avnet today? | Top stories: the high-relevance stories from the last 48 hours, each with its "why it matters" line | `getLiveNews()`, `getNewsAngles()` (Claude) | Live; with Claude off, the most recent news instead, labelled so |
| How much is going on? | Summary line: stories in the last 24 hours, high-relevance count, new filings, new regulatory notices, sources responding | Derived from the feed | Live |
| What is the news about this week? | Topics: stories by segment and end market over the last 7 days | Derived from the rule-based tags | Live |
| Where does that touch Avnet's business? | Next to each topic, Avnet's trailing-12-month billings in that segment or vertical | `SEGMENT_BILLINGS`, `VERTICALS` in `src/lib/shells/mock-avnet.ts` | **Mock**, hookup marker for billings |
| What about the suppliers I follow? | Watchlist: starred suppliers, their story count, quiet ones still shown | Feed tags plus `localStorage` | Live (per browser; moves to the user's profile with accounts, 4.2) |
| Everything else | The feed: lanes (All, News, Filings, Regulatory), relevance, segment, end market, region, search | Feed | Live |
| What do I do with it? | Per story: open the source, open the named company's profile, "Add to QBR brief" | `COMPANIES` slugs, `/tools/qbr?company=…&focus=…` | Live links |

Sources are trade-press RSS (EE Times, EPS News, TrendForce, DigiTimes and seven more), the GDELT open news index, SEC filings and Federal Register notices. Stories stay 14 days; filings and notices 45. Claude reads only the headline and snippet, and about one story in ten comes back as high relevance, so "Top stories" is short by design.

Planned, not built here: stories ranked for the signed-in user's role, region and accounts (needs accounts, 4.2), and Gartner analyst articles beside the open feed (`gartner-articles` hookup, planned). Neither is shown as a mock section; the summary caption names them once.

## Links into the rest of the app

- **Company Profile.** A supplier, competitor or customer tag that matches a company in `COMPANIES` is a link to `/network/[slug]`. Tags without a profile stay plain text. The profile's "In the news" card already links back here.
- **QBR Prep.** "Add to QBR brief" on a story with one profiled company opens `/tools/qbr?company=<slug>&focus=<headline, cut to 200 characters>`. With several companies it opens a small menu to pick one. With none, the action is not shown. The brief's "In the news" section already reads this feed.
- **Line Cards.** Distribution agreement stories (Avnet, Arrow, DigiKey, Mouser named with a supplier) link to Line Cards' franchise moves.
- **Start Here** shows the top three of these stories; it should use the same "top stories" rule so the two pages agree.

## Layout rules

- Lead with the answer: top stories first, with the angle as the main text and the headline as the link. Then the evidence (topics, exposure), then the full feed.
- Relevance is a word ("High", "Useful", "Low"), never a coloured dot alone. No green for "high": Avnet Green is only for Avnet.
- Stories that name Avnet get the Avnet rule; Arrow stories the Dark Blue rule. Everything else is neutral.
- Filings and regulatory notices are a lane and a neutral chip, not a colour.
- Topic bars are one colour (grey; the market is not Avnet), with no background track. No week-on-week change: see the decision below.
- Avnet's mock billings beside the topics sit inside the mock section with the dashed marker. They are never mixed into a live number.
- Filters live in one compact bar above the feed, not a tall card. Facet chips with long lists fold into a "More" menu after the top six.
- The method note is one caption: sources, refresh, that tags are rule-based and that Claude's lines can be wrong.
- Times are relative ("3h ago") with the exact time in `<time>`; the source name is a caption, the time sits on the right.
- One primary action at most on the page. There is none at page level; "Add to QBR brief" is a secondary action per story.

## Taste review

Reading this as: a daily briefing-then-feed page for Avnet sellers, FAEs and leaders, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 7. Light only, Inter and Lucide stay, as DESIGN.md records (the skill's dark-mode and font defaults don't apply to this internal tool).

Risks found and how the brief answers them:

- **The endless `divide-y` list.** Up to 200 equal rows is the current page. Answer: top stories lead and are capped; the feed groups by day ("Today", "Yesterday", "Earlier this week") and shows 25 at a time with "Show more".
- **Three equal top-story cards.** The obvious layout for "top stories" and a known template tell. Answer: one lead story with its angle in larger type, the next two to four as a tight list beside or under it. No card per story.
- **Chip walls.** Today four rows of facet chips plus a watchlist row push the stories below the fold. Answer: one filter bar (search, lane tabs, relevance, a "Filters" menu for segment, end market and region), active filters shown as removable chips.
- **Eyebrow labels everywhere.** The current feed puts small uppercase labels on every facet row and every "Why it matters". Answer: section titles in sentence case; the angle is set apart by position and a rule, not a label; relevance is one word in a neutral chip.
- **Tag soup on each story.** Up to a dozen bordered tags per row. Answer: show at most the named companies (as links) and one segment; the rest is in the filter, not on the row.
- **Status-dot decoration.** The "Live" dot and coloured relevance would both be dots. Answer: a "Live" `DataChip` once, relevance in words.
- **Bars with tracks and green for "hot".** Answer: grey trackless topic bars, no colour for how busy a topic is.
- **Mock creeping into a live page.** The only mock figure is Avnet's billings per topic. Answer: it lives in its own section with the dashed marker, and is never blended with live counts.
- **Repeated actions.** "Add to QBR brief" on 200 rows is noise. Answer: it shows on the top stories and on the focused or hovered feed row (and always for keyboard focus), never as a primary button.

## Mockups

- `market-news-a-briefing.png`: a summary line, "Top stories for Avnet" (a lead story with its angle in large type, four more as a hairline list) beside "Topics this week" with grey bars and week-on-week change, Avnet's mock billings per topic under a hookup marker, then "All news" with one filter bar, active-filter chips and the feed by day.
- `market-news-b-reading-pane.png`: a filter bar with a "Top for Avnet" tab, then a story list on the left and the selected story on the right (angle, companies with "Open profile", "Add to QBR brief", "Where it touches Avnet" for the story's segment, related stories), with topics this week across the bottom.

Stitch made up every headline, angle and figure in both. Drift to correct in the build: A uses black bars and blue headline links, and shows "Open profile" and "Add to QBR brief" only on the lead story. B squeezes the "Top for Avnet" tab onto four lines, puts a grey box behind "Why it matters", adds eyebrow labels ("Live stream · rule-ranked", "Story-ID"), and draws a pill chip. Both invent sidebar items and a top bar; the build keeps the app's shell.

## Decision

Built variant A on the live feed (chosen 2026-10-21). The rules live in `src/lib/news/briefing.ts`, with tests in `briefing.test.ts`.

- **Summary line** under the title: stories, high relevance, new filings and regulatory notices in the last 24 hours. The high count is left out while Claude's ratings load or when Claude is off. The title carries one `DataChip` with the sources responding.
- **Top stories for Avnet** (8 columns): up to five stories Claude rated high in the last 48 hours, newest first, filings excluded. The lead story has its angle in large type; the rest are a hairline list. The headline sits under the angle as the source link. Companies with a profile are links to Company Profile, and "Add to QBR brief" opens QBR Prep with the company and the headline as the focus (a small menu when the story names several). When nothing is rated high, or Claude is off, the panel shows the latest news and says so.
- **Topics this week** (4 columns): grey trackless bars for the top six segments or end markets (a Segment | End market switch) over the last 7 days. Selecting a topic filters the feed and scrolls to it. Under them, "Avnet billings in these topics" lists trailing 12 month billings and growth from the shared mock model (`SEGMENT_BILLINGS`, `VERTICALS`), behind the hookup marker (billings with the code map or the customer master). Topics Avnet does not bill under say "Not a billing segment".
- **All news**: one filter bar (search, All | News | Filings | Regulatory with counts, a relevance select, a Filters menu for segment, end market, region and the supplier watchlist, and a Watchlist toggle), removable filter chips, then the feed grouped by Today, Yesterday, Earlier this week and Older, 25 at a time. Each row has the headline, the outlet and time on the right, one line of snippet, the angle behind a thin black rule, the relevance word, one segment and the profiled companies. "Add to QBR brief" shows on hover and keyboard focus, and always on touch screens. Avnet stories carry the green left rule and Arrow stories the Dark Blue rule.
- The method note is one caption, and it names what is planned (stories ranked for the user's role and accounts, Gartner articles).

Changes from the brief and the mockup:

- **No week-on-week change on topics.** The RSS feeds only hold a few days of items (the deepest reaches 8 days back, DigiTimes only today), so the week before was nearly empty and every topic looked like it had shot up. A real comparison needs stored history (the database, step 4.1).
- Mockup drift fixed: grey bars instead of black, ink headline links instead of blue, the app's own sidebar and top bar.
- When a Claude call fails, the caption says so in one plain sentence, with the error in a tooltip, instead of printing the API response.
- Start Here's "What changed this week" still ranks with its own role-based rule (`src/lib/start/feed.ts`). Moving it onto `topStories` is left for its own change.

Checks: web-design-guidelines audit fixes applied (search input name and autocomplete, a real disabled state on the relevance select, a focus ring on `<summary>` menus in `globals.css`, overscroll containment on the Filters menu). Keyboard: every control is reachable by Tab, the menus open with Enter and close with Escape back to their button. Text contrast is 4.56:1 or better and the bars are 3.15:1. Long table names in the shared hookup marker now wrap. Baseline screenshots in `docs/design/baseline/news-1440.png` and `news-1280.png`, with no console errors or overflow.
