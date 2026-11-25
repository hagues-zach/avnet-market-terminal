"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AREA, chartTitle, planSlide, SIDE, SLIDE, type Callout, type SlidePlan } from "@/lib/deck/layout";
import type { Chart, Preview } from "@/lib/deck/outline";
import { AVNET, VIZ } from "@/lib/colors";
import { cn } from "@/lib/utils";

// A slide as the exported deck draws it, at any size: a scaled copy of the
// Avnet FY27 template's 10 by 5.625 inch slide (the logo tab, Arial, the title
// with its thin green rule), laid out by planSlide (src/lib/deck/layout.ts), the
// same plan the PowerPoint file follows. Shared by the Pitch Deck Builder, the
// deck tray's review page and the tray's printed PDF.
//
// Sizes are in inches and points of the real slide. The frame is a size
// container, so 1 inch is 10cqw; the charts, drawn in pixels, scale by the
// frame's measured width.

const inch = (n: number) => `${n * 10}cqw`;
const pt = (n: number) => `${(n * 10) / 72}cqw`;
const ARIAL = "Arial, Helvetica, sans-serif";
const INK = "#000000";
const MUTED = "#6B7075";
const LINE = "#E3E5E8";
const PANEL = "#F4F5F6";
const COLOR = { avnet: VIZ.avnet, arrow: VIZ.arrow, company: AVNET.grayDark, market: VIZ.benchmark } as const;

/** Pixels per point at the frame's current width (a 10 inch slide at 96 dpi is 960 px). */
const ScaleContext = createContext(1);
const usePx = () => {
  const scale = useContext(ScaleContext);
  return (points: number) => points * (96 / 72) * scale;
};

/** A value as the chart writes it. `decimals` sets a percentage's places, for axis ticks on a narrow range. */
function fmt(format: Chart["format"], v: number, decimals = 1): string {
  if (format === "pct") return `${v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(decimals)}%`;
  const a = Math.abs(v);
  const s = a >= 1e9 ? `$${(a / 1e9).toFixed(2)}B` : `$${Math.round(a / 1e6)}M`;
  return v < 0 ? `−${s}` : s;
}

/* ---------- The chart ---------- */

