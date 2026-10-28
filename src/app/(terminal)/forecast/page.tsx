import { getCycle } from "@/lib/data/live/cycle";
import { COMPANIES, isDemand } from "@/lib/data/live/earnings-model";
import { getForecast } from "@/lib/data/mock/forecast";
import { getAvnet } from "@/lib/avnet";
import type { SegmentInput } from "@/lib/scenario/model";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { ScenarioModeler, type RealityCheck } from "@/components/scenario/modeler";

// Scenario Modeler: where Avnet's mapped billings land if the market grows
// like the forecast and share moves as set. The maths is src/lib/scenario/model.ts
// over Avnet's data (src/lib/avnet); the reality check's reported growth is live
// from SEC filings. Step 3.4 swaps in WSTS, Gartner and the IP&E forecast.

export const dynamic = "force-dynamic";

/** The latest fiscal quarter and the 16 after it, e.g. FY27 Q1, FY27 Q2, ... */
function quartersAhead(latest: string, n: number): string[] {
  const m = latest.match(/^FY(\d+) Q(\d)$/);
  if (!m) return [];
  const start = Number(m[1]) * 4 + Number(m[2]) - 1;
  return Array.from({ length: n + 1 }, (_, i) => `FY${Math.floor((start + i) / 4)} Q${((start + i) % 4) + 1}`);
}

async function realityCheck(): Promise<RealityCheck> {
  const f = getForecast().value;
  const last = f.points.filter((p) => p.actual !== undefined).at(-1)!;
  const next = f.points.find((p) => p.year === last.year + 1);
  const base = {
    supplyCompanies: COMPANIES.filter((c) => !isDemand(c.cohort) && !c.foreign).length,
    wsts: next?.base !== undefined ? next.base / last.actual! - 1 : 0,
    wstsYear: last.year + 1,
  };
  try {
    const cycle = await getCycle();
    const at = (points: { label: string; growth?: number }[]) => points.find((p) => p.label === cycle.latest)?.growth;
    return { ...base, quarter: cycle.latest, avnet: at(cycle.avnet.points), arrow: at(cycle.arrow.points), supply: at(cycle.supply) };
  } catch {
    return { ...base, failed: true };
  }
}

export default async function ScenarioModelerPage() {
  const { segmentBillings, segmentForecast, forecastSpread, quarters } = await getAvnet();
  const segments: SegmentInput[] = segmentBillings.map((s) => ({
    segment: s.segment,
    market: s.market,
    share: s.share,
    billings: s.billings,
    forecast: segmentForecast[s.segment],
  }));
  return (
    <PageBody>
      <PageTitle title="Scenario Modeler" subtitle="What Avnet's billings come to if the market grows like the forecast and share moves like this" />
      <ScenarioModeler
        segments={segments}
        spread={forecastSpread}
        quarters={quartersAhead(quarters[quarters.length - 1], 16)}
        checks={realityCheck()}
      />
    </PageBody>
  );
}
