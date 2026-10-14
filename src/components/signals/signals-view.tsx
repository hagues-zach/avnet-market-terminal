import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  getSignals,
  GROUP_LABELS,
  GROUP_ORDER,
  monthChange,
  yearChange,
  type Signal,
  type SignalChange,
} from "@/lib/data/live/signals";
import { AVNET } from "@/lib/colors";
import { Card } from "@/components/ui/card";
import { GroupLines, type ChartRow } from "@/components/charts/cycle-charts";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

const DASH = "—";

function value(s: Signal): string {
  const v = s.points[s.points.length - 1]?.value;
  if (v === undefined) return DASH;
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

function changeText(c: SignalChange | undefined): string {
  if (!c) return DASH;
  const sign = c.value >= 0 ? "+" : "−";
  return c.inPoints ? `${sign}${Math.abs(c.value).toFixed(2)} pts` : `${sign}${(Math.abs(c.value) * 100).toFixed(1)}%`;
}

/** Green or red only where a direction is clearly good or bad for the supply chain; otherwise neutral. */
function tone(s: Signal, c: SignalChange | undefined): string {
  if (!c || s.upIsGood === null || Math.abs(c.value) < (c.inPoints ? 0.005 : 0.0005)) return "text-muted";
  return c.value > 0 === s.upIsGood ? "text-avnet-greenDark" : "text-danger";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-08" → "Aug 2026"; "2026-10-09" → "Oct 9, 2026". */
function when(date: string): string {
  const [y, m, d] = date.split("-");
  return d ? `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}` : `${MONTHS[Number(m) - 1]} ${y}`;
}
const shortMonth = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(2, 4)}`;

function Tile({ signal, label, period }: { signal: Signal | undefined; label: string; period: "month" | "year" }) {
  const c = signal ? (period === "year" ? yearChange(signal) : monthChange(signal)) : undefined;
  const Arrow = (c?.value ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
  const last = signal?.points[signal.points.length - 1];
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <span className="font-display text-2xs uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1.5 font-display text-2xl tabular text-ink">{signal ? value(signal) : DASH}</div>
      <div className="mt-1 text-xs text-muted">
        {signal && c && (
          <span className={cn("mr-1 inline-flex items-center gap-0.5 tabular", tone(signal, c))}>
            <Arrow className="h-3.5 w-3.5" />
            {changeText(c).slice(1)}
          </span>
        )}
        {last ? `${period === "year" ? "YoY" : "1 mo"} · ${when(last.date)}` : "Unavailable"}
      </div>
    </div>
  );
}

/** Server component: five outside sources, so the page streams it in. */
export async function SignalsView() {
  const { signals, failed } = await getSignals();
  const by = (key: string) => signals.find((s) => s.key === key);

  if (!signals.length) {
    return (
      <Card>
        <p className="py-10 text-center text-sm text-muted">None of the public data sources could be reached right now.</p>
      </Card>
    );
  }

  // Production series rebased to a common start so growth compares on one axis.
  const production = [
    { signal: by("ip-semis"), name: "Semiconductors and components" },
    { signal: by("ip-electronics"), name: "Computer and electronic products" },
    { signal: by("ip-total"), name: "All industry" },
  ].filter((p): p is { signal: Signal; name: string } => Boolean(p.signal));
  const months = production[0]?.signal.points.map((p) => p.date) ?? [];
  const productionRows: ChartRow[] = months.map((date) => {
    const row: ChartRow = { label: shortMonth(date) };
    for (const { signal, name } of production) {
      const base = signal.points.find((p) => p.date === months[0])?.value;
      const now = signal.points.find((p) => p.date === date)?.value;
      if (base && now !== undefined) row[name] = (now / base) * 100;
    }
    return row;
  });
  const util = by("util-semis");
  const utilRows: ChartRow[] = (util?.points ?? []).map((p) => ({ label: shortMonth(p.date), "Capacity utilization": p.value }));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <Tile signal={by("ip-semis")} label="Semiconductor production" period="year" />
        <Tile signal={util} label="Capacity utilization" period="year" />
        <Tile signal={by("PCU334413334413")} label="Semiconductor prices" period="year" />
        <Tile signal={by("imf-PCOPP")} label="Copper, $ per tonne" period="year" />
        <Tile signal={by("ust-10y")} label="10-year Treasury" period="month" />
        <Tile signal={by("fed-funds")} label="Federal funds rate" period="year" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="US production" subtitle={months.length ? `Rebased to 100 at ${when(months[0])} · Federal Reserve G.17` : "Federal Reserve G.17"}>
          <GroupLines rows={productionRows} series={production.map((p) => p.name)} unit="index" />
        </Card>
        <Card title="Capacity utilization" subtitle="Semiconductors and electronic components, percent of capacity · Federal Reserve G.17">
          <GroupLines rows={utilRows} series={["Capacity utilization"]} unit="level" />
        </Card>
      </div>

      {GROUP_ORDER.map((group) => {
        const rows = signals.filter((s) => s.group === group);
        if (!rows.length) return null;
        return (
          <Card key={group} title={GROUP_LABELS[group]} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                    <th scope="col" className="px-4 py-2 text-left font-normal">
                      Indicator
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      Latest
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      1 month
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      1 year
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-normal">
                      Trend
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-normal">
                      As of · source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const m = monthChange(s);
                    const y = yearChange(s);
                    const last = s.points[s.points.length - 1];
                    return (
                      <tr key={s.key} className="border-b border-line last:border-b-0 hover:bg-canvas">
                        <th scope="row" className="px-4 py-1.5 text-left font-normal">
                          <span className="font-medium text-ink">{s.label}</span>
                          <span className="block text-2xs text-muted">{s.detail}</span>
                        </th>
                        <td className="px-3 py-1.5 text-right tabular text-ink">{value(s)}</td>
                        <td className={cn("px-3 py-1.5 text-right tabular", tone(s, m))}>{changeText(m)}</td>
                        <td className={cn("px-3 py-1.5 text-right tabular", tone(s, y))}>{changeText(y)}</td>
                        <td className="px-3 py-1.5">
                          <Sparkline data={s.points.map((p) => p.value)} color={AVNET.blueDark} width={120} height={24} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-left text-muted">
                          {last ? when(last.date) : DASH} · {s.source}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      <p className="px-1 text-2xs text-muted">
        All series are public and read without an API key: Federal Reserve G.17 (production and utilization), Bureau of Labor
        Statistics (producer prices and employment), IMF Primary Commodity Prices (metals, monthly averages), US Treasury and the
        Federal Reserve Bank of New York (rates), and European Central Bank reference rates. Monthly series show the last three
        years and daily series about the last year. Changes for rates and utilization are in percentage points; everything else
        is a percent change. Green and red are used only where a rise is clearly good or bad for the supply chain. Recent months
        are preliminary and get revised. Checked about every 6 hours.
        {failed.length > 0 && ` Not responding: ${failed.join(", ")}.`}
      </p>
    </>
  );
}

export function SignalsFallback() {
  return (
    <Card title="Reading public data" subtitle="Federal Reserve, Bureau of Labor Statistics, IMF, Treasury and ECB.">
      <div className="space-y-2" role="status" aria-label="Loading economic signals">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-canvas" />
        ))}
      </div>
    </Card>
  );
}
