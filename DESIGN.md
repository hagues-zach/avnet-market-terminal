---
version: alpha
name: Avnet-market-intelligence
description: "A dense, light, engineered workspace for Avnet sellers, product managers and leaders. Started from IBM Carbon (flat geometry, 1px hairlines, 4px grid, surface change instead of shadow) and rebuilt on the Avnet brand: white and near-white surfaces, black type, Avnet Green (#41C363) as the one brand accent, Oswald for headlines and figures, a clean sans for everything else. Green is used as fill, rule and signal, never as text on white. In every chart, Avnet Green means Avnet and nothing else."

colors:
  # Brand. Primary palette.
  primary: "#41C363"            # Avnet Green. Fills, rules, focus, the Avnet series. Never text on white (2.3:1).
  on-primary: "#000000"         # Black type on green (9.2:1), per brand rule for the highlight bar.
  ink: "#000000"              # Headlines, body, figures.
  canvas: "#F4F5F6"           # App background behind cards.
  surface: "#FFFFFF"          # Cards, tables, sidebar, top bar.
  # Neutrals for UI chrome (not data viz).
  surface-sunken: "#F4F5F6"   # Table header rows, input fields, hovered rows.
  surface-selected: "#EAF8EE" # Selected row, active nav item (green at ~10% on white).
  hairline: "#E3E5E8"         # 1px borders, dividers, chart axis lines.
  hairline-soft: "#EEF0F2"    # Chart gridlines, zebra rows.
  hairline-strong: "#000000"  # Focused input underline, selected tab underline base.
  ink-muted: "#6B7075"        # Secondary text, labels, axis ticks (5.0:1 on white).
  ink-subtle: "#919191"       # Medium Gray. Disabled, placeholders, large text only (3.2:1).
  inverse: "#000000"          # Rare inverted surfaces (tooltips, toasts).
  on-inverse: "#FFFFFF"
  # Status. UI states only; never chart series.
  positive: "#138036"         # Good delta text, success. Dark Green; needs brand sign-off for UI use (see Open questions).
  negative: "#D7263D"         # Bad delta, errors, destructive. Not a brand color; confirm with brand team.
  warning: "#FDB813"          # Yellow as fill or border, with black text. Never yellow text on white (1.7:1).
  warning-text: "#8A6100"     # Text-safe warning ink (5.5:1).
  info: "#4273B8"             # Dark Blue. Links in dense tables, info badges.
  mock: "#FDB813"             # The dashed "Mock data. Hook up: ..." marker.
  # Data visualization. See the chart rules below.
  viz-avnet: "#41C363"
  viz-avnet-2: "#138036"      # Avnet's second series only (prior year, plan, forecast).
  viz-arrow: "#4273B8"        # Slot 1. Dark Blue. Arrow Electronics on every page.
  viz-2: "#E88320"            # Slot 2. Orange.
  viz-3: "#53B8E1"            # Slot 3. Light Blue, darkened for charts (brand #7DCEF1).
  viz-4: "#E7A300"            # Slot 4. Yellow, darkened for charts (brand #FDB813).
  viz-other: "#D2D2D2"        # Light Gray. "All other" and remainder fills.
  viz-benchmark: "#919191"    # Medium Gray. "All other" or benchmark as a line.

typography:
  page-title:
    fontFamily: Oswald
    fontSize: 24px
    fontWeight: 300
    lineHeight: 1.25
    letterSpacing: 0.5px   # all caps
  section-title:
    fontFamily: Oswald
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0.2px
  card-title:
    fontFamily: Oswald
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.2px
  figure-xl:
    fontFamily: Oswald
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.1
    fontFeature: tnum
  figure:
    fontFamily: Oswald
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.15
    fontFeature: tnum
  label:
    fontFamily: Oswald
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.6px   # all caps
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  body-strong:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.45
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  table:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: tnum
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.35
  micro:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2

