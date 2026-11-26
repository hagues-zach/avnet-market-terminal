# Add to deck: design brief and mockups

Status: mockups made, waiting for a direction before any UI is built. Plan: `claude/deck-tray`, Phase 1 (tray and a plain deck), Phase 2 (Claude commentary).

## Who and why

Sellers, product managers and leaders already build decks by screenshotting the terminal and writing the words themselves. **Add to deck** lets them collect charts, tables and views as they browse, put them in order with the point they want each to make, and ship the lot as an Avnet FY27 PowerPoint or a PDF. Claude writes the headlines and commentary (Phase 2); every figure comes from the app.

It is named "deck", not "cart": at Avnet a cart means buying parts.

## The four pieces

Mockups are in Google Stitch, project "Avnet Market Intelligence - Direction" (`18036872963696779556`), design system "Avnet Market Intelligence v2" (`assets/12368506614593897195`). The PNGs here came from the Stitch MCP's `download_file` tool, using the screenshot's file name. The `downloadUrl` links need credentials and return a JSON error instead.

| # | Piece | Stitch screen | File |
|---|---|---|---|
| 1 | **Add to deck** button in the chart modal header (idle and "In deck" states), the toast, and the top bar tray badge | "Microchip Technology - Quarterly Detail Modal" (`7401010f1aaf477288958be304372ec8`) | `1-add-to-deck-modal.png` |
| 2 | **Mini tray**: right drawer, 400px, item rows with thumbnail, source and date, remove; "Review deck" and "Clear tray" | "Market Share — Deck Tray Drawer" (`3e3b1115e6dc4789b1308e120fcbd7a3`) | `2-mini-tray-drawer.png` |
| 3 | **Review your deck**: slide list with notes, 16:9 preview with Claude's or the app's wording, order summary with audience, goal and "Ship as" PowerPoint or PDF | "Review your deck" (`2ae8bd2a95f34e2996b2bb6addc5401b`) | `3-review-deck.png` |
| 4 | **Empty tray**: what it does in one sentence, three steps, good places to start, link to the Pitch Deck Builder | "Review your deck — Empty State" (`df0d28e2bd434e9ca2575d68dba8a8e0`) | `4-empty-tray.png` |

## What Stitch made up (judge layout and interaction only)

Every figure, date and company fact in the screens is invented. Stitch's own descriptions also list chrome that is not in the plan and should not be built:

- **All screens:** each one redraws the app's shell differently: sidebar labels, user names ("M. Vance", "Field Analyst"), stock tickers, "Live" chips, feed status, version stamps and keyboard shortcuts (⌘K, Alt+4, Alt+R, Alt+S). None of that is part of this feature.
- **1, modal:**
  - a dashed "Q2'27e" projection column. The chart view never projects.
  - a green "latest quarter" highlight. Green means Avnet only, so a Microchip bar can't be green.
  - a green-boxed "Management Takeaway".
  - "Audit: GAAP Audited", a "Franchised Line" tag and "Export Dossier".
  - several bars that fail to render.

  What to take from it: the "In deck" state (white with a black border and a check), the black toast with its Review link, and "Deck 3" as a labelled button in the top bar rather than a bare icon.
- **2, mini tray:**
  - sequence numbers, drag handles and "Drag rows to reorder". Ordering belongs on the review page; the tray only lists and removes.
  - "SEC Verified" in green text, which breaks the no-green-text rule.
  - sources such as "Calendarized Q3" and "Supply Chain Flow".

  What to take from it: the 4 slides label, "1 on mock data" in the header, the yellow Mock data tag, and Review deck full width with Clear tray beneath.
- **3, review page:**
  - the slide preview is clipped: the headline overflows and there is no chart.
  - a header with "Version History", "Deck ID", "Draft" and a status chip.
  - "Included in prompt", "Refine" and "Re-sync all".
  - a "Save draft to Pitch Deck Builder" link and an engine and latency footer.
  - the cover and sources in the slide list. In the plan they are added at ship time, not listed as items.

  What to take from it: the three columns, the selected row with the note under it, Claude's or the app's wording, and the order summary with its checks and "Ship as" tiles.
- **4, empty tray:**
  - jargon throughout: "Empty slide buffer", "Synthesis protocol", "Ship in 1080p", "Buffer config", "Pinned by 84%".
  - a "Deck specifications" rail with "0 / 20 max" (the plan's cap is 25).
  - "Step 01/02/03" labels.

  What to take from it: the left-aligned panel with one plain sentence, the three steps and the four good places to start. The rail should be dropped.

## Decisions to make

1. **Where the review page lives.** The plan has a separate `/tools/deck/tray` page that shares the slide preview with the Pitch Deck Builder. The alternative is a "From your tray" start inside the builder.
2. **Toast or no toast.** The badge count may be enough feedback. The toast adds a one-click route to "Review".
3. **Thumbnails in the mini tray.** They help recognise items but cost a small render per item. Without them, the rows are the title, source and date.

## Rules carried into the build

- DESIGN.md: light only, square corners, 1px hairlines, no shadows, Oswald for headlines and figures, Avnet Green as fill, rule or focus and never as text on white, and in charts only for Avnet. No slash mark.
- Mock data keeps its yellow tag on the item, the preview and the shipped slide's footer.
- Claude's text is marked "Written by Claude. Check before quoting." and can be swapped back to the app's wording per slide.
- Toasts dismiss themselves after about 4 seconds. Every control works from the keyboard: up and down buttons for order, not drag only. Focus is visible. The drawer traps focus and closes on Esc.
