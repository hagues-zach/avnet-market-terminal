# Pitch Deck Builder: design brief (step 2.21)

## Who and why

`/tools/deck`, under Tools, merging the older Export Center. One question: **what can I put in front of this customer, supplier or review from the app, and how much of it is real?**

- **Sellers and FAEs** building a customer or supplier pitch: a company at a glance, what its management said, who carries it, the technology, and Avnet's business with it. Loop 2 of the superapp plan ("gap to pitch") ends here: a supplier missing from the line card, its technology, a lead list, then a deck.
- **Sales leaders and executives** building an internal review: the cycle, the economy, Avnet against Arrow, Avnet's business, share by segment and a scenario.
- **Analysts** exporting one view: a single slide from the page they are on, with its source and period.

The questions it answers:

1. What can go in a deck? Every slide is a view that already exists in the app.
2. Which slides are live and which mock? Each slide is marked from the hookups register, with its source and period.
3. What will the deck look like? An outline in order and a preview of the selected slide in the Avnet template's layout.
4. What does a finished export need? The template, the export itself and the hookups still mock, said plainly.

Today there are two pages. `/tools/deck` is a shell drawn from `DECK_SPEC`: a setup form with a "Generate deck" button that does nothing, a four-item slide library and two brand rules. `/export` is the older Export Center on the old components, behind the legacy banner: a fake "Generate Deck" that spins and then shows a file name after 1.4 seconds, a "Avnet 34-layout" template stat, sections drawn from a market deck that no longer matches the app (Polymarket odds, a treemap, a fan chart that was removed in 2.19), slashes ("TAM / SAM / SOM", "Sections 7 / 10"), middle dots and an em-dash. All of that goes.

Build plan step 3.3 makes the export work ("export chosen views as Avnet-branded slides from the Avnet template"). This pass designs the merged page so 3.3 has a layout to fill: everything up to the export works now, on the app's own data, and the export is Planned.

## One route or two (for the review)

**Proposed:** one page at `/tools/deck`. `/export` redirects there (a permanent redirect in `next.config`, or a page that calls `redirect()`), and "Export Center" leaves the nav. Exporting one view is a deck with one slide (`/tools/deck?slide=cycle`), so the Export Center's job survives inside the builder. The nav label change is yours to make; the build waits for your answer at the review.

With the banner gone, the legacy `/export` entry leaves `src/lib/shells/legacy.ts` (LEGACY then holds only `/overview`) and its row leaves the usage register.

## What a slide is

A slide is **a view that already exists in the app**, with the page it comes from, the hookups it reads, and its period. Status is never typed on the page: a slide is Live when every hookup it reads is live in `src/lib/hookups.ts`, and Mock when any one is mock. When a hookup goes live, the slide turns Live with it.

| Slide | From | Hookups | Status today | Period |
|---|---|---|---|---|
| Company at a glance | Company Profiles | `sec` | Live | Latest quarter, "Q2 2026" |
| What management said | Company Profiles (cached Claude summary) | `sec` | Live, labelled as Claude's | Release date |
| Who carries it | Line Cards | `line-cards` | Live | Latest snapshot |
| Latest news | Market News | `news` | Live | Last 30 days |
| The technology | Learning Center primer | none (written content and its makers) | Live | n/a |
| Avnet against Arrow | Avnet vs Arrow | `sec` | Live | Latest quarter |
| Where the cycle is | Market Cycle | `sec` | Live | Latest quarter |
| The economic backdrop | Economic Signals | `macro` | Live | Latest release |
| Supply, tightening or easing | Supply Chain | `macro`, `sec` | Live | Latest month |
| Avnet's business with the account | Company Profile and QBR Prep | `billings`, `backlog`, `drms` | Mock | Fiscal quarter |
| Avnet's share of the segment | Market Share | `billings`, `wsts`, `gartner-forecast`, `code-map` | Mock | Fiscal year |
| Avnet's business | Performance Tracker | `billings`, `bookings`, `backlog` | Mock | Fiscal quarter |
| A scenario | Scenario Modeler | `billings`, `wsts`, `gartner-forecast`, `ipe-forecast`, `code-map` | Mock | To the horizon |
| Design pipeline | Design Pipeline | `drms`, `billings` | Mock | Fiscal quarter |
| Who buys it (the lead list, built in 2.22) | Lead Finder | `sec`, `news` | Live | Latest quarter |

