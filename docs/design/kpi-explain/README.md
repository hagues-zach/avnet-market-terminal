# KPI explain layer: Book-to-bill popover

These are Stitch mockups for the pilot explainer. The project is "Avnet Market Intelligence - Direction" (`18036872963696779556`) and the design system is "Avnet Market Intelligence v2" (`assets/12368506614593897195`). They were generated on 2026-11-26.

**The generator invented every figure, region, table row and piece of chrome** (the version label, user name, live feed, sidebar). The mockups show the popover's look and order, not content.

| File | Variant | Idea |
|---|---|---|
| `a-bars-and-scale.png` | A, bars and scale | Definition first, then bookings and billings bars, a 0.80 to 1.20 ratio scale with a marker, a quarter stepper, a sentence and a footer |
| `b-scale-with-history.png` | B, scale with history | A lead sentence, then the ratio scale with an eight-quarter dot trail and a shaded flat band, the figures, an eight-button quarter grid and a footer |
| `c-formula-first.png` | C, formula first | A worked fraction (bookings over billings = 1.08), bars with the gap outlined and labelled, a sentence, a stepper, a close button and a footer |

## Review (UI UX Pro Max against DESIGN.md)

**Information order.** Lead with the answer (DESIGN.md, Tone). B does this best: its lead sentence comes first. A opens with the definition, which a returning user has already read. C opens with the arithmetic, which is good for learning but slower to scan.

**Chart form.** A ratio against a threshold is a bullet chart: ranges, a target rule at 1.00 and a value marker. This is UI UX Pro Max's top pick for "performance vs target (compact)". A and B both use this form. B's dot trail adds the trend without a second chart. C has no scale, so the reader can't tell whether 1.08 is a lot.

**The bars earn their place.** A and C show what the ratio is made of. B reduces bookings and billings to text. C's gap label ("+$470M more orders than shipments") is the most concrete sentence in any of the three.

**Controls.** B's grid of eight quarter buttons is heavy for a popover and repeats the dot trail. Making the trail dots selectable, with a single stepper for the keyboard, gives the same control in a third of the space. C's close button helps pointer users. Esc and clicking outside still close it.

**Size and placement.** 320 to 340px wide, anchored under the tile, overlaying the content below without pushing it down. It flips upward or leftward near the viewport edge. Keep it to about 420px tall. B is close to too tall because of the button grid.

**Accessibility.**
- Every control needs a visible `focus-visible` ring in Avnet green.
- The trigger needs an accessible name, for example "Explain book-to-bill".
- The quarter caption goes in an `aria-live="polite"` region.
- The chart needs a text alternative (caption plus a hidden table).
- Band labels can't rely on colour. The text labels Shrinking, Flat and Growing do that job.
- In this dense desktop app, controls are 32px (`h-control`), not 44px.

**Drift to fix in code (Stitch broke these rules):**
- **Green and red text:** B's band labels are green and red text on white, which DESIGN.md forbids. Use `ink-muted` labels.
- **Link colour:** B and C make "More in the glossary" a blue link. The app's links are `ink` with an underline.
- **Middle dot:** A's footer uses a middle dot, which is banned in copy.
- **Chip shape:** C draws pill-shaped Mock chips. The chip is the app's own `DataChip`.
- **Invented chrome:** the version labels, "EST" and the live-feed chrome are not part of the design.
- **Mixed fonts:** monospace figures appear in A and B. The app uses Oswald and Inter with tabular figures.

## Built (2026-11-26)

The hybrid is in `src/components/explain/` (`ExplainPopover`, `ExplainBookToBill`), with its rules in `src/lib/explain/`. Differences from the mockups:
- **Colours:** bookings and billings use Avnet's two greens, as in `BillingsBookingsChart`, not the dark blue Stitch drew. Dark blue means Arrow.
- **No connecting line on the trail:** the dots sit on one line, so a line between them adds nothing. Click a dot to select its quarter.
- **The trigger:** a 12px mark with a 32px hit area. Tabbing past the explainer closes it.

## Recommendation

Build a hybrid of the three:
1. B's lead sentence and ratio scale with the shaded flat band and dot trail. The dots are selectable.
2. A's bookings and billings bars underneath, with C's gap label.
3. A single quarter stepper.
4. A footer with the formula, the glossary link and the source chip.
5. C's close button in the header.
