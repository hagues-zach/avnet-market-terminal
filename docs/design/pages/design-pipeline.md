# Design Pipeline: design brief (step 2.13)

## Who and why

`/design-pipeline`, under Avnet performance. Design registrations are Avnet's leading indicator: a field engineer gets a supplier's part designed into a customer's product, registers it with the supplier (DRMS), and the billings follow a year or two later when the product ships. The page answers: **how much future billing is in the pipeline, is it growing, and where will it come from?**

- **Product and supplier managers** want the pipeline by supplier and segment for line reviews: is a supplier's pipeline building or thinning, and where is it heavy compared with today's billings?
- **FAEs and their managers** want registrations by stage and age: what was approved but hasn't reached production, and what has stalled.
- **Sales leaders** want the total, its trend and its conversion: how much of the pipeline becomes billings, and how fast.

Today the page is a shell: a four-step funnel, bars by segment and a four-row table of recent approvals, all mock, with nothing saying what the numbers mean or how they connect to billings.

PRD module 8. Performance Tracker shows the billings this pipeline turns into (and already shows the share of billings on design-approved parts, 38%, from the shared mock model). QBR Prep's supplier brief should take the supplier's pipeline from here.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| How big is the pipeline, and is it growing? | Lead sentence and KPIs: approved pipeline value not yet billing, new registrations this quarter and on a year ago, approval rate, share of billings on design-approved parts | DRMS, billings | **Mock** (shared model) |
| How much converts, and how fast? | Funnel: submitted, approved, in production, billing, with counts, value and conversion between stages; median months from approval to first billing | DRMS | **Mock** |
| Does the pipeline lead billings? | Approved value by quarter against billings by quarter, so the lead is visible | DRMS, billings | **Mock** |
| Where will growth come from? | By segment: pipeline value against today's billings; segments where the pipeline is heavy relative to billings are where growth is coming | DRMS, material master, billings | **Mock** |
| Is customer demand behind it? | By end market: pipeline value (mock) beside live revenue growth of the customer groups that buy in that market (hyperscalers, devices and systems, automotive, industrial OEMs) | DRMS (mock), `getCycle()` customer groups | Mock **and Live**, marked per column |
| What has stalled? | Approved registrations older than 12 months not yet in production, by supplier and segment (names withheld) | DRMS | **Mock** |
| What was just won? | Recently approved registrations: supplier, segment, estimated annual value, date | DRMS, customer master | **Mock** |

Supplier and customer names stay withheld in mock ("Supplier A"). The pipeline is built into the shared mock model of Avnet (`src/lib/shells/mock-avnet.ts`) so its segment and supplier splits agree with billings on every other page.

## Links into the rest of the app

- Segments link to Market Share; end markets to Customers & End Markets; the conversion section to Performance Tracker.
- The customer-group growth links to Market Cycle.
- Each supplier row will feed QBR Prep's supplier brief once DRMS is live.

## Layout rules

- The whole page is mock except the customer demand column; one hookup marker sits under the lead, and the live column carries a "Live" chip in its header.
- The lead sentence is about the pipeline (mock), so it carries a mock chip; it is never mistaken for a live fact.
- Avnet's own series (pipeline, billings) are green; Avnet's second series (billings when shown beside the pipeline) is Dark Green or dashed, per DESIGN.md. Live customer growth is ink, not green.
- The funnel is horizontal bars with conversion percentages between steps, not a cone.
- Stalled registrations are a list with an age column, not a red "at risk" badge.
- Charts on the shared `CHART` tokens, direct labels.
- One caption for the method. No primary button.

## Taste review

Reading this as: an operational pipeline page for Avnet product managers, FAEs and sales leaders, almost entirely on mock internal data until DRMS is hooked up, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 7. Light only.

Risks found and how the brief answers them:

- **The sales-funnel cone.** A tapering trapezoid looks like a CRM template and hides the numbers. Answer: horizontal bars with counts, value and conversion between stages.
- **Mock data dressed as fact.** A confident lead sentence on synthetic numbers misleads. Answer: a mock chip on the lead and the marker directly under it.
- **Red "at risk" badges.** Answer: stalled registrations by age, in ink, sorted oldest first.
- **Dual-axis "pipeline vs billings".** Two scales on one chart. Answer: one axis in dollars, pipeline and billings on the same scale, or two small charts.
- **Too many tiles.** Answer: four KPIs, then the funnel.

