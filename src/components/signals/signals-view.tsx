import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { getSignals, GROUP_LABELS, GROUP_ORDER, monthChange, yearChange, type Signal, type SignalChange } from "@/lib/data/live/signals";
import { COST_KEYS, DEMAND_KEYS, DOLLAR_KEYS, readsOf, sentence, SHORT, type Changes, type Way } from "@/lib/signals/read";
import { VIZ } from "@/lib/colors";
import { DataChip } from "@/components/ui/chip";
import { Panel, SourceLine } from "@/components/ui/panel";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { SignalLines, type Row } from "./charts";
import { IndicatorTabs, type Change, type IndicatorGroup } from "./indicators";
import { cn } from "@/lib/utils";

// Economic Signals: the read in words, four read tiles, production and
// utilisation, then every indicator by group. All live, from five public sources.

function value(s: Signal): string {
  const v = s.points[s.points.length - 1]?.value;
  if (v === undefined) return "n/a";
  switch (s.unit) {
    case "percent":
      return `${v.toFixed(2)}%`;
    case "usd":
      return `$${Math.round(v).toLocaleString("en-US")}`;
    case "thousands":
      return `${v.toFixed(1)}K`;
    case "fx":
      return v >= 100 ? v.toFixed(1) : v.toFixed(4);
    case "index":
      return v.toFixed(1);
  }
}

