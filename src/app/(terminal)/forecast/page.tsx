"use client";

import { useState } from "react";
import { dataProvider } from "@/lib/data/provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { FanChart } from "@/components/charts/fan-chart";
import { VintageBars } from "@/components/charts/vintage-bars";
import { cn } from "@/lib/utils";
import { formatUsdMillions, formatPctSigned } from "@/lib/format";
import { formatPct } from "@/lib/utils";
import { AVNET } from "@/lib/colors";
import type { Scenario } from "@/lib/data/types";

const SCEN_COLOR: Record<Scenario, string> = { base: AVNET.blueDark, bull: AVNET.greenDark, bear: AVNET.danger };
const ORDER: Scenario[] = ["bull", "base", "bear"];

export default function ForecastPage() {
  const { value: f } = dataProvider.getForecast();
  const [scenario, setScenario] = useState<Scenario>("base");

  const p2026 = f.points.find((p) => p.year === 2026)!;

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Forecast & Scenario" subtitle="WSTS forecast with confidence band, scenarios & vintage revisions" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="2026 Base" value={formatUsdMillions(p2026.base!, { precise: true })} delta={p2026.base! / 772_200 - 1} deltaLabel="vs 2025" source="wsts" />
        <KpiCard label="2026 Bull" value={formatUsdMillions(p2026.bull!, { precise: true })} source="mock" />
        <KpiCard label="2026 Bear" value={formatUsdMillions(p2026.bear!, { precise: true })} source="mock" />
        <KpiCard label="2028 Base" value={formatUsdMillions(f.scenarios.base.value2028, { precise: true })} source="mock" />
        <KpiCard label="CAGR '25–'28" value={formatPct(f.cagrBase)} source="mock" />
      </div>

      {/* fan chart with scenario toggle */}
      <Card
        title="Market Forecast"
        subtitle="Actuals (solid) → forecast (dashed) with confidence band · 2027–28 modeled"
        source="wsts"
        actions={
          <div className="flex items-center gap-1">
            {ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScenario(s)}
                className={cn(
                  "rounded px-2.5 py-1 font-display text-2xs uppercase tracking-wider transition-colors duration-200 cursor-pointer",
                  scenario === s ? "bg-ink text-white" : "text-muted hover:bg-canvas",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        }
      >
        <FanChart points={f.points} scenario={scenario} />
      </Card>

      {/* vintage revisions + scenario table */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="2026 Forecast — Revision History" subtitle="How WSTS revised the 2026 number each release (kept rising)" source="wsts">
          <VintageBars data={f.vintages} />
        </Card>
        <Card className="lg:col-span-2" title="Scenarios to 2028" subtitle="Modeled bull / base / bear" source="mock">
          <table className="w-full border-collapse text-sm tabular">
            <thead>
              <tr className="border-b border-line text-left font-display text-2xs uppercase tracking-wider text-muted">
                <th className="py-2 font-normal">Scenario</th>
                <th className="py-2 text-right font-normal">2028</th>
                <th className="py-2 text-right font-normal">CAGR</th>
              </tr>
            </thead>
            <tbody>
              {ORDER.map((s) => (
                <tr key={s} className="border-b border-line/70 last:border-0">
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: SCEN_COLOR[s] }} />
                      <span className="text-ink">{f.scenarios[s].label}</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-ink">{formatUsdMillions(f.scenarios[s].value2028, { precise: true })}</td>
                  <td className="py-2.5 text-right" style={{ color: SCEN_COLOR[s] }}>{formatPctSigned(f.scenarios[s].cagr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-2xs text-muted">
            Sensitivity sliders (demand, ASP, inventory) wire in a later phase. 2027–28 are modeled extrapolations beyond
            the current WSTS horizon.
          </p>
        </Card>
      </div>
    </div>
  );
}