Every deck also has a **cover** (title, audience, date) and a **sources** slide (every source and period in the deck, and which slides are mock), added by the rules, not chosen.

The slide's preview text reuses the Ask the Terminal answerers (`src/lib/ask/answer.ts`) where one exists: the company, Arrow, cycle, economy, supply, news, line card and Avnet's business answers already return a sentence, the figures, the sources and the page. So a slide's headline is the same sentence the app gives everywhere else, and 3.2 and 3.3 share one set of figures.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| What is this deck? | Lead in words: the audience, the company, how many slides and how many are live, mock and planned | The outline rules below | Live (counts from the register) |
| What goes in, in what order? | The outline: each slide with its status chip, source page and period, switched in or out and moved up or down | The rules | Works now (filtering and ordering over the app's views) |
| What will it look like? | A preview of the selected slide in the template's layout: headline sentence, figures, source line, slide number | The answerers and the shared mock model | Live or Mock per slide, marked on the slide; the hookup marker under a mock preview |
| What else could go in? | The slide library, grouped by Network, Knowledge and Avnet performance, each with its chip and a link to its page | The slide list | Live, Mock or Planned per slide |
| What does an export need? | A short list: the Avnet template without the slash mark, the export itself, mock slides marked in the file until their hookups are live | n/a | **Planned** (3.3), shown once as a chip |

Real export (PowerPoint and PDF from the Avnet template) is shown once as a Planned chip naming step 3.3. There is no "Generate", "Download" or "Export" button anywhere on the page.

## Starting a deck from elsewhere

The URL carries the starting point, so the links work now and a deck can be bookmarked or shared:

| From | Link | Starts as |
|---|---|---|
| Company Profile ("Build a pitch", new) | `/tools/deck?company=microchip&from=profile` | A supplier pitch for a supplier, a customer pitch for a customer, an internal review for a competitor |
| QBR Prep ("Export to deck", exists) | `/tools/deck?company=microchip&from=qbr` | The same, with Avnet's business with the account second |
| Learning Center primer ("Build a pitch", exists) | `/tools/deck?primer=microcontrollers&from=learn` | A customer pitch led by the technology, with its makers |
| Scenario Modeler (the Planned "send to deck" becomes a link) | `/tools/deck?from=scenario&horizon=2&view=base&share=0.25` | An internal review with that scenario |
| Any page, one view (the Export Center's job) | `/tools/deck?slide=cycle` | A one-slide deck |
| Nothing | `/tools/deck` | An internal review |

Changing the audience or company in the page rewrites the URL. Unknown companies, primers or slides are ignored with a note ("No company called x; showing an internal review."), never an error.

## The rules

In a pure module, `src/lib/deck/outline.ts`, with a tsx test (`npx tsx src/lib/deck/outline.test.ts`):

- **Slides.** The list above, each with id, title, the page it comes from (a route), its hookup ids and whether it needs a company or a primer.
- **Status.** Live, Mock or Planned, derived from `HOOKUPS` only. No status is written on a slide.
- **Starting points.** Parse `company`, `from`, `primer`, `slide`, `audience` and the scenario parameters into a start; the company's relationship (supplier, customer, competitor) picks the audience when none is given.
- **Outlines.** Supplier pitch: cover, company at a glance, what management said, who carries it, Avnet's share of the segment, Avnet against Arrow, design pipeline, the cycle, sources. Customer pitch: cover, company at a glance, what management said, the technology, latest news, Avnet's business with the account, supply, sources. Internal review: cover, the cycle, the economy, Avnet against Arrow, Avnet's business, share of the segment, a scenario, sources.
- **Lead.** "A supplier pitch for Microchip: nine slides, five on live data and three on mock, with a cover and sources." Counts follow every toggle.
- **Content.** Every slide's page routes; every hookup id exists; every starting link in the app parses to the start it promises; no visible text has a slash, a middle dot or an em-dash.

## Links into the rest of the app

- Every slide links to the page it comes from (Company Profile, Line Cards, Market News, the primer, Avnet vs Arrow, Market Cycle, Economic Signals, Supply Chain, Market Share, Performance Tracker, Scenario Modeler, Design Pipeline, QBR Prep).
- Mock slides carry the hookup marker, which links to Data Hookups.
- Company Profile gains "Build a pitch"; Scenario Modeler's Planned line becomes a working link; QBR Prep and the Learning Center links gain their `from`.

## What a real export will need (for 3.3)

From the Avnet brand files and the `avnet-branded-deck` skill:

- **The template.** The skill's `avnet-template.pptx` has 34 layouts (cover, callouts, two column, dividers, closing) and its masters still draw the green slash mark, which the brand kit dropped. 3.3 needs a template with the slash removed from the masters, or a fresh one from the brand team.
- **Type.** Arial Narrow for headlines and Arial for body in PowerPoint (the Office stand-ins for Oswald and Aperçu Avnet); headlines in sentence case, six to eight words, one line per bullet.
- **Charts.** Avnet Green for Avnet only, Arrow Dark Blue, the rest in the chart steps; direct labels.
- **Layout variety.** No more than two slides in a row on the same layout; cover, content, sources, closing.
- **Honesty.** Mock slides carry "Mock data" in the slide footer until their hookups are live; the sources slide lists every source and period.
- **Where it runs.** A server route that fills the template (python-pptx or a Node equivalent) and returns a file; PDF from the same file.

## Layout rules

- Lead with the deck in words. The lead rests on counts, not mock figures, so it has no Mock chip; mock slides are marked one by one.
- One page, one primary visual: the slide preview. No cards inside cards.
- Status chips are neutral words (Live, Mock, Planned), never coloured fills. Mock previews have the hookup marker directly under them.
- The preview is a white 16:9 frame in the app's type (Oswald headline in sentence case, Inter body), the Avnet logo top right, no slash mark, the source line and slide number at the foot.
- Toggles and reordering work (buttons with labels, Up and Down, keyboard). No primary button: nothing is submitted.
- Avnet Green only for Avnet's series in a preview chart; Arrow Dark Blue; the rest Orange, Light Blue or grey. Bars trackless with end labels.
- No em-dashes, no slashes ("TAM, SAM and SOM"), "n/a" for missing values, dates as "Nov 5".

## Taste review

Reading this as: an internal deck-assembly tool for Avnet sellers, leaders and analysts, over the app's own views, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2 (toggles update the outline and lead in place; nothing animates), density 6 (an outline is scanned, a preview is read). Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A fake generate button.** The Export Center today. Answer: one Planned chip naming 3.3; no Generate, Download or Export button.
- **A deck of invented slides.** The old section list (Polymarket, treemaps, a removed fan chart). Answer: only views the app has, each linking to its page.
- **Mock numbers in a customer's hands.** Answer: every slide marked Live or Mock from the register, the hookup marker under mock previews, and a sources slide that names what is mock.
- **Div-built fake slides.** The skill's "fake screenshot" tell. Answer: the preview renders the real sentence and figures from the answerers, not placeholder rectangles.
- **Two pages doing one job.** Answer: one route; a single-view export is a one-slide deck.
- **The slash mark sneaking back through the template.** Answer: called out for 3.3; the preview never draws it.

## Mockups

- `pitch-deck-builder-a-outline-preview.png`: the lead and "Started from QBR Prep for Microchip.", one control row (audience, company, Reset), then the outline (nine numbered rows with a checkbox, Up and Down, the source page and period, and a Live or Mock chip; row 2 selected) beside a large 16:9 preview of the selected slide (headline, the sentence, four figures, source and slide number, the logo top right), "What a finished export needs" with the Planned chip, then the slide library in three columns (Network, Knowledge, Avnet performance).
- `pitch-deck-builder-b-storyboard.png`: the lead, a control bar card, then "The deck, in order" as a grid of nine 16:9 thumbnails, four to a row, each with its headline and one figure, a chip and Move left, Move right and Remove; the selected mock slide has the hookup marker under the grid; then the slide library as a table beside the Export card (both run past the screenshot).

Figures in the prompts are real, read from the app on Oct 21: Microchip's Q2 2026 revenue ($1.48B, up 38.0%, 63.2% gross and 22.7% operating margin, next report around Nov 5), Avnet against Arrow (+47.7% and +31.8%, "Avnet grew faster, Arrow kept the higher margins"), the cycle (expanding and faster, supply-chain revenue up 65.6% across 53 companies), Future Electronics and Newark listing Microchip. Avnet's 4.4% share of an $85B microcontroller and processor market (down 0.2 pts) is the shared mock model. Illustrative only: "Demand improving, bookings strong" (a paraphrase of the cached Claude summary), the "Sep" periods in B's library and the slide counts in the lead.

Drift to correct in the build:

- **Invented chrome.** Both rebuilt the sidebar: A adds Preferences, Documentation and System Status; B replaces the nav with "Workspace", "Supplier Directory", "Settings" and a Feedback link. The sidebar comes from `nav.ts`.
- **Invented labels.** A puts an eyebrow "COMPANY PROFILE : MICROCHIP" (with a colon) inside the slide. B puts "SLIDE 1" to "SLIDE 9" eyebrows on every thumbnail, an "ACTIVE SELECTION" badge on the selected one, and invents "Cover page", "Appendix", "Appendix and legal documentation" and "Available views to append".
- **A placeholder beside a real name.** B's design pipeline slide reads "Design registrations with Supplier A" in a Microchip deck (my prompt's fault). Mock account slides about a named live company use its name, as Company Profile and QBR Prep do, with the Mock chip and marker; placeholders stay for mock lists of other suppliers or customers.
- **A** offers "Add" beside slides already in the deck; the build says "In the deck". Its Mock chips have an amber, not yellow, dashed border. Its selected row is right, but a mock preview's hookup marker isn't shown (the selected slide is live).
- **B** wraps "Move left" and "Move right" onto two lines under every thumbnail and crowds the source caption; at 1280px four thumbnails a row would be narrower still. Its Avnet and Arrow bars are trackless with end labels, which is right.
- Neither added Generate, Download or Share buttons, version labels, user names, status dots or coloured chips, and neither drew the slash mark.

**Recommendation:** A, with B's hookup marker placed directly under a mock preview and B's trackless Avnet and Arrow bars when that slide is previewed. A has one strong primary visual (the preview, at a size where the headline and figures read as a slide), an outline that scans as a list and survives 1280px, and keeps reordering to small Up and Down buttons. B's storyboard shows the whole deck at once but turns every slide into a small card with three wrapped buttons, which is the "wall of equal cards" DESIGN.md warns against.

## Decision

Built variant A (chosen 2026-10-21), with the hookup marker directly under a mock slide's preview and B's trackless Avnet and Arrow bars on the Avnet against Arrow slide. One route: `/tools/deck`. `/export` is a permanent redirect there, "Export Center" has left the nav (your call at the review), its legacy banner entry is gone (LEGACY now holds only `/overview`) and so is its row in the usage register. The old Export Center page, its fake generate, the "Avnet 34-layout" stat and its section list are removed.

The rules are in `src/lib/deck/outline.ts` (pure, tested in `outline.test.ts`): the slide list with each slide's page and sources, status from `HOOKUPS` only, the starting points, the three outlines, adding and moving slides, the lead, the sources slide and the share and company headlines. The previews are in `preview.ts` (server-only): the company, management, line card, news, Arrow, cycle, economy, supply and Avnet's business slides reuse the Ask the Terminal answerers, so a slide's sentence is the one the app gives everywhere; the account, share, scenario and pipeline slides read the shared mock model of Avnet; the technology slide reads the primer. Nothing calls Claude: the management slide quotes the cached earnings-release summary, labelled as Claude's, and says so when none is cached.

- **The lead**: "A supplier pitch for Microchip in nine slides: five on live data and two on mock, with a cover and sources." It follows every switch, move and addition, with "Started from QBR Prep for Microchip." under it and a plain note for anything in the URL the app doesn't know.
- **Audience and company** rewrite the URL. A new company starts afresh (its relationship picks the audience); a new audience keeps where the deck started. Reset puts the outline back.
- **The outline**: each slide with a checkbox to leave it out, Up and Down, its page and a Live or Mock chip; selecting a row previews it.
- **The preview**: a 16:9 slide with the Avnet logo top right (no slash mark), the headline in Oswald, the sentence, up to five figures or the two bars, and the source, period and slide number at its foot ("Mock data" there on mock slides). Under it, "Opens on" the page it came from and the chip; on a mock slide, the hookup marker.
- **What a finished export needs**, then one Planned line for step 3.3.
- **The slide library** in three columns (Network, Knowledge, Avnet performance): every slide with its chip and Add, "In the deck", or why it can't be added ("Needs a company", "Needs a company or a technology", "Arrives with Lead Finder (step 2.22)").

Starting points that work now: Company Profile's new "Build a pitch" (`?company=…&from=profile`), QBR Prep's "Export to deck" (now with `from=qbr`), the primer's "Build a pitch" (`?primer=…&from=learn`, opening on the technology slide), Scenario Modeler's "Send to Pitch Deck Builder" (horizon, market view and share change, opening on the scenario slide; offered when every segment has the same share change and forecast growth), and one view on its own (`?slide=cycle`).

The usage register lists the deck by `outline.ts` and `builder.tsx`, with every source a slide reads: the register test requires the ids in the listed files to match both ways, and `outline.ts` holds the live ids (`sec`, `line-cards`, `news`, `macro`) beside the mock ones. Other pages list only their markers' mock ids.

Corrections from the mockups: the sidebar from `nav.ts`, no eyebrow inside the slide, "In the deck" instead of a second Add, the company's own name on its mock account slide (never "Supplier A" beside Microchip), and the real slide counts in the lead (the prompt's "five live and three mock" didn't add up to the nine).

Checks: tests and typecheck pass. Audit: every control has a label or `aria-label` (the checkboxes say "Include …", the arrows "Move … up"), the company select has a name and autocomplete off, the lead is a polite live region, the audience switch is pressed buttons in a labelled group, the preview's figures table has a caption, the bars carry an image label, and the loading text ends in an ellipsis. Title Case headings are left in sentence case, per DESIGN.md. The outline's state isn't in the URL; saving a deck needs the database (step 4.1). Keyboard: Tab reaches every control in order with the 2px green focus ring, Enter on Move down moves the slide and keeps focus on the button. Contrast: nothing on the page below 4.5:1 (the hookup marker's translucent tint skipped). At 1280px no horizontal scroll and nothing truncated on the page; the slide grows past 16:9 rather than clip when a sentence runs long (the cycle slide, 532 by 319). Every starting link was opened in the browser; `/export` lands on `/tools/deck`. Baseline screenshots in `docs/design/baseline/tools-deck-1440.png` and `tools-deck-1280.png` (the internal review), status 200, no console errors, no overflow; the `/export` baselines are removed and `/export` leaves the baseline script's route list.