## Mockups

- `design-pipeline-a-funnel.png`: the lead with its mock chip and the marker under it, four KPIs, the funnel (four horizontal bars with conversion between them) beside "Pipeline leads billings", then by segment beside by end market (mock pipeline beside live customer growth), then stalled beside recently approved.
- `design-pipeline-b-by-supplier.png`: the same lead and a KPI strip, a "By supplier / By segment / By end market" switch, one table of suppliers by stage with an expandable per-supplier funnel, then the lead chart beside customer demand, then stalled and recently approved in one card.

Stitch made up every figure in both. Drift to correct in the build, two of them serious: **B puts real supplier names beside the placeholders ("Supplier A (Analog Devices)")**, which the mock rules forbid, and **A labels "billings on design-approved parts" as Live** (it is mock, from the shared model). Also: B colours stall ages red and approval dates green, adds "field review required" in red, nests cards inside the expanded row, and adds a correlation figure (r = 0.84) and sources (FactSet, POS) the app doesn't have; A adds "Lifecycle model v2.1" and "Source configuration pending" labels. Both invent the sidebar and top bar.

## Decision

Built variant A's top half with variant B's table under it (chosen 2026-10-21): "I like A as shown in the screenshot. Then please add the granularity and drill down visuals in B below that … give the table a toggle to switch between suppliers, segment, and end market."

- **The lead** with a "Mock" chip and the hookup marker directly under it, then four KPIs (approved pipeline, new registrations this quarter, approval rate, billings on design-approved parts), each with its mock chip. A marked the last one Live; it is mock, from the shared model.
- **From submission to billing**: four Avnet Green bars, trackless, with counts, value and the conversion between each stage; the median months to first billing in the footer.
- **Pipeline leads billings**: the approved pipeline (Avnet Green) and billings on design-approved parts (Dark Green, dashed), both indexed to 100 in the first quarter. On one dollar axis the two lines sat on top of each other; indexed, the pipeline is seen turning up before billings do. Dollar values are in the tooltip.
- **Pipeline in detail** (from B): one table with a "By supplier / By segment / By end market" switch. Each row has registrations at each stage, approved pipeline, its change on a year ago, "pipeline vs billings" (the group's share of the pipeline against its share of billings, so above 1× means more future than present) and stalled registrations. Every row opens into its own four-stage funnel, laid out as four columns divided by hairlines (not B's cards inside a card). The end-market view adds live customer growth from Market Cycle (hyperscalers for data centre, devices and systems for communications and consumer, automotive, industrial OEMs), marked "Live" in its header; aerospace and medical have no matching customer group and show n/a.
- **Stalled** and **Recently approved** under the table, as both mockups had them.
- The mock pipeline is part of the shared model in `src/lib/shells/mock-avnet.ts` (`PIPELINE`, `PIPELINE_BY_SUPPLIER`, `PIPELINE_BY_SEGMENT`, `PIPELINE_BY_VERTICAL` and the lists). Each view is rescaled stage by stage so it adds back to the funnel totals; `mock-avnet.test.ts` checks that and that no funnel grows from one stage to the next. Approved pipeline is approved minus billing ($4.0B − $1.6B = $2.4B).

Corrections from the mockups: no real company names beside the placeholders (B had "Supplier A (Analog Devices)"); no red stall ages, invented correlation figure or sources; the expanded funnel is not nested cards.

Checks: tests and typecheck pass. Audit: the switch is a group of pressed buttons, each row toggles with `aria-expanded` and says what it does to screen readers, the table's scroll area is a focusable region, and every mock figure is labelled. Keyboard: the switch and the row toggles work with Tab and Enter. Contrast uses the same tokens as the other passes. Baseline screenshots in `docs/design/baseline/design-pipeline-1440.png` and `design-pipeline-1280.png`, status 200, no console errors, no overflow.
