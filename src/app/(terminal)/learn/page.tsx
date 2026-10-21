import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { HOOKUPS, PILLAR_NAMES } from "@/lib/hookups";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

// Learning Center (PRD section 8.1). Glossary and methodology are written content,
// not data; the source guides are generated from the data hookup register.

const GLOSSARY: { term: string; definition: string }[] = [
  { term: "TAM (total addressable market)", definition: "All revenue in a market segment worldwide, whoever sells it. From WSTS, Gartner or the IP&E forecast." },
  { term: "SAM (serviceable available market)", definition: "The part of TAM Avnet could serve: the regions it operates in, the product lines it carries, and the share sold through distribution." },
  { term: "SOM (serviceable obtainable market)", definition: "What Avnet actually wins: its billings in the segment." },
  { term: "Market share", definition: "SOM divided by TAM for the same segment and period, joined through the code map." },
  { term: "Book-to-bill", definition: "Orders booked divided by sales billed in the same period. Above 1 means orders are arriving faster than they ship." },
  { term: "Backlog", definition: "Orders taken but not yet shipped." },
  { term: "Lead time", definition: "Weeks from order to delivery for a part. Rising lead times usually mean supply is tightening." },
  { term: "Design registration (DRMS)", definition: "A record that Avnet helped a customer design a supplier's part into a product. Approved registrations protect future sales." },
  { term: "DRMS status 04", definition: "Design-approved. Billings carrying this status count as design-approved revenue." },
  { term: "Line card", definition: "The list of suppliers a distributor is authorised to sell." },
  { term: "Franchise agreement", definition: "A supplier's authorisation for a distributor to sell its parts, usually with support and pricing terms." },
  { term: "IP&E", definition: "Interconnect, passive and electromechanical components: connectors, capacitors, resistors, relays, switches." },
  { term: "WSTS categories", definition: "World Semiconductor Trade Statistics product groups: discretes, optoelectronics, sensors, and integrated circuits (analog, micro, logic, memory)." },
  { term: "PCC codes", definition: "Avnet's three-level product classification used in APAC Farnell, mapped to external categories in the code map." },
  { term: "Inventory days", definition: "Inventory at quarter end against one quarter of cost of sales, expressed in days." },
  { term: "Cash conversion cycle", definition: "Inventory days plus receivable days minus payable days." },
  { term: "Fiscal and calendar quarter", definition: "Companies report on their own fiscal calendars. The app lines them up on calendar quarters for comparison." },
  { term: "Results 8-K (Item 2.02)", definition: "The SEC filing a company makes when it reports results; the press release is attached as Exhibit 99.1." },
];

const METHODS: { title: string; body: string }[] = [
  { title: "Market share", body: "Market share = Avnet billings in a segment ÷ the segment's market size, for the same period. Segments are joined through the code map, so each figure carries the confidence of its mapping." },
  { title: "TAM / SAM / SOM", body: "SAM = TAM × geographic coverage × product line coverage × channel share. SOM = Avnet billings where the technology maps to the segment. From PRD section 7." },
  { title: "Fourth quarters from annual reports", body: "Companies report the fourth quarter only inside the full year, so it is the annual figure minus the first nine months. EPS derived this way is approximate." },
  { title: "Cycle label", body: "Expansion or contraction is the sign of combined supply-chain revenue growth; accelerating or slowing is whether it rose from the quarter before." },
  { title: "Earnings dates", body: "Estimated from when each company filed its results for the same quarter a year earlier, moved forward 364 days." },
  { title: "AI summaries", body: "News angles and management commentary are written by Claude from the source text only. They can be wrong; each links to its source." },
];

const VIDEOS = ["Getting around the app", "Reading a company profile", "Market share and the code map", "Preparing a QBR", "TAM / SAM / SOM"];

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">
      <PageHeader title="Learning Center" subtitle="The terms, the methods, and where every number comes from" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Glossary" className="xl:row-span-2">
          <dl className="space-y-2.5">
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt className="text-sm font-medium text-ink">{g.term}</dt>
                <dd className="text-xs text-muted">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="How numbers are calculated">
          <dl className="space-y-2.5">
            {METHODS.map((m) => (
              <div key={m.title}>
                <dt className="text-sm font-medium text-ink">{m.title}</dt>
                <dd className="text-xs text-muted">{m.body}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Walkthroughs" subtitle="Two to three minutes each · not recorded yet">
          <ul className="space-y-1.5">
            {VIDEOS.map((v) => (
              <li key={v} className="flex items-center gap-2 text-sm text-muted">
                <PlayCircle className="h-4 w-4" aria-hidden />
                {v}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Data source guides" subtitle="What each source is, how often it refreshes, and whether it is connected">
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {HOOKUPS.map((h) => (
            <div key={h.id}>
              <p className="text-sm font-medium text-ink">
                {h.name}{" "}
                <span className="font-normal text-muted">
                  · {PILLAR_NAMES[h.pillar]} · {h.status === "live" ? "connected" : h.status === "mock" ? "mock for now" : "planned"}
                </span>
              </p>
              <p className="text-xs text-muted">
                {h.description} Refresh: {h.refresh.toLowerCase()}.
              </p>
            </div>
          ))}
        </div>
        <Link href="/data-hookups" className="mt-4 inline-block text-xs text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark">
          Technical detail for each source
        </Link>
      </Card>
    </div>
  );
}
