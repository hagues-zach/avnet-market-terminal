# Chart views for tables: style map and plan

Status: in progress. The modal is built and used on Earnings quarterly detail (branch `claude/table-chart-views`). The inline band was built, tried and dropped. Mockups come from Google Stitch, project "Avnet Market Intelligence - Direction" (`18036872963696779556`), design system "Avnet Market Intelligence v2". **Every figure in the images was made up by the generator**, and so was most of the page chrome (nav, titles, KPI captions, "filing commentary"). Judge them on layout and interaction only. Round 1 (the first comparison of the four styles) is in `round-1/`.

## The rule

The **modal is the default**. Another style replaces it only when the table's data shape earns it:

| Style | Use it when | Mockup |
|---|---|---|
| Inline chart band | Dropped. The user preferred the modal on the one table it fitted (Earnings quarterly detail). | `1-inline-band-earnings.png` |
| Modal with top tabs | **Fallback**, and the full-size view behind every other style's "Expand". Anything with several views per section, or no better fit. | `2-modal-fallback-earnings.png` |
| Right-side drawer | People **step through rows one after another** and need the table to stay visible while the chart changes. | `3-drawer-avnet-vs-arrow.png` |
| Sparklines + click-through | A **ranked snapshot** (one row per thing, latest value only) where **every row has its own history**. The click opens the drawer. | `4-sparklines-market-share.png` |

All four share one content component: tabs, a chart made of single-axis panes stacked on one shared time axis, a one-line takeaway, the exact values table, and the source line. The containers differ; the content is the same. "Expand" from any of them opens that content in the modal.

## Style per page

| Page | Table | Style | Why |
|---|---|---|---|
| Companies > Earnings | Quarterly detail | **Modal** | Each section header gets a "Chart" button that opens the modal. The inline band was built and tried, then dropped (2026-11-24): the user preferred the modal here. |
| Companies > Avnet vs Arrow | Scorecard | **Drawer** | Nine measures, read one after another. ↑ ↓ steps through them with the chart following. |
| Companies > Earnings | Peer group and season tables | **Drawer** | Company rows. Click a company to see the chosen metric over 8 quarters against the group median. |
| Avnet performance > Market share | Share by segment, supplier, region | **Sparklines**, click to drawer | Ranked snapshot, one row per segment, each with its own share history. Drawer adds market size and a "Compare all" small-multiples tab. |
| Avnet performance > Performance | Region table | **Sparklines**, click to drawer, once history exists; modal until then | Snapshot of the latest quarter per region. A per-region quarterly series is not in the mock model yet. |
| Companies > Line cards | Supplier momentum | **Sparklines**, click to drawer, once history exists; modal until then | Ranked by growth. The table holds only the latest growth figure today. |
| Market > TAM / SAM / SOM | Category table | **Sparklines**, click to drawer, once history exists; modal until then | Ranked categories, one year of market size today. |
| Market > Economic signals | Indicators table | **Sparklines** if the indicator series reach the table; otherwise modal | The signals come from time series, but the table component only receives latest values. Check before building. |
| Avnet performance > Customers | By end market | **Modal** | Mixes mock billings with live customer growth; a few views per market, no clean per-row series. |
| Avnet performance > Supply chain | By category | **Modal** | Lead times, producer prices and buying sit side by side; several views per category. |
| Companies > Earnings | Revenue mix (segments) | **Modal** | A breakdown, not a time series per row. |
| Avnet performance > Scenario modeler | Output table | **Modal** | Scenario outputs, not history. |
| Any page, below 1280px wide | Any | **Modal** | The drawer and sparkline drawer become the modal on narrow screens. |

## What the mockups showed

- **Single axis works.** Revenue bars over a growth pane (1, 2) and share over a market-size pane (4) read clearly without a second y-axis. That keeps DESIGN.md's "one y-axis" rule.
- **The drawer squeezes the table at 1440px.** In 3 the measure names wrap onto two lines; in 4 the confidence column is cut off. When building, the drawer should **overlay** the right edge rather than push the table, and the table keeps its full width underneath. Or the table drops its least important columns while the drawer is open.
- **The inline band is tight at 1440px.** In 1 the last quarter column (FQ1 27, the newest) runs off the card. The band must use the table's own column widths. The table already scrolls sideways under 760px, and the band must scroll with it.
- **The modal (2) is the cleanest.** The "Compare with Arrow" control in its side rail is worth keeping in every style, since Arrow always has the same dark blue.

## Drift to fix when building

- Green text or green-tinted badges ("SELECTED", "Arrow leads" style chips, the green column header markers are fine as squares only).
- Invented copy: "Audited", "Filing commentary", "Observation", sub-drivers, consensus figures. Real takeaways come from our data.
- Sidebar and page chrome don't match `nav.ts`. Ignore them.

## Chart content (shared by all styles)

**Earnings, Income statement**: Revenue and growth (revenue bars; YoY and QoQ lines in a pane below). Margins (gross and operating lines). Operating income (bars; operating margin pane). Net income and EPS (two panes). Opex mix (R&D % and SG&A % lines).

**Earnings, Working capital**: Inventory $ (bars). Days (inventory, receivable, payable days and the cash cycle, labelled at line ends). Cash cycle (inventory + receivable days up, payable days down, net dots).

**Earnings, Cash and capital**: Cash flow (operating cash flow bars, capex negative, free cash flow line). Returns (buybacks and dividends stacked, free cash flow reference line). Cash vs debt (two lines).

**Avnet vs Arrow, any measure**: Avnet green vs Arrow blue over 8 quarters; the gap as grey bars in a pane below.

**Market share, any row**: Avnet share line; market size bars in a pane below; "Compare all" small multiples on one shared scale.

## Data gaps

- **Ready**: Earnings quarterly detail (22 line items, 8 quarters) and the Avnet vs Arrow scorecard (both companies' quarters are loaded).
- **Needs mock history**: Share by segment, supplier and region (`ShareRow` has only the latest share and its change on a year ago), and the Performance region table. Add an 8-quarter series per row to `src/lib/shells/mock-avnet.ts`.
- **Needs history added or passed through**: TAM categories (one year today), line-card momentum (latest growth only), Economic signals table (latest values only reach it).
- **Earnings peer group drawer**: the "group median" line needs computing from the group's companies; the quarters are already loaded.

## Build plan

1. `ChartView` content: tabs, stacked single-axis panes on a shared x-axis with a synced hover, takeaway, values table, source, "Compare with Arrow". Recharts and the `CHART` / `VIZ` tokens in `src/lib/colors.ts`.
2. `ChartModal`: the fallback and the "Expand" target. Focus trap, Esc, ← → for tabs, URL hash so a view can be linked.
3. `ChartBand` for Earnings quarterly detail, sharing the table's column widths and its horizontal scroll.
4. `ChartDrawer`: overlays the right edge, pin, ↑ ↓ through rows, becomes the modal below 1280px. Wire into the Avnet vs Arrow scorecard.
5. `SparklineCell` for `DataTable`, plus the share history in the mock model. Wire into Market share, then the region and momentum tables.
6. Modal on the fallback pages (Customers, Supply chain, Revenue mix).
7. Checks: web-design-guidelines audit, Playwright screenshots at 1440 and 1280, keyboard pass.