/** The slide's chart, filling its box: labelled values, or a light value axis when lines would collide. */
export function PreviewChart({ c, plan }: { c: Chart; plan?: Pick<SlidePlan, "labels" | "range"> }) {
  const px = usePx();
  const labels = plan?.labels ?? true;
  const label = (v: unknown) => fmt(c.format, Number(v));
  const tick = { fontSize: px(9), fill: MUTED, fontFamily: ARIAL };
  const valueStyle = { fontSize: px(9), fill: INK, fontFamily: ARIAL };
  const described = c.series.map((s) => `${s.name}: ${s.points.map((p) => `${p.label} ${label(p.value)}`).join(", ")}`).join("; ");

  if (c.kind === "bar") {
    const rows = c.series.map((s) => ({ name: s.name, value: s.points[0]?.value ?? 0, who: s.who }));
    return (
      <div className="flex h-full flex-col" role="img" aria-label={described}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: px(44), bottom: 0, left: 0 }} barCategoryGap="30%">
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" width={px(64)} tick={{ ...tick, fontSize: px(11), fill: INK }} axisLine={false} tickLine={false} />
            <Bar dataKey="value" maxBarSize={px(40)} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.name} fill={COLOR[r.who]} />
              ))}
              <LabelList dataKey="value" position="right" formatter={label} style={{ ...valueStyle, fontSize: px(12), fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // One row per period, one key per series, so the series share the axis.
  const rows = (c.series[0]?.points ?? []).map((p, i) => ({
    name: p.label,
    ...Object.fromEntries(c.series.map((s, k) => [`s${k}`, s.points[i]?.value])),
  }));
  const last = rows.length - 1;
  const many = c.series.length > 1;
  const domain: [number | string, number | string] = plan?.range ? [plan.range.min, plan.range.max] : [0, "auto"];
  // Whole percents on a wide axis; one place when the axis spans under 20 points, so ticks never repeat.
  const tickDecimals = plan?.range && plan.range.max - plan.range.min < 0.2 ? 1 : 0;
  // Without labels on every point, each line's latest value is written at its end.
  const endLabel =
    (k: number) =>
    ({ x, y, value, index }: { x?: number | string; y?: number | string; value?: number | string; index?: number }) =>
      index === last && value !== undefined ? (
        <text x={Number(x) + px(5)} y={Number(y)} dy={px(3)} fontSize={px(9)} fontWeight={700} fill={COLOR[c.series[k].who]} fontFamily={ARIAL}>
          {label(value)}
        </text>
      ) : null;
  const yAxis = labels ? (
    <YAxis hide domain={domain} />
  ) : (
    <YAxis domain={domain} tick={tick} tickFormatter={(v) => fmt(c.format, Number(v), tickDecimals)} axisLine={false} tickLine={false} width={px(34)} tickCount={5} />
  );
  const grid = !labels && <CartesianGrid vertical={false} stroke={LINE} strokeWidth={0.75} />;
  const legend = many && <Legend iconSize={px(8)} wrapperStyle={{ fontSize: px(9), fontFamily: ARIAL, color: INK }} />;
  const margin = { top: px(14), right: labels ? px(10) : px(42), bottom: 0, left: labels ? px(10) : 0 };
  const xAxis = <XAxis dataKey="name" tick={tick} axisLine={{ stroke: LINE }} tickLine={false} interval={0} tickMargin={px(4)} />;

  return (
    <div className="h-full" role="img" aria-label={described}>
      <ResponsiveContainer width="100%" height="100%">
        {c.kind === "line" ? (
          <LineChart data={rows} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            {c.series.map((s, k) => (
              <Line key={s.name} dataKey={`s${k}`} name={s.name} stroke={COLOR[s.who]} strokeWidth={px(2)} dot={{ r: px(2.5), strokeWidth: 0, fill: COLOR[s.who] }} isAnimationActive={false}>
                {labels ? (
                  <LabelList dataKey={`s${k}`} position={k ? "bottom" : "top"} offset={px(6)} formatter={label} style={valueStyle} />
                ) : (
                  <LabelList dataKey={`s${k}`} content={endLabel(k)} />
                )}
              </Line>
            ))}
            {legend}
          </LineChart>
        ) : (
          <BarChart data={rows} margin={margin} barCategoryGap="22%">
            {grid}
            {xAxis}
            {yAxis}
            {c.series.map((s, k) => (
              <Bar key={s.name} dataKey={`s${k}`} name={s.name} fill={COLOR[s.who]} isAnimationActive={false}>
                {labels && <LabelList dataKey={`s${k}`} position="top" offset={px(4)} formatter={label} style={valueStyle} />}
              </Bar>
            ))}
            {legend}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- The pieces of a slide ---------- */

function KeyFigures({ items }: { items: Callout[] }) {
  return (
    <div>
      <p style={{ fontSize: pt(8), letterSpacing: "0.06em", color: MUTED, fontWeight: 700 }} className="uppercase">
        Key figures
      </p>
      <dl>
        {items.map((c, i) => (
          <div key={c.label} style={{ paddingTop: inch(0.11), paddingBottom: inch(0.11), borderTop: i ? `1px solid ${LINE}` : undefined }}>
            <dd style={{ fontSize: pt(22), lineHeight: 1.05, fontWeight: 700 }} className="tabular-nums">
              {c.value}
            </dd>
            <dt style={{ fontSize: pt(9.5), marginTop: inch(0.03) }}>{c.label}</dt>
            {c.note && <dd style={{ fontSize: pt(8), color: MUTED }}>{c.note}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}

function FactTable({ table, size }: { table: NonNullable<SlidePlan["table"]>; size: number }) {
  return (
    <table className="w-full border-collapse" style={{ fontSize: pt(size) }}>
      {table.headers && (
        <thead>
          <tr style={{ borderBottom: `1px solid ${INK}` }}>
            {table.headers.map((h, i) => (
              <th key={`${h}-${i}`} scope="col" style={{ fontSize: pt(size - 1.5), color: MUTED, padding: `${inch(0.03)} 0`, textAlign: i ? "right" : "left", fontWeight: 700 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.label} style={{ borderBottom: `1px solid ${LINE}` }}>
            <th scope="row" style={{ textAlign: "left", fontWeight: 400, padding: `${inch(0.07)} ${inch(0.08)} ${inch(0.07)} 0` }}>
              {r.label}
            </th>
            {r.values.map((v, i) => (
              <td key={i} className="tabular-nums" style={{ textAlign: "right", paddingLeft: inch(0.08), color: v === "n/a" ? MUTED : INK }}>
                {v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Bullets = ({ lines, size }: { lines: string[]; size: number }) => (
  <ul style={{ fontSize: pt(size) }} className="space-y-[0.6cqw]">
    {lines.map((l) => (
      <li key={l} className="flex gap-[1cqw]">
        <span aria-hidden style={{ marginTop: pt(size * 0.42), width: pt(5), height: pt(5), background: AVNET.green }} className="shrink-0" />
        <span>{l}</span>
      </li>
    ))}
  </ul>
);

/** The slide's body, below the title and takeaway, laid out by planSlide. */
function Body({ p, plan }: { p: Preview; plan: SlidePlan }) {
  if (plan.kind === "groups")
    return (
      <div className="grid h-full grid-cols-2" style={{ gap: inch(0.4) }}>
        {p.groups!.map((g) => (
          <div key={g.title}>
            <p style={{ fontSize: pt(14), fontWeight: 700, color: INK, marginBottom: inch(0.08) }}>{g.title}</p>
            <ol className="list-decimal" style={{ fontSize: pt(11), paddingLeft: inch(0.2) }}>
              {g.lines.map((l) => (
                <li key={l} style={{ marginBottom: inch(0.06) }}>
                  {l}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    );

  if (plan.kind === "chart" && p.chart) {
    return (
      <div className="grid h-full" style={{ gridTemplateColumns: plan.side ? `minmax(0,1fr) ${inch(plan.sideW)}` : "minmax(0,1fr)", gap: inch(SIDE.gap) }}>
        <div className="flex min-h-0 flex-col">
          {chartTitle(p.chart) && <p style={{ fontSize: pt(10), fontWeight: 700, marginBottom: inch(0.06) }}>{chartTitle(p.chart)}</p>}
          <div className="min-h-0 flex-1">
            <PreviewChart c={p.chart} plan={plan} />
          </div>
        </div>
        {plan.side && (
          <div className="min-h-0 space-y-[1.4cqw] overflow-hidden" style={{ background: PANEL, padding: `${inch(0.12)} ${inch(0.16)}` }}>
            {plan.callouts.length > 0 && <KeyFigures items={plan.callouts} />}
            {plan.table && <FactTable table={plan.table} size={9.5} />}
            {p.lines?.length ? <Bullets lines={p.lines} size={9.5} /> : null}
          </div>
        )}
      </div>
    );
  }

  if (plan.kind === "figures")
    return (
      <div className="flex h-full flex-col" style={{ gap: inch(0.3) }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${plan.callouts.length}, minmax(0,1fr))`, gap: inch(0.3), marginTop: inch(0.1) }}>
          {plan.callouts.map((c) => (
            <div key={c.label} style={{ borderTop: `${pt(2)} solid ${INK}`, paddingTop: inch(0.12) }}>
              <p style={{ fontSize: pt(36), fontWeight: 700, lineHeight: 1.05 }} className="tabular-nums">
                {c.value}
              </p>
              <p style={{ fontSize: pt(13), marginTop: inch(0.06) }}>{c.label}</p>
            </div>
          ))}
        </div>
        {p.lines?.length ? <Bullets lines={p.lines} size={15} /> : null}
      </div>
    );

  if (plan.kind === "table")
    return (
      <div className="space-y-[2cqw]">
        <FactTable table={plan.table!} size={13} />
        {p.lines?.length ? <Bullets lines={p.lines} size={11} /> : null}
      </div>
    );

  return p.lines?.length ? <Bullets lines={p.lines} size={13} /> : null;
}

/* ---------- The frame ---------- */

/**
 * The 16:9 slide. `variant="cover"` is the title slide: the headline large, the
 * sentence under it, no source line.
 */
export function SlideFrame({
  p,
  fallbackSource,
  mock = false,
  number,
  variant = "content",
  className,
}: {
  p?: Preview;
  /** Shown as the source when there is no preview. */
  fallbackSource?: string;
  mock?: boolean;
  number?: number;
  variant?: "content" | "cover";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / (SLIDE.w * 96));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plan = p ? planSlide(p) : undefined;
  // The text-only slide sets its one sentence large, as the slide's statement.
  const takeaway: CSSProperties = plan?.kind === "text" && !p?.lines?.length ? { fontSize: pt(20) } : { fontSize: pt(13) };
  const frame: CSSProperties = { containerType: "inline-size", fontFamily: ARIAL, color: INK };

  return (
    <ScaleContext.Provider value={scale}>
      <div ref={ref} className={cn("relative aspect-video overflow-hidden border border-hairline bg-white", className)} style={frame}>
        {/* The template's logo tab, top right. */}
        <img src="/brand/avnet-tab.svg" alt="Avnet" style={{ position: "absolute", top: inch(0.08), right: 0, width: inch(1.79), height: inch(0.65) }} />

        {variant === "cover" ? (
          <div className="absolute flex flex-col justify-center" style={{ left: inch(0.7), right: inch(2.2), top: inch(1.2), bottom: inch(1.2) }}>
            <span aria-hidden style={{ width: inch(0.9), height: pt(3), background: AVNET.green, marginBottom: inch(0.25) }} />
            <p style={{ fontSize: pt(36), lineHeight: 1.08 }} className="text-balance">
              {p?.headline}
            </p>
            {p?.text && <p style={{ fontSize: pt(14), color: MUTED, marginTop: inch(0.2) }}>{p.text}</p>}
          </div>
        ) : (
          <div className="absolute flex flex-col" style={{ left: inch(AREA.left), right: inch(SLIDE.w - AREA.right), top: inch(0.32), bottom: inch(SLIDE.h - AREA.bottom) }}>
            <p
              className="text-balance"
              style={{ fontSize: pt(24), lineHeight: 1.05, marginRight: inch(1.3), paddingBottom: inch(0.07), borderBottom: `0.5pt solid ${AVNET.green}` }}
            >
              {p?.headline ?? fallbackSource}
            </p>
            {p?.claude && (
              <p style={{ fontSize: pt(8), color: MUTED, marginTop: inch(0.05) }}>
                {p.claude.label}
                {p.claude.date ? `, ${p.claude.date}` : ""}. Check before quoting.
              </p>
            )}
            {p?.text && (
              <p className="max-w-[80cqw] text-pretty" style={{ ...takeaway, lineHeight: 1.3, marginTop: inch(0.14) }}>
                {p.text}
              </p>
            )}
            {p?.error && <p style={{ fontSize: pt(9), color: MUTED, marginTop: inch(0.06) }}>Some figures couldn&apos;t be loaded; they read n/a.</p>}
            <div className="min-h-0 flex-1" style={{ marginTop: inch(0.2) }}>
              {p && plan ? <Body p={p} plan={plan} /> : <p style={{ fontSize: pt(12), color: MUTED }}>No preview for this slide.</p>}
            </div>
          </div>
        )}

        {/* The footer: the slide number where the template puts it, the source beside it. */}
        {variant === "content" && (
          <div className="absolute flex items-center" style={{ left: inch(0.154), right: inch(SLIDE.w - AREA.right), top: inch(AREA.footer), fontSize: pt(8), color: MUTED }}>
            <span className="tabular-nums" style={{ width: inch(0.346) }}>
              {number || ""}
            </span>
            <span className="min-w-0 flex-1 truncate">
              Source: {p?.source ?? fallbackSource}
              {p?.period ? `, ${p.period}` : ""}
            </span>
            {mock && <span style={{ background: AVNET.yellow, color: INK, fontWeight: 700, padding: `0 ${inch(0.08)}` }}>Mock data</span>}
          </div>
        )}
      </div>
    </ScaleContext.Provider>
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
