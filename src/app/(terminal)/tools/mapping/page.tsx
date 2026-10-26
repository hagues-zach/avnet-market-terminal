import Link from "next/link";
import { getAvnet } from "@/lib/avnet";
import { categoryPath, coverage, lead, summarise, weakest } from "@/lib/mapping/read";
import { PageBody } from "@/components/layout/page-body";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageTitle } from "@/components/ui/page-title";
import { Panel } from "@/components/ui/panel";
import { MappingWorkbench } from "@/components/mapping/workbench";
import { cn } from "@/lib/utils";

// Code Mapping: how Avnet's product codes map to WSTS, Gartner and IP&E
// forecast categories. All mock until the code map and material master are
// hooked up; the actions to accept, edit and reject arrive in step 3.5.

// Rendered per request: the code map comes from the data layer, never baked into the build.
export const dynamic = "force-dynamic";

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${Math.round(v)}M`);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const ago = (d: number) => (d === 1 ? "1 day ago" : `${d} days ago`);
const link = "text-ink underline-offset-2 hover:underline";
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

const HARD = [
  { title: "Granularity", body: "External categories can be broader or narrower than Avnet's codes, so one side has to be split or rolled up." },
  { title: "Many-to-many", body: "One external category can span several Avnet codes, and one code can feed several categories." },
  { title: "Regional hierarchies", body: "The Americas and EMEA use technology codes; APAC and Farnell use the PCC hierarchy." },
  { title: "Drift", body: "Both classifications change over time, so every mapping is versioned and dated." },
];

export default async function CodeMappingPage() {
  const avnet = await getAvnet();
  const s = summarise(avnet.mappings);
  const cov = coverage(avnet.mappings, avnet.segments);
  const weak = weakest(cov);
  const share = s.validated / s.categories;
  const monthAgo = avnet.validatedMonthAgo / s.categories;
  const pts = Math.round((share - monthAgo) * 100);
  const confidence = Object.fromEntries(avnet.segmentBillings.map((x) => [x.segment, x.confidence]));
  const changes = avnet.mappings.flatMap((m) => m.history.filter((h) => h.event !== "Suggested").map((h) => ({ ...h, m })))
    .sort((a, b) => a.daysAgo - b.daysAgo)
    .slice(0, 6);

  return (
    <PageBody>
      <PageTitle title="Code Mapping" subtitle="How Avnet's product codes map to WSTS, Gartner and IP&E market categories, and what needs review" />

      <section aria-labelledby="mapping-lead" className="space-y-3">
        <h2 id="mapping-lead" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pretty text-xl leading-snug text-ink">
          <span>{lead(avnet.mappedShare, s)}</span>
          <DataChip status={avnet.status} />
        </h2>
        <HookupMarker ids={["code-map", "material-master"]} />
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile label="Billings mapped" value={pct(avnet.mappedShare)} note={`${money(avnet.mappedBillings)} of billings`} source={{ status: avnet.status }} />
        <KpiTile
          label="Validated categories"
          value={`${s.validated} of ${s.categories}`}
          note={pct(share)}
          delta={{ value: pts, display: `${Math.abs(pts)} pts`, period: "this month" }}
          source={{ status: avnet.status }}
        />
        <KpiTile label="Awaiting review" value={String(s.review)} note={`${money(s.reviewBillings)} of billings`} source={{ status: avnet.status }} />
        <KpiTile label="Not mapped" value={String(s.unmapped)} note="with no Avnet code" source={{ status: avnet.status }} />
      </div>

      <MappingWorkbench mappings={avnet.mappings} coverage={cov} confidence={confidence} semi={[...avnet.semiSegments]} />

      <p className="-mt-2 flex flex-wrap gap-x-3 text-caption text-ink-muted">
        <span>
          {weak.segment} has the smallest share of billings on validated mappings ({pct(weak.validatedShare)}), so its market share is the least
          certain.
        </span>
        <Link href="/market-share" className={cn(link, "ml-auto")}>
          Market Share by segment
        </Link>
      </p>

      <div className="grid items-start gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <Panel
          className="xl:col-span-7"
          title="Recent changes"
          subtitle="Newest first. Validators are shown by role"
          actions={<DataChip status={avnet.status} />}
          bodyClassName="p-0"
        >
          <table className="w-full border-collapse font-body text-table">
            <caption className="sr-only">Recent changes to the code map. Mock data.</caption>
            <thead className="bg-surface-sunken">
              <tr className="border-b border-hairline">
                <th scope="col" className={cn(TH, "text-left")}>
                  When
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Mapping
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Change
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  By
                </th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={i} className="border-b border-hairline last:border-b-0">
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-ink-muted">{ago(c.daysAgo)}</td>
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                    {categoryPath(c.m)}
                  </th>
                  <td className="whitespace-nowrap px-3 py-1.5 text-ink">{c.event}</td>
                  <td className="px-3 py-1.5 text-ink-muted">{c.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel className="xl:col-span-5" title="Why mapping is hard" subtitle="PRD section 6.3">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {HARD.map((h) => (
              <div key={h.title}>
                <dt className="text-body-strong text-ink">{h.title}</dt>
                <dd className="mt-0.5 text-body-sm text-ink-muted">{h.body}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <p className="text-caption text-ink-muted">
        Everything on this page is mock until the code map (gold.market_intelligence.gartner_avnet_code_map) and the material master are hooked up.
        Category names are the public WSTS, Gartner and IP&amp;E forecast taxonomies; codes, billings, reasons and history are synthetic. Billings are
        the last 12 months through each mapping and add up to the {pct(avnet.mappedShare)} of billings the map covers, the same figure Market Share and the
        TAM, SAM and SOM page use. The queue puts the most billings at stake first, then the lowest confidence. Once step 3.5 is built, Claude
        suggests mappings with its reasons and product managers accept, edit or reject them, and every change is kept.
      </p>
    </PageBody>
  );
}
