"use client";

import { Bar, BarChart, Cell, LabelList, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Wordmark } from "@/components/brand/wordmark";
import type { Chart, Preview } from "@/lib/deck/outline";
import { AVNET, VIZ } from "@/lib/colors";
import { cn } from "@/lib/utils";

// A slide as the exported deck draws it: the Avnet wordmark, the headline, the
// sentence, the chart and figures, and the source line. Shared by the Pitch Deck
// Builder, the deck tray's review page and the tray's printed PDF, so the three
// agree with each other and with the PowerPoint file.

const COLOR = { avnet: VIZ.avnet, arrow: VIZ.arrow, company: AVNET.grayDark, market: VIZ.benchmark } as const;

function fmt(format: Chart["format"], v: number): string {
  if (format === "pct") return `${v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1)}%`;
  return Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${Math.round(v / 1e6)}M`;
}

/** The slide's chart as the exported file draws it: bars for a comparison, columns or lines over time. */
export function PreviewChart({ c }: { c: Chart }) {
  const label = (v: unknown) => fmt(c.format, Number(v));
  const tick = { fontSize: 10, fill: "#6B7075" };
  if (c.kind === "bar") {
    const rows = c.series.map((s) => ({ name: s.name, value: s.points[0]?.value ?? 0, who: s.who }));
    return (
      <div className="h-24" role="img" aria-label={rows.map((r) => `${r.name} ${label(r.value)}`).join(", ")}>
        <p className="text-micro text-ink-muted">{c.series[0]?.points[0]?.label}</p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" width={44} tick={tick} axisLine={false} tickLine={false} />
            <Bar dataKey="value" barSize={12} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.name} fill={COLOR[r.who]} />
              ))}
              <LabelList dataKey="value" position="right" formatter={label} style={{ fontSize: 10, fill: "#000" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  // One row per period, one key per series, so several series share the axis.
  const rows = (c.series[0]?.points ?? []).map((p, i) => ({
    name: p.label,
    ...Object.fromEntries(c.series.map((s, k) => [`s${k}`, s.points[i]?.value])),
  }));
  const many = c.series.length > 1;
  const described = c.series.map((s) => `${s.name}: ${s.points.map((p) => `${p.label} ${label(p.value)}`).join(", ")}`).join("; ");
  return (
    <div className={many ? "h-36" : "h-32"} role="img" aria-label={described}>
      <ResponsiveContainer width="100%" height="100%">
        {c.kind === "line" ? (
          <LineChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: 16 }}>
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            {c.series.map((s, k) => (
              <Line key={s.name} dataKey={`s${k}`} name={s.name} stroke={COLOR[s.who]} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false}>
                {!many && <LabelList dataKey={`s${k}`} position="top" formatter={label} style={{ fontSize: 9, fill: "#000" }} />}
              </Line>
            ))}
            {many && <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />}
          </LineChart>
        ) : (
          <BarChart data={rows} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            {c.series.map((s, k) => (
              <Bar key={s.name} dataKey={`s${k}`} name={s.name} fill={COLOR[s.who]} isAnimationActive={false}>
                {!many && <LabelList dataKey={`s${k}`} position="top" formatter={label} style={{ fontSize: 9, fill: "#000" }} />}
              </Bar>
            ))}
            {many && <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function SlideBody({ p }: { p: Preview }) {
  // Column headers either name every column or only the value columns; line them up either way.
  const width = (p.facts?.[0]?.values.length ?? 0) + 1;
  const headers = p.columns ? (p.columns.length === width ? p.columns : ["", ...p.columns]) : undefined;
  return (
    <div className="mt-2 space-y-3">
      <p className="text-pretty font-display text-section-title leading-tight text-ink xl:text-[22px]">{p.headline}</p>
      {p.claude && (
        <p className="text-micro text-ink-muted">
          {p.claude.label}
          {p.claude.date ? `, ${p.claude.date}` : ""}
        </p>
      )}
      {p.text && <p className="max-w-[62ch] text-pretty text-body-sm text-ink">{p.text}</p>}
      {p.error && <p className="text-caption text-ink-muted">Some figures couldn&apos;t be loaded; they read n/a.</p>}
      <div className={cn(p.chart && p.facts?.length ? "grid grid-cols-[3fr_2fr] items-start gap-4" : "space-y-3")}>
        {p.chart && <PreviewChart c={p.chart} />}
        {p.facts && p.facts.length > 0 && (
          <table className="w-full max-w-md border-collapse text-caption">
            <caption className="sr-only">The figures on this slide{p.period ? `, ${p.period}` : ""}.</caption>
            {headers && (
              <thead>
                <tr className="border-b border-hairline">
                  {headers.map((c, i) => (
                    <th
                      key={`${c}-${i}`}
                      scope="col"
                      className={cn("py-1 font-display text-label font-normal uppercase text-ink-muted", i ? "text-right" : "text-left")}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-hairline">
              {p.facts.map((f) => (
                <tr key={f.label}>
                  <th scope="row" className="py-1 text-left font-normal text-ink-muted">
                    {f.label}
                  </th>
                  {f.values.map((v, i) => (
                    <td key={i} className="py-1 pl-3 text-right tabular-nums text-ink">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {p.groups && p.groups.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {p.groups.map((g) => (
            <div key={g.title}>
              <p className="font-display text-label uppercase text-ink-muted">{g.title}</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-micro text-ink">
                {g.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      {p.lines && p.lines.length > 0 && (
        <ul className="space-y-0.5 text-caption text-ink">
          {p.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The 16:9 slide: wordmark, body, then the source line with the mock tag and slide number. */
export function SlideFrame({
  p,
  fallbackSource,
  mock = false,
  number,
  className,
}: {
  p?: Preview;
  /** Shown as the source when there is no preview. */
  fallbackSource?: string;
  mock?: boolean;
  number?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex aspect-video flex-col border border-hairline bg-surface px-[5%] py-[4%]", className)}>
      <div className="flex justify-end">
        <Wordmark className="h-5" />
      </div>
      {p ? <SlideBody p={p} /> : <p className="mt-4 text-body-sm text-ink-muted">No preview for this slide.</p>}
      <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-hairline pt-2 text-caption text-ink-muted">
        <span>
          Source: {p?.source ?? fallbackSource}
          {p?.period ? `, ${p.period}` : ""}
          {mock && <span className="ml-1.5 bg-warning px-1 font-semibold text-ink">Mock data</span>}
        </span>
        <span className="tabular-nums">{number || ""}</span>
      </div>
    </div>
  );
}

/**
 * A small picture of a slide for lists: its first chart series as a plain SVG
 * line or columns, or a few text lines for a slide without a chart. Cheap enough
 * for every row of the tray.
 */
export function SlideThumb({ p, className }: { p: Preview; className?: string }) {
  const c = p.chart;
  const s = c?.series[0];
  const vals = s?.points.map((x) => x.value) ?? [];
  const max = Math.max(...vals.map(Math.abs), 0);
  const color = s ? COLOR[s.who] : AVNET.grayDark;
  // A comparison: each series' value as a horizontal bar, in its own colour.
  const bars = c?.kind === "bar" ? c.series.map((x) => ({ v: Math.abs(x.points[0]?.value ?? 0), fill: COLOR[x.who] })) : [];
  const barMax = Math.max(...bars.map((b) => b.v), 0);
  // Lines are scaled to their own range, so a small move still shows.
  const all = c?.kind === "line" ? c.series.flatMap((x) => x.points.map((pt) => pt.value)) : [];
  const lo = Math.min(...all);
  const span = Math.max(...all) - lo || 1;
  const y = (v: number) => 30 - ((v - lo) / span) * 22;
  return (
    <svg viewBox="0 0 64 36" aria-hidden className={cn("h-9 w-16 shrink-0 border border-hairline bg-surface", className)}>
      {!s || !max ? (
        [8, 14, 20, 26].map((y, i) => <rect key={y} x={6} y={y} width={i ? 40 - i * 6 : 30} height={2} fill={i ? "#D2D2D2" : "#919191"} />)
      ) : c!.kind === "bar" ? (
        bars.slice(0, 4).map((b, i, list) => {
          const h = Math.min(6, 24 / list.length - 2);
          return <rect key={i} x={6} y={6 + i * (h + 3)} width={barMax ? (b.v / barMax) * 50 : 0} height={h} fill={b.fill} />;
        })
      ) : c!.kind === "line" ? (
        c!.series.slice(0, 3).map((x) => (
          <polyline
            key={x.name}
            fill="none"
            stroke={COLOR[x.who]}
            strokeWidth={1.5}
            points={x.points.map((pt, i) => `${6 + (i * 52) / Math.max(x.points.length - 1, 1)},${y(pt.value)}`).join(" ")}
          />
        ))
      ) : (
        vals.map((v, i) => {
          const w = 52 / vals.length;
          const h = (Math.abs(v) / max) * 22;
          return <rect key={i} x={6 + i * w + w * 0.15} y={30 - h} width={w * 0.7} height={h} fill={color} />;
        })
      )}
    </svg>
  );
}
