# PowerPoint exports on the Avnet FY27 template

Every PowerPoint the platform exports is built on the official **Avnet Template FY27** (`assets/brand/avnet-template-fy27.pptx`, received 2026-10-26). The exported file keeps the template's own masters, layouts, theme and fonts, so a seller who opens it in PowerPoint can add slides from the full Avnet layout set.

## What the template holds

- **Size**: 10 by 5.625 inches (16:9).
- **Theme**: Arial for headings and body. Titles are 26 pt black. Body level 1 is a bold key statement (green on most layouts), and level 2 is supporting points with green square bullets. The palette matches `src/lib/colors.ts`.
- **4 masters and 116 layouts**:
  - Master 1 has 34 layouts with 1-line titles; master 2 has 22 with 2-line titles.
  - Masters 3 and 4 are later copies. Most of their layouts duplicate masters 1 and 2. Five exist nowhere else and stay usable: "Title: CV - 1 Line - w/ Core Values", "Closing D", "1_Title B - 1 Line w/dot pattern", "Title and Subhead - 2 Lline" and "Basic Title - 2 Lline".
  - Content masters draw the title at top left, a rule under it, the Avnet logo on a black slanted tab at top right, and the slide number at bottom left.

## The catalog

`scripts/extract-template.ts` reads every master and layout into `src/lib/brand/template/catalog.json`. For each layout it records its name, master, title family (1-line or 2-line), kind (cover, title, subhead, basic, two-column, image, contents, divider, Q&A, thank-you, closing, quote, callout, CV, section), placeholders in inches, background media, and whether the platform may use it. `npx tsx src/lib/brand/template/catalog.test.ts` fails if the catalog no longer matches the file.

**When the template changes:** replace the file, run `npx tsx scripts/extract-template.ts`, then run the catalog test.

### Excluded layouts

- **"w/Slash Pattern" (4 layouts)**: the brand kit dropped the slash mark. These layouts, and their diagonal line texture, are removed from every exported file, so nobody can pick them in PowerPoint either.
- **Same-name copies in masters 3 and 4**: catalogued but never chosen. They stay in the file.

### Allowed (decided 2026-10-26)

The slanted bar backgrounds on the divider, Q&A and thank-you layouts, and the slanted logo tab on content slides, are part of the FY27 template and allowed.

## How an export uses it

`src/lib/brand/pptx/assemble.ts`, `buildFromTemplate(slides, { title })`:

1. **The package.** It opens the template, drops its two sample slides, and removes the slash pattern layouts.
2. **Placeholders.** Each `TemplateSlide` names a layout from the catalog and fills that layout's real placeholders: `title`, or an idx such as `"10"`. Titles and text inherit the template's position and styles. Unfilled placeholders are left off the slide, and content slides get the layout's slide number.
3. **Charts, tables and footers** come from `draw`. They're drawn with pptxgenjs on a scratch slide of the same size and moved across with their chart parts and workbooks, so charts stay native and editable.
4. **Package bookkeeping.** It writes the slide list, the section, the relationships, the content types and the document properties.

`src/lib/brand/pptx/layouts.ts`, `chooseLayout(kind, headline)`, picks a layout by kind: cover, subhead, basic, two-column or closing. A headline longer than one 26 pt title line moves to the 2-line family. It only picks usable layouts from masters 1 and 2.

Today's exporter is the Pitch Deck Builder (`src/lib/deck/pptx.ts`). Its slides map to layouts like this:

| Slide | Layout |
|---|---|
| Cover | Cover - Full Image (title, subtitle, prepared-with line over the A-frame photo) |
| A chart or figures | Title and Subhead: the sentence is the subhead, and the chart and figures are drawn below |
| Lines or a sentence | Basic: a short sentence is the statement (level 1); long text and lines are level 2 |
| Talking points | 2 Column: each column's heading is the statement, and the points are its bullets |
| Sources | Basic |
| End | Closing |

Every content slide has a footer beside the template's slide number: the source and period, and a yellow "Mock data" tag on mock slides.

## Checks

- `npx tsx src/lib/brand/pptx/assemble.test.ts`: every relationship resolves, every part has a content type, slide ids are unique and match the section, slides use their layouts, titles are in title placeholders, shape ids are unique, charts carry workbooks, 112 layouts are kept, and the slash pattern layouts and texture are gone.
- `npx tsx src/lib/deck/pptx.test.ts`: the deck's layouts in order, closing last, "Mock data" only on mock slides, no slash, middle dot or dash apart from "n/a", and Avnet Green only on Avnet's series.
- Quick Look renders the slides on macOS (`qlmanage -t` shows the first slide of a file). It doesn't draw native charts or the template's SVG logo tab, so judge those in PowerPoint.