rounded:
  none: 0px      # Buttons, inputs, tables, tabs.
  sm: 2px        # Cards, popovers, tooltips. The default container corner.
  pill: 9999px   # Status chips and source chips only.

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    width: 240px
  sidebar-item-active:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: 32px
  top-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    height: 48px
  page-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.page-title}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 16px
  card-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
  kpi-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.sm}"
    padding: 12px 16px
  kpi-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
  delta-positive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.positive}"
    typography: "{typography.caption}"
  delta-negative:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.negative}"
    typography: "{typography.caption}"
  table-header:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    height: 32px
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    height: 32px
  table-row-selected:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    height: 32px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    height: 32px
    padding: 0 12px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    height: 32px
    padding: 0 12px
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    height: 32px
    padding: 0 8px
  text-input:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    height: 32px
    padding: 0 12px
  tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    height: 36px
  tab-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    height: 36px
  filter-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: 44px
  source-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
  hookup-marker:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  warning-banner:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
  tooltip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px
  chart-avnet:
    backgroundColor: "{colors.viz-avnet}"
    textColor: "{colors.ink}"
  chart-avnet-secondary:
    backgroundColor: "{colors.viz-avnet-2}"
    textColor: "{colors.on-inverse}"
  chart-arrow:
    backgroundColor: "{colors.viz-arrow}"
    textColor: "{colors.on-inverse}"

---

## Overview

The Avnet Market Intelligence superapp is a working tool, not a marketing site. Sellers open it before a customer call, product managers live in it, and leaders scan it between meetings. So the design is **dense, calm and exact**: a lot on the page, very little decoration, every number easy to read and easy to trust.

It starts from **IBM Carbon** (the closest system in awesome-design-md for a data-dense enterprise tool). From Carbon it keeps the flat geometry, 1px hairlines, the 4px grid, and depth carried by surface change rather than shadow. Carbon's corners also match Avnet's own illustration rule: hard corners. Everything Carbon does with IBM Blue is redone in **Avnet Green**, under Avnet's rules.

**Key characteristics**

- **Avnet Green is the only brand accent.** It appears as fills, rules, the focus ring, the active nav item, the primary button and the Avnet series in charts. It is never used as text on white, because it fails contrast (2.3:1).
- **In charts, green means Avnet.** No other series, category, threshold or status is ever drawn in Avnet Green.
- **Black and white do the work.** White cards on a near-white canvas, black type and grey hairlines cover more than 90% of the screen, which matches the brand's colour ratio (green first, black and white supporting, secondary colours only for small accents).
- **Oswald for headlines and figures, a clean sans for reading.** Page titles use Oswald Light in all caps, the brand's display treatment. KPI figures and table and chart labels use Oswald Regular, which the brand reserves for "data tables, charts and graphs". Body text, table cells and controls use Inter.
- **Flat and square.** Buttons, inputs, tables and tabs have 0px corners. Cards and popovers have 2px. Only status chips are pills. Shadows appear only on things that float: menus, popovers, toasts.
- **Light mode only for now.** Every colour is a semantic token (`surface`, `ink-muted`, `hairline` and so on), so a dark theme can be added later by remapping the tokens. Components must never hard-code hex values.
- **Honest about data.** Every figure carries its source and as-of date. Mock figures stay behind the dashed yellow hookup marker until real data replaces them.

## Colors

### Brand

- **Avnet Green** `{colors.primary}` #41C363 (Pantone 2256 C). The brand's signature. Used for: primary buttons (black label), the active nav rule, selected tab underlines, focused input underlines, the focus ring, the highlight bar, progress fills, and the Avnet series in every chart.
- **Black** `{colors.ink}` #000000. All headlines, body and figures.
- **White** `{colors.surface}` #FFFFFF. Cards, tables, sidebar and top bar.

### Neutrals (UI chrome)

These greys hold the interface together. They are not data-viz colours.

| Token | Hex | Use | Contrast on white |
|---|---|---|---|
| `canvas` | #F4F5F6 | App background behind cards | n/a |
| `surface-sunken` | #F4F5F6 | Table headers, inputs, hovered rows | n/a |
| `surface-selected` | #EAF8EE | Selected row, active nav item | n/a |
| `hairline` | #E3E5E8 | Borders, dividers, axis lines | n/a |
| `hairline-soft` | #EEF0F2 | Gridlines, zebra rows | n/a |
| `ink-muted` | #6B7075 | Labels, secondary text, axis ticks | 5.0:1 |
| `ink-subtle` | #919191 | Medium Gray. Disabled and placeholder text, 18px+ only | 3.2:1 |

