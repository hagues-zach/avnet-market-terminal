# QBR Prep: design brief (step 2.3)

## Who and why

Sellers, field application engineers and supplier business managers preparing for a quarterly business review: a supplier line review (with a manufacturer Avnet distributes) or a customer account review (with an equipment maker Avnet sells to). Today that means opening five pages and copying into slides. This page assembles one brief they can read in five minutes, print, or take into the Pitch Deck Builder.

The page is reached from the Tools nav, or from a Company Profile's "Add to QBR brief" (`/tools/qbr?company=microchip`).

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Which company and meeting? | Setup: company, meeting type (supplier line review or customer account review), meeting date, anything to focus on | Company list; URL keeps the choice | Live |
| How did their quarter go? | The quarter in brief: revenue, growth, margins and inventory days against a year ago | `getCompanyEarnings()` | Live |
| What did management say? | Guidance, demand, inventory, lead times, pricing, channel | `getCommentary()` (Claude) | Live |
| Where does Avnet stand in their distribution? | Who carries them, recent franchise moves | Line card store, `getMoves()` | Live (suppliers) |
| What's the market backdrop? | One line on the cycle and the company's segment | `getCycle()` | Live |
| What is our business with them? | Billings, book-to-bill, open quotes, design registrations | Billings, bookings, quotes, DRMs | Mock, with the hookup marker |
| What should I raise? | Talking points and questions, each tied to its source | Claude, from all of the above (step 3.1) | To build |

## Layout rules

- One primary action ("Build the brief" before, "Export to deck" after). Print uses the browser.
- The brief reads like a document: numbered sections, each with a one-line takeaway, then the evidence, then its source.
- Avnet's mock numbers are labelled and carry the hookup marker; nothing mock is mixed into live sections.
- A company's own series in Dark Blue; Avnet in Green.

## Taste review

Reading this as: a working document page for internal sellers. Dials: layout variance 3, motion 2, density 6 (reading comfort over packing). Risks: a form-heavy page that looks like admin software; a brief that duplicates the Company Profile instead of editing it down; talking points that read as generic AI text.

## Decision

Built variant B, document first (`qbr-prep-b-document-first.png`), with live sections pulled forward from step 3.1: the setup bar writes company, meeting, date and focus to the URL; the brief assembles the quarter, management commentary, distribution position (suppliers) or market backdrop (others), news, Avnet's business (mock) and talking points from the commentary's existing Claude takeaways. An "On this brief" outline and a sources list sit in the rail. Print hides the app chrome. Step 3.1 still owes talking points and questions written for the meeting and its focus.

## Step 3.1: talking points and questions by Claude

- **What.** Section 6 now holds three to five talking points and three to five questions to ask, written by Claude Sonnet 5.5 for the meeting type and the focus. Each ends with a "From:" link to the brief section it rests on (and the Mock chip when that is our business). Questions come with a one-line reason. The release takeaways stand in when Claude is off or fails.
- **How.** One structured call (`src/lib/qbr/talking-points.ts`), no tool loop: the brief is already gathered by `gatherBrief()` (`src/lib/qbr/gather.ts`), which the page and Claude share, so Claude reads exactly what the reader sees. The section is an enum, so every link points at a real section.
- **Grounding.** Any item with a figure that isn't in the brief Claude read is dropped (`src/lib/qbr/grounded.ts`, shared with the Ask the Terminal eval), and the page says so under the points. Fewer than two surviving points shows the fallback.
- **Framing.** The prompt separates a supplier line review (channel share, allocation, design-win support, Avnet against the other distributors on the line card) from a customer account review (demand, build plans, inventory, supply assurance). A focus is taken up first; when the brief can't answer it, the first point says so and the first question gets at it. Avnet's figures are called mock.
- **Cost and speed.** About 1.3 cents and 13 to 18 seconds per brief. The section loads in its own Suspense boundary, so the rest of the brief shows first. Points are kept per company, meeting and focus until a new filing or a new week.
- **Test (2026-10-23).** `npx tsx src/lib/qbr/eval.ts` runs eight briefs through the dev-only `/api/qbr-eval` route: Microchip with and without a focus, onsemi on automotive design wins, Lattice with Avnet's line card unknown, Apple and Ford as customer reviews, Bel Fuse with a thinner brief, TE on a focus the brief can't answer. It checks counts, dropped items, the focus, mock labelling, customer framing, process talk and the writing rules. First run 6 of 8, with both misses in the check itself; reading showed "No focus was given" openings, fixed in the prompt. Second run 8 of 8 under the corrected checks, no items dropped in either run.
