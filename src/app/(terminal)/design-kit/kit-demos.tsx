"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, VIZ, entityColor } from "@/lib/colors";
import { ChartCard } from "@/components/ui/chart-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar, FilterChip, FilterSelect } from "@/components/ui/filter-bar";
import { Chip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/states";

// Example data for the gallery only. Not real figures.
const SHARE = [
  { q: "Q1'25", Avnet: 7.0, Arrow: 9.6, Other: 14.1 },
  { q: "Q2'25", Avnet: 7.1, Arrow: 9.5, Other: 14.3 },
  { q: "Q3'25", Avnet: 6.9, Arrow: 9.4, Other: 14.4 },
  { q: "Q4'25", Avnet: 7.1, Arrow: 9.3, Other: 14.5 },
  { q: "Q1'26", Avnet: 7.2, Arrow: 9.2, Other: 14.6 },
  { q: "Q2'26", Avnet: 7.3, Arrow: 9.2, Other: 14.7 },
  { q: "Q3'26", Avnet: 7.4, Arrow: 9.1, Other: 14.8 },
];
const SERIES = [
  { key: "Avnet", color: entityColor("Avnet", 0), width: 2.5 },
  { key: "Arrow", color: entityColor("Arrow", 0), width: CHART.lineWidth },
  { key: "Other", color: VIZ.benchmark, width: CHART.lineWidthLight, label: "Rest of distribution" },
] as const;

const BILLINGS = [
  { q: "Q4'25", v: 5.4 },
  { q: "Q1'26", v: 5.6 },
  { q: "Q2'26", v: 5.7 },
  { q: "Q3'26", v: 5.9 },
];

interface SegmentRow {
  segment: string;
  market: number;
  avnet: number;
  share: number;
  change: number;
  confidence: "High" | "Medium" | "Low";
}
const SEGMENTS: SegmentRow[] = [
  { segment: "Microcontrollers", market: 22.4, avnet: 2128, share: 9.5, change: 0.4, confidence: "High" },
  { segment: "Analog", market: 31.8, avnet: 2480, share: 7.8, change: 0.2, confidence: "High" },
  { segment: "Power discretes", market: 28.5, avnet: 1368, share: 4.8, change: -0.3, confidence: "Medium" },
  { segment: "FPGAs", market: 7.2, avnet: 878, share: 12.2, change: 1.1, confidence: "High" },
  { segment: "Memory", market: 48.2, avnet: 1494, share: 3.1, change: -0.5, confidence: "Medium" },
  { segment: "Connectors", market: 14.1, avnet: 620, share: 4.4, change: 0, confidence: "Low" },
];
const COLUMNS: Column<SegmentRow>[] = [
  { key: "segment", header: "Segment", sortValue: (r) => r.segment, render: (r) => <span className="font-medium">{r.segment}</span> },
  { key: "market", header: "Market $B", numeric: true, sortValue: (r) => r.market, render: (r) => `$${r.market.toFixed(1)}B` },
  { key: "avnet", header: "Avnet $M", numeric: true, sortValue: (r) => r.avnet, render: (r) => `$${r.avnet.toLocaleString("en-US")}M` },
  { key: "share", header: "Avnet share", numeric: true, sortValue: (r) => r.share, render: (r) => `${r.share.toFixed(1)}%` },
  { key: "change", header: "Change YoY", numeric: true, sortValue: (r) => r.change, render: (r) => <Delta value={r.change} display={`${Math.abs(r.change).toFixed(1)} pts`} /> },
  { key: "confidence", header: "Confidence", render: (r) => <Chip>{r.confidence}</Chip> },
];

const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };

export function ShareChart() {
  const last = SHARE.length - 1;
  return (
    <ChartCard
      title="Share over time"
      subtitle="Avnet gained 0.4 points in seven quarters while Arrow slipped."
      source="Example data"
      asOf="Oct 20, 2026"
      height={260}
      table={
        <DataTable
          caption="Distribution share by quarter"
          rowKey={(r) => r.q}
          rows={SHARE}
          columns={[
            { key: "q", header: "Quarter" },
            { key: "Avnet", header: "Avnet", numeric: true, render: (r) => `${r.Avnet.toFixed(1)}%` },
            { key: "Arrow", header: "Arrow", numeric: true, render: (r) => `${r.Arrow.toFixed(1)}%` },
            { key: "Other", header: "Rest", numeric: true, render: (r) => `${r.Other.toFixed(1)}%` },
          ]}
        />
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={SHARE} margin={{ top: 8, right: 170, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="q" tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={36} unit="%" domain={[0, 20]} />
          <Tooltip contentStyle={CHART.tooltip} formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n === "Other" ? "Rest of distribution" : n]} />
          {SERIES.map((s) => (
            <Line key={s.key} dataKey={s.key} stroke={s.color} strokeWidth={s.width} dot={false} activeDot={CHART.activeDot} isAnimationActive={false}>
              <LabelList
                dataKey={s.key}
                content={({ x, y, value, index }) =>
                  index === last ? (
                    <text x={Number(x) + 8} y={Number(y) + 4} fontSize={12} fill={CHART.label}>
                      {"label" in s ? s.label : s.key} {Number(value).toFixed(1)}%
                    </text>
                  ) : null
                }
              />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BillingsChart() {
  return (
    <ChartCard title="Avnet billings" subtitle="Up three quarters in a row." source="Example data" asOf="Oct 20, 2026" height={260}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={BILLINGS} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="q" tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={36} unit="B" />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} contentStyle={CHART.tooltip} formatter={(v: number) => [`$${v.toFixed(1)}B`, "Avnet billings"]} />
          <Bar dataKey="v" fill={VIZ.avnet} maxBarSize={48} isAnimationActive={false}>
            <LabelList dataKey="v" position="top" fontSize={12} fill={CHART.label} formatter={(v: number) => `$${v.toFixed(1)}B`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SegmentTable() {
  return <DataTable caption="Share by segment, example data" columns={COLUMNS} rows={SEGMENTS} rowKey={(r) => r.segment} defaultSort={{ key: "market", dir: "desc" }} densityToggle />;
}

export function FilterDemo() {
  const [period, setPeriod] = useState("4q");
  const [region, setRegion] = useState("americas");
  return (
    <FilterBar
      onReset={() => {
        setPeriod("4q");
        setRegion("all");
      }}
    >
      <FilterSelect
        label="Period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: "4q", label: "Last four quarters" },
          { value: "8q", label: "Last eight quarters" },
        ]}
      />
      <FilterSelect
        label="Region"
        value={region}
        onChange={setRegion}
        options={[
          { value: "all", label: "All regions" },
          { value: "americas", label: "Americas" },
          { value: "emea", label: "EMEA" },
          { value: "asia", label: "Asia" },
        ]}
      />
      {region !== "all" && <FilterChip label={`Region: ${region === "americas" ? "Americas" : region.toUpperCase()}`} onRemove={() => setRegion("all")} />}
    </FilterBar>
  );
}

export function ErrorDemo() {
  const [tries, setTries] = useState(0);
  return (
    <ErrorState
      title="Couldn't load the latest filings"
      source="SEC EDGAR"
      detail={tries ? `Tried again ${tries} time${tries > 1 ? "s" : ""}. EDGAR may be rate limiting; wait a minute.` : "The request timed out after 10 seconds."}
      onRetry={() => setTries((t) => t + 1)}
    />
  );
}
