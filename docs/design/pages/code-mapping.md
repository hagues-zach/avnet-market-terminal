# Code Mapping: design brief (step 2.16)

## Who and why

`/tools/mapping`, under Tools. One question: **how much of Avnet's business maps to market categories, how far can the mapping be trusted, and what needs a decision next?**

The code map joins Avnet's product codes (technology codes in the Americas and EMEA, the PCC hierarchy in APAC and Farnell) to the external categories that market sizes come in (WSTS product categories, Gartner device types, the IP&E forecast). Every share-of-market figure in the app divides billings by a market through this map, so a wrong mapping is a wrong share.

- **Market analysts** own the map. They want coverage, where it is weak, and a queue of suggested mappings to send for validation.
- **Product managers** validate the mappings for their lines. They want the mappings waiting on them, what each one covers in billings, and enough detail (the external definition, the Avnet codes, example parts) to accept or correct it.
- **Sales leaders and everyone reading Market Share** want to know how much to trust a share figure: what share of billings is mapped and at what confidence.

Today the page is a shell: four KPIs, a seven-row table with illustrative codes (and an em-dash for unmapped) and a list of known challenges, all mock. Market Share links here as "How billings map to segments" and already shows a confidence rating per segment from the shared model.

PRD section 6. Phase 3.5 makes the page work (AI suggestions with accept, edit and reject, and a change history). This pass designs it so 3.5 has a layout to fill; actions that don't work yet are shown as planned, not as working buttons.

## Questions and data

Everything Avnet-specific is mock until the code map and the material master are hooked up. The external category names are public taxonomies and are shown as they are.

| Question | Section | Data | Status |
|---|---|---|---|
| How much of the business maps, and how well? | Lead in words, then KPIs: share of billings mapped, categories validated, awaiting review, unmapped | `MAPPED_SHARE` and segment confidence in `mock-avnet.ts`; category counts in `mock-mapping.ts` | **Mock**, marker under the lead |
| Where is the map weak? | Coverage by segment: billings, share mapped, confidence, categories by status; links to the segment on Market Share | `SEGMENT_BILLINGS` (shared model), `mock-mapping.ts` | **Mock** |
| What needs a decision? | The review queue: suggested and in-review mappings, ordered by billings at stake, with confidence and who it waits on | `mock-mapping.ts` | **Mock** |
| What is this mapping? | Detail of one mapping: the external definition, the suggested Avnet codes and PCC levels, example parts, why it was suggested, its history; accept, edit and reject shown as planned for step 3.5 | `mock-mapping.ts`; Claude's reasoning later | **Mock**; actions **Planned** |
| What changed? | Change history: date, mapping, change, by role (names withheld) | `mock-mapping.ts` | **Mock** |
| Why is this hard? | Known challenges as one short note (granularity, many-to-many, regional hierarchies, drift) | Text | n/a |

The category counts, segment confidence and mapped share come from one mock model so this page, Market Share and TAM agree: the shared model's segment confidence ("High", "Medium", "Low") is what the segment table shows, and mapped billings add back to `MAPPED_SHARE` of total billings. A test checks it.

## The rules

In a pure module, `src/lib/mapping/read.ts`, with a tsx test:

- **Lead.** "85% of Avnet's billings map to a market category, and 61% of categories are validated. 52 suggested mappings wait for review, covering $X of billings; the largest is in <segment>."
- **Review order.** Billings at stake first, then lower confidence first: a low-confidence mapping on a large line matters most.
- **Weakest segment.** The segment with the lowest share of billings mapped at high confidence is named in the coverage subtitle.

## Links into the rest of the app

- Market Share: each segment links to its row there; Market Share's "How billings map to segments" already links here.
- TAM / SAM / SOM: SAM and SOM use the same map.
- Data Hookups: the code map and material master entries.

## Layout rules

- Lead with the answer in words, with a Mock chip and the hookup marker directly under it.
- Status is a word chip, neutral ink ("Validated", "Suggested", "In review", "Unmapped"). Confidence is a word, not a colour. No red for "Unmapped": it needs an owner, it isn't an error.
- Coverage bars are trackless, one colour; billings mapped is Avnet's own, so Avnet Green.
- Actions that don't work yet (accept, edit, reject, assign) are not shown as primary buttons. They appear once, in the detail, as a "Planned" chip with the step that builds them.
- No em-dashes: unmapped codes read "Not mapped". Hierarchies use "›" or words, never "/" (the slash mark rule) or a middle dot.
- Supplier and customer names withheld; validators are roles ("Product manager, Analog"), not people.

## Taste review

