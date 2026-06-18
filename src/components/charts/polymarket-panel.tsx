import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVNET } from "@/lib/colors";
import { formatNumber } from "@/lib/utils";
import type { PolymarketOdds } from "@/lib/data/types";

// Market-implied probabilities from Polymarket — forward-looking signals a semi
// analyst cares about (rates, recession, AI capex, the $1T-sales market).
export function PolymarketPanel({ markets }: { markets: PolymarketOdds[] }) {
  return (
    <ul className="space-y-3">
      {markets.map((m) => {
        const up = m.movePct >= 0;
        const Arrow = up ? ArrowUpRight : ArrowDownRight;
        const pct = Math.round(m.prob * 100);
        return (
          <li key={m.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="rounded border border-line px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider text-muted">
                    {m.category}
                  </span>
                  <span className="text-2xs text-gray-medium">${formatNumber(m.volumeUsd, { compact: true })} vol · closes {m.closes}</span>
                </span>
                <p className="mt-1 text-sm text-ink">{m.question}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-xl tabular text-ink">{pct}%</div>
                <div className={cn("inline-flex items-center text-2xs tabular", up ? "text-avnet-greenDark" : "text-danger")}>
                  <Arrow className="h-3 w-3" />
                  {Math.abs(m.movePct * 100).toFixed(0)} pt wk
                </div>
              </div>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: AVNET.blueDark }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