The brand guide allows Medium Gray (#919191) for body copy. On screens it fails WCAG AA for small text, so here it is limited to disabled text and large type. `ink-muted` takes its place for secondary text.

### Status

Status colours mark UI states: deltas, alerts, validation. They are never used as chart series.

| Token | Hex | Rule |
|---|---|---|
| `positive` | #138036 | Text for good deltas and success, always with an up or down arrow and a sign. 5.0:1. |
| `negative` | #D7263D | Bad deltas, errors, destructive actions. 5.0:1. |
| `warning` | #FDB813 | Fills and borders only, with black text on top. Never yellow text on white. |
| `warning-text` | #8A6100 | When warning needs to be text. 5.5:1. |
| `info` | #4273B8 | Info badges and links inside dense tables. 4.8:1. |
| `mock` | #FDB813 | The dashed "Mock data. Hook up: ..." marker. |

Colour is never the only signal. Deltas carry an arrow and a + or − sign. Status chips carry a word ("Live", "Mock", "Planned").

## Data visualization

The brand's rule is absolute: **Avnet Green always represents Avnet and never represents anything else.**

### Series order

Validated with the dataviz palette validator (OKLab ΔE, Machado 2009 colour-blind simulation, white surface) on 2026-10-20.

1. **Avnet**: `viz-avnet` #41C363. If Avnet needs a second series (prior year, plan, forecast), use `viz-avnet-2` #138036 (ΔE 20 from Avnet Green, so the two stay distinct), or green with a dashed line.
2. **Everyone else**, in this fixed order. Never cycle back to the start:
   - `viz-arrow` Dark Blue #4273B8. **Arrow Electronics is always this colour**, on every page. When Arrow is in a chart, other companies start at Orange; when it isn't, Dark Blue is the first non-Avnet series.
   - `viz-2` Orange #E88320
   - `viz-3` Light Blue, chart step #53B8E1
   - `viz-4` Yellow, chart step #E7A300
3. **All other, remainder**: `viz-other` Light Gray #D2D2D2 as a fill; `viz-benchmark` Medium Gray #919191 as a line. Grey means "not one identity", so it never needs to pass the identity checks.

That is Avnet plus four. A fifth company folds into "All other", or the chart becomes a ranked bar chart or a table.

**What the validator found**

| Check | Result |
|---|---|
| Lightness band (OKLCH L 0.43–0.77) | Pass with the chart steps. Brand Light Blue (L 0.81) and Yellow (L 0.83) fail: too light to read as series on white. |
| Chroma floor (C ≥ 0.10) | Pass. Dark Gray #5F6369 (C 0.01) fails, so it's not a series colour; it stays for axis text and UI. |
| Colour-blind separation, neighbours | Pass. Worst pair ΔE 22.4 (target 8). |
| Normal-vision separation, neighbours | Pass. Worst pair ΔE 26.0 (floor 15). |
| Contrast with white | Below 3:1 for Avnet Green (2.3), Orange (2.7), Light Blue (2.3) and Yellow (2.2). This is allowed only with relief, so every chart **must** have direct labels or a table view. |

**Why the order changed from the brand guide.** The brand lists secondary colours (Light Blue, Yellow) first. Started from that order, the palette fails the lightness check, and putting Dark Blue first gives the widest gap between neighbours. The brand hexes for Light Blue and Yellow are darkened at the same hue only inside charts. This needs brand sign-off (see Open questions).

**Charts where every pair can touch** (scatter, bubble, small multiples): at most three series, `viz-avnet`, `viz-arrow`, `viz-3` (worst ΔE 17.1). Avnet Green against Orange or Yellow falls below 6 for red-green colour blindness, so those never share a scatter. More series need facets.

**Severity** (risk, heat): Light Gray → Yellow → Orange → Negative red, always with a word label. It never starts at Avnet Green.

In code: `VIZ`, `chartSeriesColor`, `entityColor`, `ALL_PAIRS_ORDER`, `RISK_COLOR`, `labelOn` (label colour on a fill) and the shared chart chrome `CHART` in `src/lib/colors.ts`. Tailwind exposes the same values as `viz-*`.

### Chart rules

- **Avnet plus four series at most**, plus "All other". Beyond that, switch to a ranked bar chart or a table.
- **Label lines directly** at their end where there is room. Use a legend only when direct labels collide.
- **Gridlines**: horizontal only, `hairline-soft`, solid (not dashed). No vertical gridlines.
- **Axes**: `hairline` axis line, 11px Inter ticks in `ink-muted`, no tick marks. Numbers abbreviated ($1.2B, 34%).
- **Tooltips**: white, 1px `hairline` border, `rounded.sm`, overlay shadow. Series name, value with units, period. Tabular figures.
- **Light-coloured series** (Light Blue, Yellow, the greys) are filled areas, bars at least 8px wide, or lines at least 2.5px (`CHART.lineWidthLight`). Never thin lines, never text. Labels, values and legends are drawn in `ink` or `ink-muted`, never in the series colour.
- **Ordered severity** (risk, heat) uses a single-hue ramp or yellow → orange → red. It never starts at Avnet Green.
- **Every chart card shows its source and as-of date** in the footer.
- **One y-axis.** Never a dual-axis chart; two measures on different scales are two charts.
- **Bars for one series are one colour.** Don't colour nominal bars by index or value; length already shows the value.

## Typography

### Fonts

- **Oswald** (Google Fonts, already loaded). The brand display face. Light 300 for page titles in all caps. Regular 400 for section and card titles in sentence case, for KPI figures and for table and chart labels, the uses the brand assigns to Oswald.
- **Inter** (Google Fonts, already loaded). Stands in for **Aperçu Avnet**, the brand's body face. Aperçu is custom to Avnet and is not licensed for this app. Inter is used for body, table cells, controls and captions. Ask brand for a web licence (see Open questions). Arial is the Office fallback and is not used on the web, per the brand guide.
- Figures always use tabular numerals (`font-variant-numeric: tabular-nums`).

### Scale

The brand's print sizes (26pt headline, 9pt body) are scaled up for screens. Body is 14px, the Carbon product default.

| Token | Font | Size / line | Weight | Case | Use |
|---|---|---|---|---|---|
| `page-title` | Oswald | 24 / 30 | 300 | ALL CAPS, +0.5px | One per page |
| `section-title` | Oswald | 16 / 20 | 400 | Sentence | Section headings within a page |
| `card-title` | Oswald | 14 / 18 | 400 | Sentence | Card and chart titles |
| `figure-xl` | Oswald | 32 / 35 | 400 | n/a | Hero KPI on Start Here |
| `figure` | Oswald | 24 / 28 | 400 | n/a | KPI tiles |
| `label` | Oswald | 11 / 14 | 400 | ALL CAPS, +0.6px | KPI labels, table headers, eyebrow labels |
| `body` | Inter | 14 / 20 | 400 | Sentence | Default text |
| `body-strong` | Inter | 14 / 20 | 600 | Sentence | Emphasis, level 3 subheads |
| `body-sm` | Inter | 13 / 18 | 400 | Sentence | Nav items, inputs, dense lists |
| `table` | Inter | 13 / 17 | 400 | n/a | Table cells, tabular figures |
| `caption` | Inter | 12 / 16 | 400 | Sentence | Meta, sources, footnotes |
| `micro` | Inter | 11 / 14 | 500 | Sentence | Chips, badges, chart ticks |
| `button` | Inter | 13 / 16 | 600 | Sentence | Button labels |

Nothing in the app is smaller than 11px. Text stays left-aligned except numeric table columns, which are right-aligned.

## Layout

### Grid and spacing

- **4px base grid.** Tokens: 4, 8, 12, 16, 24, 32, 48.
- **App shell**: a 240px sidebar, a 48px top bar, and content on `canvas` with 24px page padding (16px below 1280px).
- **Content**: a 12-column grid with 16px gutters. Content stretches to the window up to a 1584px maximum. It is not centred in a narrow column, because analysts use wide screens.
- **Card padding** is 16px. Gaps between cards are 16px. Gaps between page sections are 24px.
- **Page rhythm**: page header (title, one-line subtitle, page actions on the right) → filter bar if the page has one → KPI row → primary chart or table → supporting cards.

### Density

- Default table row: 32px (compact). There is a 40px "comfortable" option for the tables sellers scan in meetings (QBR Prep, Company Profile).
- Controls (buttons, inputs, selects) are 32px high in the app. They grow to 40px on touch viewports.
- Prefer one strong primary visual per page over a wall of equal cards.

### Breakpoints

| Name | Width | Behaviour |
|---|---|---|
| Wide | ≥ 1584px | Content capped; extra width goes to the margins |
| Desktop | 1280–1583px | Full layout, 4-up KPI row |
| Laptop | 1024–1279px | Sidebar stays; KPI row 3-up or 2-up; page padding 16px |
| Tablet | 768–1023px | Sidebar collapses to icons (56px) or a drawer; 2-up cards |
| Phone | < 768px | Read-only summaries: Start Here, Company Profile, Market News. Tables scroll inside their card. |

Desktop and laptop are the design targets. Every page is checked at 1440px and 1280px.

## Elevation and shape

| Level | Treatment | Use |
|---|---|---|
| 0 | Nothing | Text and charts on a card |
| 1 | 1px `hairline` on `surface` | Cards, tables, inputs, the sidebar edge |
| 2 | `surface-sunken` fill | Table headers, hovered rows, inputs |
| 3 | `0 4px 16px rgba(0,0,0,0.12)` shadow + `rounded.sm` | Menus, popovers, tooltips, command palette, toasts |

- No drop shadows on cards. The legacy `shadow-card` token is now `none`; remove its uses in page passes.
- Corners: **0px** for buttons, inputs, tabs and tables. **2px** for cards, popovers and tooltips. **Pill** for status and source chips only. The legacy `rounded-card` token is now 2px; prefer `rounded-sm`.
- **Focus**: a 2px `primary` outline with 2px offset on every interactive element. This is already in `globals.css`. Keep it.

## Brand graphic elements

Avnet's graphic elements are strong and rare. In a working tool they appear even less often.

- **No slash mark.** The current Avnet brand kit no longer uses the green slash mark (decided 2026-10-20). Don't draw it, type it as "/", or use the slash pattern, anywhere in the app.
- **Highlight bar**: an angled green bar that bleeds off the edge, with black text. Used for a single key message, for example the Start Here headline insight. At most one per page, and never on dense data pages.
- **A-Frame**: only in Learning Center and onboarding illustrations. Never in app chrome.
- **Patterns** (dot, plus): only on empty states and the login screen, one pattern at a time.
- **Logo**: the primary logo (black wordmark, green bar) on white. The brand prefers the top or bottom right corner. App chrome conventionally puts it at the top left of the sidebar; confirm this with brand (see Open questions). Never recolour, stretch or add a tagline.

## Iconography and illustration

- **Icons**: Lucide (already installed). It is mono-weight line art, which matches the brand style. Use a 1.5px stroke, 16px in dense UI and 20px in nav and page actions. Icons are `ink` or `ink-muted`; green only for an active state. The brand's 24–48px icon range is for marketing and does not apply to inline UI icons.
- **Illustrations** (Learning Center, empty states, onboarding) follow the brand style: mono-weight line, black and green strokes only, hard corners (circles allowed), green for 15–30% of the drawing, on white or Light Gray. Generate these with Nano Banana against this description.

## Components

The `components:` front matter holds the token-level specs (colours, type, size). The behaviour and the details the format has no field for are below. Borders are 1px `hairline` unless stated; cards never have shadows.

- **Sidebar.** Nav groups (Start Here, Knowledge, Network, Avnet performance, Tools, Setup) get `label` headings. The active item has the `surface-selected` fill, a 3px green left rule and black text. Mock pages keep their small yellow ring.
- **Top bar.** Search, or later the command palette, on the left; persona switch, data freshness and the user on the right. 48px high.
- **Page header.** Title, a one-line subtitle in `ink-muted`, and page actions on the right (export, share).
- **KPI tile.** The label on top, the figure, then the delta (arrow, sign, %, comparison period) and the source chip. Mock values keep the hookup marker.
- **Data table.** Sticky header on `surface-sunken`, `label` header text, sortable columns, right-aligned tabular numbers, the row hover fill, and column alignment that holds across pages. A Company name cell links to its profile.
- **Chart card.** A card with a `card-title`, an optional sentence-case "so what" line underneath, the chart, then a footer with the source chip and as-of date.
- **Filter bar.** Period, region, segment and supplier selects in one 44px row. Active filters show as removable chips. "Reset" is a ghost button.
- **Buttons.** Primary: green with a black label. One per view. Secondary: white with a 1px black border. Ghost: text only. Destructive: a `negative` border and text, filled only on confirm.
- **Source chip.** A pill naming the source: Live (green dot), Mock (yellow dashed border, black text), or Planned (grey).
- **Hookup marker.** Dashed yellow border, black text on a 6% yellow tint, directly under the section it describes.
- **Empty, loading and error states.** Loading uses skeleton blocks shaped like the final layout, on `hairline`, never a lone spinner. Empty states give one line saying why it's empty and one action. Errors say what failed, name the source, and offer a retry.

## Voice in the interface

Avnet's voice is **a confident and collaborative guide**: resourceful, straightforward, approachable and expert. In the app that means:

- **Sentence case everywhere** except page titles and `label` text, which are all caps by design.
- **Plain words, short sentences, active voice.** "Arrow gained 2 points in Americas" beats "Market share movement detected".
- **Lead with the answer.** A card's subtitle states the takeaway; the chart supports it.
- **Say "Avnet"**, not "Avnet, Inc.". Use "customers", "supplier partners" and "engineers".
- **Spell out one to nine; numerals for 10+; use %.** In tables and KPIs, always use numerals.
- **No hype words** ("cutting-edge", "dynamic", "revolutionary"). No jargon without a tooltip.
- **Be honest about data.** Say "Mock data" and "Estimated" plainly. Show "as of" dates. Never round a mock number to look real.

## Do's and don'ts

### Do

- Use Avnet Green for fills, rules and focus; put black text on green.
- Keep green for Avnet in every chart, and Dark Blue for Arrow.
- Use semantic tokens (`surface`, `ink-muted`, `hairline`) in components, never raw hex.
- Use 0px corners on controls and 2px on cards; depth comes from hairlines and surface change.
- Use tabular figures, right-aligned, for every number in a table.
- Show a source and an as-of date on every chart and KPI.

### Don't

- Don't put green text on white, or yellow or light blue text on anything light.
- Don't use Avnet Green for "good", "low risk" or any non-Avnet series in a chart.
- Don't add drop shadows to cards or round controls into pills.
- Don't use the slash mark, drawn or typed, or the slash pattern.
- Don't use more than one highlight bar, A-Frame or pattern on a page, or any of them on dense data pages.
- Don't use Medium Gray (#919191) for small body text.
- Don't introduce new accent colours. Use the brand secondary and tertiary palettes, in order.

## Fixes this document asks for

Picked up in steps 1.3, 1.5 and 1.6:

1. ~~`RISK_COLOR.low` is Avnet Green.~~ Done in step 1.3: the ramp starts at Light Gray.
2. ~~`SERIES_ORDER` includes Dark Green and Medium Gray, and cycles.~~ Done in step 1.3: the validated order, no cycling, `entityColor` keeps Arrow Dark Blue.
3. ~~Yellow text on the source chip and hookup marker.~~ Done in step 1.6: both draw from the new kit.
4. ~~The typed "/" before card headings.~~ Removed: the brand kit dropped the slash mark.
5. ~~Card shadow and 8px corners.~~ Done in step 1.6: every card is flat with 2px corners.
6. Charts hard-code `#E3E5E8`, `#EEF0F2` and a 6px tooltip radius. The shared `CHART` tokens exist (step 1.3); each chart moves to them, with solid gridlines, in its phase 2 pass.
8. `endmarket-bars.tsx` colours one series of bars by index. Make it one colour in its phase 2 pass.
9. `book-to-bill-gauge.tsx` (Market Overview) draws market data in Avnet Green and shows the figure as green text on white. Use ink for the figure and a neutral or status colour for the gauge.
10. Chart legends (for example the stacked area on TAM) draw label text in the series colour; light series become unreadable. Legend text goes in `ink-muted`.
11. The TAM methodology paragraph shows "MOCK" as yellow text. Use the `DataChip` or plain black text.
12. ~~Treemap labels were white on light fills.~~ Done in step 1.6: `labelOn()` in `src/lib/colors.ts` picks black or white per fill.
7. ~~56px top bar.~~ Done in step 1.6: the new shell is 48px, with a sidebar drawer below 1024px.

## Direction (step 1.2)

**Reading this as:** an internal analysis tool for Avnet sellers, product managers and leaders, with a calm, exact, briefing-first look, built on Carbon's flat geometry and Avnet's brand. It is a working tool, not a marketing site and not a trading terminal.

### The three dials

| Dial | Setting | What it means here |
|---|---|---|
| Layout variance | 3 of 10 | A predictable 12-column grid. The same page rhythm everywhere, so people learn it once. Asymmetry comes only from content weight (8/4, 7/5 splits), never from decoration. |
| Motion | 2 of 10 | Hover and focus states, 150 ms colour and opacity transitions, skeleton loading. No entrance animations, no scroll effects, nothing moves on its own. Respect `prefers-reduced-motion`. |
| Density | 7 of 10 | A lot on the page, held together by hairlines and type, not by boxes inside boxes. 32px table rows and controls. One card level only: no cards inside cards. |

### Tone

- **Lead with the answer.** Every page opens with the one thing that changed or matters, then the evidence. Start Here is a briefing, not a wall of charts.
- **Calm.** Colour appears only where it means something: Avnet in green, Arrow in dark blue, deltas in positive and negative, mock data in yellow. Everything else is black, white and grey.
- **Exact.** Every number has units, a period, a source and an as-of date. Mock is labelled as mock.
- **Engineered, not decorated.** No gradients, glows, glass, illustrations in data views, or decorative icons.

### Light only

Light mode only for now, decided 2026-10-20. Components use semantic tokens only, so a dark theme is a token remap later, not a rework.

### Built on Carbon's ideas, not Carbon's package

We borrow Carbon's geometry and density but do not install `@carbon/react`. Avnet's brand would replace most of Carbon's tokens, its type and its colour, which defeats the purpose of using the official package. The app keeps Tailwind and the components it already has, rebuilt to this document in step 1.5.

### Where we deliberately differ from generic "taste" advice

- **Pure black (#000000) text** stays, because Black is a primary brand colour.
- **Inter** stays for body text until Aperçu Avnet is licensed for the web.
- **Lucide icons** stay because the project already uses them.
- **No em-dashes in UI copy.** Use a full stop, a comma or a colon instead. This adds to the voice rules above.

### Reference screens

Mockups made in Google Stitch from this document: project "Avnet Market Intelligence - Direction" (`18036872963696779556`), screens saved in `docs/design/reference/`. **All figures, companies' facts and sources in these images are invented by the generator** (for example distributor start dates and a de-listing on the Company Profile). They show the look, not the content.

1. **Start Here**: `docs/design/reference/01-start-here.png`. The briefing page: one highlight message, five KPIs, the mock marker, what changed, persona shortcuts, and the billings chart.
2. **Company Profile**: `docs/design/reference/02-company-profile.png`. A detail page mixing narrative and data: header with actions and tabs, KPIs with sources, a stacked chart with no green (not Avnet), management commentary with word-plus-arrow tone chips, and a distribution table.
3. **Market Share**: `docs/design/reference/03-market-share.png`. The densest type of page: filter bar, KPIs, Avnet green and Arrow blue lines labelled at the line end, a white-space list with trackless bars, and a sortable table with a density switch.

**Keep from the references:** square controls, hairline-only tables, the KPI tile layout (label, figure, delta, source), the dashed mock marker under the section it describes, the green fill only for Avnet, the Arrow blue, line labels at the end of the line, the tone chips with words and arrows, and the compact/comfortable switch.

**Correct when building (the references drift from this document):**

- Remove the green slash before page titles. It appears in every reference screen, but the brand kit no longer uses it.
- Card and section titles are sentence case in Oswald Regular, not all caps. All caps is for the page title and `label` text only.
- The highlight bar is angled and bleeds off the edge, per the brand. The references draw it as a flat full-width banner.
- The mock marker's link and label use black text, not amber (amber fails contrast). Drop the "Configure data source" link until that flow exists.
- Status chips use the documented set: neutral for facts ("Franchised", "SEC filer"), `positive` or `negative` text only for direction. No blue "Medium" chips. Confidence chips are words on neutral.
- KPI deltas never wrap. Shorten them ("+40 bps") or widen the tile.
- One KPI figure size per row (24px `figure`). Market Share used a larger, bolder size.
- The sidebar comes from the app's `nav.ts`, not from the mockups, which change it from screen to screen.
- Charts fill their card height; no tall empty areas (the Company Profile chart).
- Light series (Light Grey "Rest of distribution", Light Blue, Yellow) are at least 2.5px lines or solid fills.
- Delete repeated words in feed items ("Reason:", "Source:"). Show the source as a caption and the date on the right.

## Open questions for the Avnet brand team

1. Can Dark Green (#138036), a data-viz-only colour, be used as the "positive" status colour in UI text?
2. Is #D7263D acceptable as the error and negative colour? The palette has no red.
3. Can we get a web licence for Aperçu Avnet? Until then, Inter stands in.
4. Is the logo at the top left of the sidebar acceptable for application chrome?
5. Can charts use darker steps of Light Blue (#53B8E1) and Yellow (#E7A300)? The brand hexes are too light to tell series apart on white.
6. Can charts lead with Dark Blue and Orange (tertiary) ahead of the secondary colours, for colour-blind separation?

## Iteration guide

1. Change one component at a time and refer to it by its `components:` token name.
2. A new colour need goes through the brand palette first, in order: primary, then secondary, then tertiary, data viz only.
3. Run `npx @google/design.md lint DESIGN.md` after edits.
4. When the tokens change, update `tailwind.config.ts` and `src/lib/colors.ts` in the same change.
5. When this document changes, refresh Stitch: run `node scripts/stitch-design-md.mjs` (it writes `docs/design/stitch-design.md`, this file minus the repo-only sections), then create a new Stitch design system from that file (updates fail; see below) and record its id here.

### Stitch

- Project "Avnet Market Intelligence - Direction" (`18036872963696779556`). Design system **"Avnet Market Intelligence v2"** (`assets/12368506614593897195`), created from `docs/design/stitch-design.md` on 2026-10-20 after the slash mark was dropped. Pass it as `designSystem` on every `generate_screen_from_text` call. Ignore the other two: "Avnet Market Intelligence" (`assets/4378956131163205347`) still describes the slash mark, and "Precision Intelligence Core" was generated by Stitch for the first reference screen.
- Stitch's `update_design_system` rejects every call for these systems ("invalid argument"), so refresh by creating a new system from the export and updating the id here.
- Test screen: `docs/design/reference/04-avnet-vs-arrow-ds-test.png`, from a five-line prompt with no styling. It got the brand right (Avnet green, Arrow `#4273B8`, square controls, hairlines, Oswald) and invented every number.
- Stitch still drifts on these, so repeat them in each prompt: card titles in sentence case; one primary button, labels on one line; no emoji or icons in banners; no slash mark before titles; bars without background tracks; no version labels; mock marker in black text; real or clearly mock numbers only.