Reading this as: an internal data-stewardship workbench for Avnet analysts and product managers, mostly mock until the code map is hooked up, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 8 (a workbench is denser than a briefing). Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A spreadsheet with no answer.** Answer: the lead says how much is mapped and what waits, then coverage by segment, then the queue.
- **Fake working buttons.** Accept and reject don't work until 3.5. Answer: one "Planned" chip in the detail, no primary buttons.
- **Traffic-light confidence.** Answer: words in ink; confidence is a fact about the mapping, not a status alarm.
- **Slashes in hierarchies.** The shell writes "SEMI / ANALOG / GP". Answer: "Semiconductors › Analog › General purpose".
- **A modal for the detail.** Answer: a side pane beside the queue on wide screens, below it on narrow ones.

## Mockups

- `code-mapping-a-workbench.png`: the lead with its Mock chip and marker, four KPIs, a full-width "Coverage by segment" table (billings, share mapped with a trackless green bar, confidence, counts by status), then the review queue (7 columns) beside a detail pane for the selected mapping (5 columns), then recent changes and a note on why mapping is hard.
- `code-mapping-b-queue-first.png`: the same lead, a strip of ten segment cells that filters the queue, a filter bar (status, confidence, waits on, search), then one full-width "Mappings" table with a status switch (Needs review, Validated, Not mapped) whose rows open inline into definition, why it was suggested and history, as Design Pipeline's rows do. Recent changes and the note follow.

Stitch made up every figure and reason in both. Drift to correct in the build:

- **Neither matches the shared model.** A gives Memory $2.9B and Connectors "Low"; the model has Memory at about $2.7B of mapped billings and Connectors "High", Logic "Medium", Optoelectronics "Low". The build reads `SEGMENT_BILLINGS` and its confidence.
- **Invented sources and reasons**: "point-of-sale records", "98.2% of POS line items", "Harmonized against WSTS Autumn 2026", "Gartner Category 21.04", "mapping rules v3.4", "classification engine batch #882". The app has none of these; the "why it was suggested" text is mock and labelled so.
- **A** wraps the external category over three lines in a monospace font in its narrow queue, and labels the detail "Active selection" with a green chip.
- **B** colours status chips (yellow "Suggested", blue "In review") and the selected segment's confidence in green, nests a bordered box inside the expanded row, and sets card titles in all caps.
- Both add "Refine filters" and "Export" buttons, a version badge and their own sidebars.

## Decision

Built variant B with variant A's four KPI tiles at the top (chosen 2026-10-21). The rules live in `src/lib/mapping/read.ts`, with tests in `read.test.ts`.

- **The lead** in words with a Mock chip and the hookup marker (code map, material master) directly under it: "85% of Avnet's billings map to a market category, and 62% of categories are validated. 37 mappings wait for review, covering $5.2B of billings; the most is in Memory."
- **Four KPI tiles** from A: billings mapped, validated categories (with the change this month), awaiting review (with billings at stake) and not mapped.
- **Coverage by segment** from B: ten cells, each the share of the segment's billings on validated mappings with a trackless Avnet Green bar and the shared model's confidence word. Selecting a cell filters the mappings; selecting it again clears it.
- **Filter bar**: confidence, waits on, a search over category, code and PCC level, and Reset.
- **Mappings**: one table with a Needs review, Validated and Not mapped switch whose counts follow the filters. The most billings at stake come first, then the lowest confidence. Each row opens in place into three columns divided by hairlines: the external definition, Avnet codes and example part families; why it was suggested (Mock) and who it waits on; the history, with "Accept, edit and reject arrive in step 3.5" as a Planned chip. Status chips are neutral words.
- **Recent changes** (by role) beside **Why mapping is hard**, then one method caption.

The code map joins the shared model of Avnet: `src/lib/shells/mock-mapping.ts` now holds 162 categories from the public WSTS, Gartner and IP&E forecast taxonomies, with synthetic codes, billings, reasons and history. Each segment's mapped categories split that segment's billings in `SEGMENT_BILLINGS`, so they add back to the 85% of billings Market Share and TAM use, and segments rated High have more of their billings validated than Medium, and Medium than Low. The test checks both, that unmapped categories carry no codes or billings, and that no visible text has a slash or an em-dash. The old shell rows are derived from the same model.

Corrections from the mockups: figures come from the shared model (A had Memory at $2.9B and Connectors "Low"); no invented sources (point-of-sale records, "mapping rules v3.4"); no coloured status chips or green confidence; no box nested in the expanded row. The code map's name in the hookups register lost its slash ("Gartner and WSTS to Avnet code map"), which changes its marker on every page.

Checks: tests and typecheck pass. Audit: the search has a label, a name and autocomplete off, with a placeholder ending in an ellipsis; both selects are labelled; segment cells and the status switch are pressed buttons; rows toggle with `aria-expanded`; the table scrolls in a focusable region; an empty result offers a reset. Filters are not kept in the URL, as on the other pages. The segment filter, counts, search, empty state and reset were tried in the browser. Contrast uses the same tokens as the other passes. Baseline screenshots in `docs/design/baseline/tools-mapping-1440.png` and `tools-mapping-1280.png`, status 200, no console errors, no overflow.
