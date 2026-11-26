import { getPeerRows } from "@/lib/data/live/earnings";
import { COHORT_LABELS, US_FILERS, comparability, comparableValue, isUsFiler, type Cohort, type Metric, type Quarter } from "@/lib/data/live/earnings-model";
import { groupMedian, groupOf } from "@/lib/earnings/season";
import { Panel, SourceLine } from "@/components/ui/panel";
import { GroupPicker } from "./group-picker";
import { GroupTable, type GroupRow } from "./group-table";
import { format } from "./format";
import { tableSlide } from "@/lib/deck/slides";

const MEDIAN_METRICS = ["revenueYoY", "grossMargin", "operatingMargin", "inventoryDays", "fcfMargin"] as const;
const CAVEAT_METRICS = ["revenue", "revenueYoY", "grossMargin", "operatingMargin", "inventoryDays", "fcfMargin"] as const;

/** Every company's latest quarter in a group, as table rows: figures that don't compare are dropped, the rest carry their caveat. */
export async function peerRows(group: Cohort | "all"): Promise<{ rows: GroupRow[]; median: Partial<Record<keyof Quarter["values"], number>> }> {
  // US filers only for the MVP; the foreign reporters return with Europe and Asia on the roadmap.
  const all = (await getPeerRows()).filter((r) => isUsFiler(r.company));
  const peers = groupOf(all, group);
  const median = Object.fromEntries(MEDIAN_METRICS.map((m) => [m, groupMedian(peers, m)]));
  const rows = peers.map((r) => ({
    slug: r.company.slug,
    name: r.company.name,
    group: COHORT_LABELS[r.company.cohort],
    latest: r.latest && {
      ...r.latest,
      values: Object.fromEntries(Object.entries(r.latest.values).map(([m, v]) => [m, comparableValue(r.company, m as Metric, v)])) as Quarter["values"],
    },
    caveats: Object.fromEntries(
      CAVEAT_METRICS.flatMap((m) => {
        const c = comparability(r.company, m);
        return c?.level === "caveat" ? [[m, c.reason]] : [];
      }),
    ),
  }));
  return { rows, median };
}

/** The slide a peer table makes: the largest sixteen companies by revenue, each on its latest quarter. */
export function peersSlide(key: string, title: string, rows: GroupRow[], median: Partial<Record<keyof Quarter["values"], number>>) {
  return tableSlide({
    key,
    title,
    text: `Each company on its most recent filed quarter, largest first. Median revenue growth ${format("growth", median.revenueYoY)}, operating margin ${format("pct", median.operatingMargin)}.`,
    columns: ["Company", "Quarter", "Revenue", "Growth YoY", "Gross margin", "Op margin", "Inv days"],
    rows: [...rows]
      .sort((a, b) => (b.latest?.values.revenue ?? -Infinity) - (a.latest?.values.revenue ?? -Infinity))
      .map((r) => ({
        label: r.name,
        values: [
          r.latest?.fiscalLabel ?? "n/a",
          format("usd", r.latest?.values.revenue),
          format("growth", r.latest?.values.revenueYoY),
          format("pct", r.latest?.values.grossMargin),
          format("pct", r.latest?.values.operatingMargin),
          format("days", r.latest?.values.inventoryDays),
        ],
      })),
    source: "SEC filings, GAAP as reported",
  });
}

/** The profile's Peers section: the company against its group (or another, or all), each on its latest filed quarter. */
export async function PeerSection({ company, own, group }: { company: string; own: Cohort; group: Cohort | "all" }) {
  const { rows, median } = await peerRows(group);
  return (
    <Panel
      title={group === "all" ? `All ${US_FILERS.length} companies, latest quarter` : `${COHORT_LABELS[group]}, latest quarter`}
      subtitle="Each company on its most recent filed quarter. Select a column to sort, a company to open its profile"
      actions={<GroupPicker own={own} group={group} />}
      bodyClassName="p-0"
      footer={<SourceLine source="SEC filings, GAAP as reported" />}
      deck={peersSlide(`profile:${company}:peers-${group}`, group === "all" ? "Every company, latest quarter" : `${COHORT_LABELS[group]}, latest quarter`, rows, median)}
    >
      <GroupTable rows={rows} current={company} showGroup={group === "all"} median={median} />
    </Panel>
  );
}
