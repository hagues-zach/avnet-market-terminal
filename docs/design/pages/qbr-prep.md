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