/** A change for display: signed, with green or red only where a rise is clearly good or bad. */
function change(s: Signal, c: SignalChange | undefined): Change | undefined {
  if (!c) return undefined;
  const flat = Math.abs(c.value) < (c.inPoints ? 0.005 : 0.0005);
  const text = c.inPoints
    ? `${c.value >= 0 ? "+" : "−"}${Math.abs(c.value).toFixed(2)} pts`
    : `${c.value >= 0 ? "+" : "−"}${(Math.abs(c.value) * 100).toFixed(1)}%`;
  const tone = s.upIsGood === null ? "neutral" : c.value > 0 === s.upIsGood ? "good" : "bad";
  return { text, sign: flat ? 0 : c.value > 0 ? 1 : -1, tone };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-08" → "Aug 2026"; "2026-10-09" → "Oct 9, 2026". */
function when(date: string): string {
  const [y, m, d] = date.split("-");
  return d ? `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}` : `${MONTHS[Number(m) - 1]} ${y}`;
}
const shortMonth = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(2, 4)}`;
// Shorter names where the tiles are narrow (1280px).
const TILE: Record<string, string> = {
  "ip-semis": "Chip production",
  "ip-electronics": "Electronics",
  "ust-10y": "10-year",
  "fed-funds": "Fed funds",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const WAY_ARROW: Record<Way, typeof ArrowUp> = { up: ArrowUp, down: ArrowDown, flat: ArrowRight };

function ChangeText({ c }: { c?: Change }) {
  if (!c) return <span className="text-ink-muted">n/a</span>;
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        c.sign === 0 ? "text-ink-muted" : c.tone === "good" ? "text-positive" : c.tone === "bad" ? "text-negative" : "text-ink",
      )}
    >
      {c.text}
    </span>
  );
}

/** One read: the verdict word with an arrow in ink, then the series behind it. */
function ReadTile({
  label,
  verdict,
  way,
  items,
  source,
}: {
  label: string;
  verdict?: string;
  way?: Way;
  items: { key: string; name: string; latest?: string; change?: Change }[];
  source: string;
}) {
  const Arrow = way ? WAY_ARROW[way] : ArrowRight;
  return (
    <section aria-label={label} className="flex min-w-0 flex-col rounded-sm border border-hairline bg-surface px-4 py-3">
      <h3 className="font-display text-label uppercase text-ink-muted">{label}</h3>
      {verdict ? (
        <p className="mt-1 inline-flex items-center gap-1 font-display text-figure text-ink">
          {verdict}
          <Arrow className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </p>
      ) : (
        <p className="mt-1 font-display text-figure text-ink-muted">Not available</p>
      )}
      <ul className="mt-2 flex-1 space-y-1 text-body-sm">
        {items.map((it) => (
          <li key={it.key} className="flex items-baseline justify-between gap-3">
            <span className="truncate text-ink-muted">{it.name}</span>
            <span className="flex items-baseline gap-2">
              {it.latest && <span className="tabular-nums text-ink">{it.latest}</span>}
              <ChangeText c={it.change} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-hairline pt-2 text-caption text-ink-muted">Source: {source}. Change on a year ago.</p>
    </section>
  );
}

/** Server component: five outside sources, so the page streams it in. */
export async function SignalsView() {
  const { signals, failed } = await getSignals();
  const by = (key: string) => signals.find((s) => s.key === key);

  if (!signals.length) {
    return (
      <Panel title="Economic signals">
        <ErrorState
          title="None of the public data sources could be reached"
          source="Federal Reserve, Bureau of Labor Statistics, IMF, US Treasury, New York Fed, European Central Bank"
          detail="Try again in a few minutes."
          retryHref="/signals"
        />
      </Panel>
    );
  }

  const changes: Changes = Object.fromEntries(signals.map((s) => [s.key, yearChange(s)?.value]));
  const reads = readsOf(changes);
  const lead = sentence(changes, reads);
  const yearOf = (key: string) => {
    const s = by(key);
    return s ? change(s, yearChange(s)) : undefined;
  };
  const costItems = COST_KEYS.filter((k) => changes[k] !== undefined)
    .sort((a, b) => Math.abs(changes[b]!) - Math.abs(changes[a]!))
    .slice(0, 4)
    .map((k) => ({ key: k, name: cap(SHORT[k]), change: yearOf(k) }));

  // Production series rebased to their first month so growth compares on one axis.
  const production = [
    { key: "ip-semis", name: "Semiconductors", color: VIZ.arrow },
    { key: "ip-electronics", name: "Electronics", color: VIZ.orange },
    { key: "ip-total", name: "All industry", color: VIZ.blueLight, light: true },
  ].filter((p) => by(p.key));
  const months = by(production[0]?.key ?? "")?.points.map((p) => p.date) ?? [];
  const productionRows: Row[] = months.map((date) => {
    const row: Row = { label: shortMonth(date) };
    for (const p of production) {
      const pts = by(p.key)!.points;
      const base = pts.find((x) => x.date === months[0])?.value;
      const now = pts.find((x) => x.date === date)?.value;
      if (base && now !== undefined) row[p.key] = (now / base) * 100;
    }
    return row;
  });
  const util = by("util-semis");
  const utilRows: Row[] = (util?.points ?? []).map((p) => ({ label: shortMonth(p.date), util: p.value }));

  const groups: IndicatorGroup[] = GROUP_ORDER.map((g) => ({
    id: g,
    label: GROUP_LABELS[g],
    rows: signals
      .filter((s) => s.group === g)
      .map((s) => {
        const last = s.points[s.points.length - 1];
        return {
          key: s.key,
          label: s.label,
          detail: s.detail,
          latest: value(s),
          month: change(s, monthChange(s)),
          year: change(s, yearChange(s)),
          spark: s.points.map((p) => p.value),
          asOf: last ? when(last.date) : "n/a",
          source: s.source,
        };
      }),
  })).filter((g) => g.rows.length);

  const tenYear = by("ust-10y");
  const funds = by("fed-funds");

  return (
    <>
      <section aria-labelledby="signals-lead">
        <h2 id="signals-lead" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pretty text-xl leading-snug text-ink">
          <span>{lead || "The public data sources haven't returned enough to read yet."}</span>
          <DataChip status="live" />
        </h2>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReadTile
          label="Demand"
          verdict={reads.demand?.verdict}
          way={reads.demand?.way}
          items={DEMAND_KEYS.map((k) => ({ key: k, name: TILE[k] ?? SHORT[k], change: yearOf(k) }))}
          source="Federal Reserve G.17"
        />
        <ReadTile label="Costs" verdict={reads.costs?.verdict} way={reads.costs?.way} items={costItems} source="BLS producer prices, IMF metals" />
        <ReadTile
          label="Financing"
          verdict={reads.financing?.verdict}
          way={reads.financing?.way}
          items={[
            { key: "ust-10y", name: TILE["ust-10y"], latest: tenYear ? value(tenYear) : undefined, change: yearOf("ust-10y") },
            { key: "fed-funds", name: TILE["fed-funds"], latest: funds ? value(funds) : undefined, change: yearOf("fed-funds") },
          ]}
          source="US Treasury, New York Fed"
        />
        <ReadTile
          label="Dollar"
          verdict={reads.dollar?.verdict}
          way={reads.dollar?.way}
          items={DOLLAR_KEYS.map((k) => ({ key: k, name: `${SHORT[k]} per dollar`, change: yearOf(k) }))}
          source="European Central Bank"
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Panel
          title="US production"
          subtitle={months.length ? `Industrial production, each series rebased to 100 at ${when(months[0])}` : undefined}
          footer={
            <SourceLine source="Federal Reserve G.17, seasonally adjusted" asOf={months.length ? when(months[months.length - 1]) : undefined} />
          }
        >
          <SignalLines rows={productionRows} series={production} format="index" />
        </Panel>
        <Panel
          title="Capacity utilization"
          subtitle="Semiconductors and electronic components, percent of capacity"
          footer={
            <>
              <SourceLine source="Federal Reserve G.17" asOf={util?.points.length ? when(util.points[util.points.length - 1].date) : undefined} />
              <Link href="/supply-chain" className="ml-auto text-ink underline-offset-2 hover:underline">
                Supply read on Supply Chain
              </Link>
            </>
          }
        >
          <SignalLines rows={utilRows} series={[{ key: "util", name: "Utilization", color: VIZ.arrow }]} format="percent" />
        </Panel>
      </div>

      <Panel title="All indicators" subtitle="Latest value and change on a month and a year ago, by group" bodyClassName="p-0">
        <IndicatorTabs groups={groups} />
      </Panel>

      <nav aria-label="Related pages" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm">
        <span className="font-display text-label uppercase text-ink-muted">Related</span>
        <Link href="/cycle" className="text-ink underline-offset-2 hover:underline">
          Market Cycle
        </Link>
        <Link href="/supply-chain" className="text-ink underline-offset-2 hover:underline">
          Supply Chain
        </Link>
        <Link href="/customers" className="text-ink underline-offset-2 hover:underline">
          Customers &amp; End Markets
        </Link>
        <Link href="/news" className="text-ink underline-offset-2 hover:underline">
          Market News
        </Link>
      </nav>

      <p className="text-caption text-ink-muted">
        All series are public and read without an API key: Federal Reserve G.17 (production and utilization), Bureau of Labor Statistics (producer
        prices and employment), IMF primary commodity prices (metals, monthly averages), US Treasury and the Federal Reserve Bank of New York (rates),
        and European Central Bank reference rates (currency). The reads compare each series with a year ago. Demand grows when two or more production
        series are up more than 2% and none is down that much. Costs rise when more than half of the producer prices and metals are up more than 2%.
        Financing is tighter when the 10-year yield is up more than 0.25 points. The dollar is stronger when the four currencies average more than 2%
        more per dollar. Green and red are used only where a rise is clearly good or bad for the supply chain. Recent months are preliminary and get
        revised. Checked about every six hours.
        {failed.length > 0 && ` Not responding: ${failed.join(", ")}.`}
      </p>
    </>
  );
}

export function SignalsFallback() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["Demand", "Costs", "Financing", "Dollar"].map((t) => (
          <Panel key={t} title={t}>
            <LoadingBlock label={`Loading ${t.toLowerCase()}…`} lines={3} />
          </Panel>
        ))}
      </div>
      <Panel title="Reading public data">
        <LoadingBlock label="Loading economic signals…" lines={8} />
      </Panel>
    </>
  );
}
