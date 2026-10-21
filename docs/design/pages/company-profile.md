# Company Profile: design brief (step 2.2)

## Who and why

`/network/[slug]`, one page for each of the 78 SEC filers: Avnet, its suppliers, competitors (Arrow and others), customers and ecosystem companies. Supplier and product managers prepare for supplier calls here; sellers check a customer before a meeting; leaders look up a competitor. They want, in this order: how the company is doing, what management just said, where its revenue comes from, who distributes it, and what's in the news. Then they want to take it into a QBR brief.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Who is this? | Header: name, role and cohort, ticker, chips (role, "SEC filer", "Carried by Avnet" for suppliers on Avnet's line card) | `COMPANIES`, `roleOf`, line card store | Live |
| How are they doing? | KPI row (revenue with YoY, gross margin, operating margin, inventory days) and revenue and growth charts | `getCompanyEarnings()` | Live |
| When do they report next? | Header facts: next earnings (estimated) and latest filing | `getNextRelease()`, latest filing | Live |
| What did management say? | Commentary: headline, topics, talking points | `getCommentary()` (Claude) | Live; off without an API key |
| Where does revenue come from? | Revenue mix by segment, region, customer | `getRevenueMix()` | Live |
| Who distributes them? | Line card presence (suppliers only) | Line card store | Live |
| What's in the news? | News naming the company | Market News feed | Live |
| What is Avnet's business with them? | Avnet billings and backlog for this supplier or customer | Billings, account data | Mock, with the hookup marker |

## Rules for this page

- The company's own series use Dark Blue; Avnet's profile uses Avnet Green. Arrow is Dark Blue as always.
- Commentary is labelled as written by Claude from the press release, with a link to the release.
- No tone chips on commentary topics: the digest has no tone score, and inventing one would be dishonest.
- Next earnings is marked as an estimate.
- "Add to QBR brief" is the page's one primary action; it links to QBR Prep with the company chosen.
- The "Coming to this profile" card goes; anything planned is shown as a mock section with a hookup marker instead.

## Taste review

Reading this as: a dense dossier page for internal sellers and managers, on the `DESIGN.md` system. Dials: layout variance 3, motion 2, density 7. Risks: a long single column of equal cards (today's page), repeating the same number in two places, decorative charts.

## Decision

Built variant B, the dossier (`company-profile-b-dossier.png`): KPIs, one revenue chart with a Revenue/Growth switch, "In brief", commentary and revenue mix in the main column; key facts, Avnet business (suppliers and customers only, mock), distribution (suppliers only) and news in the rail. Avnet's business with the company is shown with mock figures and the hookup marker.
