import { AVNET } from "@/lib/colors";
import { Sparkline } from "./sparkline";

// Book-to-bill is healthy at >= 1.0 (orders outpacing billings). The gauge centers
// the 1.0 threshold so above/below reads instantly.
export function BookToBillGauge({ value, trend }: { value: number; trend: number[] }) {
  const min = 0.85;
  const max = 1.2;
  const clamp = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const pct = clamp(value);
  const onePct = clamp(1.0);
  const good = value >= 1.0;
  const color = good ? AVNET.green : AVNET.danger;

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl tabular" style={{ color }}>
          {value.toFixed(2)}
        </span>
        <span className="text-2xs uppercase tracking-wider text-muted">
          {good ? "orders > billings" : "orders < billings"}
        </span>
      </div>

      <div className="relative mt-3 h-2.5 rounded-full bg-canvas">
        {/* fill from the 1.0 line out to the value */}
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            left: `${Math.min(pct, onePct) * 100}%`,
            width: `${Math.abs(pct - onePct) * 100}%`,
            background: color,
          }}
        />
        {/* 1.0 threshold marker */}
        <div className="absolute -top-1 h-4.5 w-px bg-ink" style={{ left: `${onePct * 100}%`, height: "1.1rem" }} />
        {/* value marker */}
        <div
          className="absolute -top-0.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white shadow-card"
          style={{ left: `${pct * 100}%`, background: color }}
        />
      </div>
      <div className="mt-1 flex justify-between text-2xs text-gray-medium">
        <span>0.85</span>
        <span className="text-ink">1.00</span>
        <span>1.20</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Sparkline data={trend} color={color} width={120} height={28} />
        <span className="text-2xs text-muted">6-quarter trend</span>
      </div>
    </div>
  );
}
