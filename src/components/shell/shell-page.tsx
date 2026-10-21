import { Construction } from "lucide-react";
import { hookup } from "@/lib/hookups";
import type { Section, ShellSpec } from "@/lib/shells/types";
import { AVNET } from "@/lib/colors";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { GroupLines } from "@/components/charts/cycle-charts";
import { cn } from "@/lib/utils";
import { DataHookup } from "./data-hookup";

const isMock = (s: Section) => s.hookups.some((id) => hookup(id)?.status !== "live");

function Kpis({ section }: { section: Extract<Section, { kind: "kpis" }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {section.items.map((k) => (
        <div key={k.label} className="rounded border border-line px-3 py-2.5">
          <span className="font-display text-2xs uppercase tracking-wider text-muted">{k.label}</span>
          <div className="mt-1 font-display text-xl tabular text-ink">{k.value}</div>
          {(k.change || k.note) && (
            <div className="mt-0.5 text-xs">
              {k.change && <span className={cn("tabular", k.good === undefined ? "text-muted" : k.good ? "text-avnet-greenDark" : "text-danger")}>{k.change}</span>}
              {k.note && <span className="ml-1 text-muted">{k.note}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Table({ section }: { section: Extract<Section, { kind: "table" }> }) {
  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="border-b border-line font-display text-2xs uppercase tracking-wider text-muted">
            {section.columns.map((c, i) => (
              <th key={c.key} scope="col" className={cn("py-2 font-normal", i === 0 ? "px-4 text-left" : "px-3", c.align === "left" ? "text-left" : i > 0 && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, r) => (
            <tr key={r} className="border-b border-line last:border-b-0 hover:bg-canvas">
              {section.columns.map((c, i) =>
                i === 0 ? (
                  <th key={c.key} scope="row" className="px-4 py-1.5 text-left font-normal font-medium text-ink">
                    {row[c.key]}
                  </th>
                ) : (
                  <td key={c.key} className={cn("px-3 py-1.5 tabular text-ink", c.align === "left" ? "text-left text-muted" : "text-right")}>
                    {row[c.key]}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bars({ section }: { section: Extract<Section, { kind: "bars" }> }) {
  const max = Math.max(...section.items.map((i) => Math.abs(i.value)), 1);
  return (
    <ul className="space-y-1">
      {section.items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-center gap-3 text-xs">
          <span className="truncate text-ink" title={item.label}>
            {item.label}
          </span>
          <div className="relative flex h-6 items-center">
            {/* Avnet Green only ever represents Avnet. */}
            <span
              aria-hidden
              className={cn("absolute inset-y-0.5 left-0 rounded-sm", item.avnet ? "bg-avnet-green/40" : "bg-blue-dark/20")}
              style={{ width: `${(Math.abs(item.value) / max) * 100}%` }}
            />
            <span className="relative pl-2 tabular text-ink">
              {item.display}
              {item.note && <span className="ml-2 text-muted">{item.note}</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Funnel({ section }: { section: Extract<Section, { kind: "funnel" }> }) {
  const max = Math.max(...section.steps.map((s) => s.value), 1);
  return (
    <ol className="space-y-1.5">
      {section.steps.map((step, i) => {
        const prev = section.steps[i - 1];
        return (
          <li key={step.label} className="text-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-ink">{step.label}</span>
              <span className="tabular text-ink">
                {step.display}
                {prev && <span className="ml-2 text-muted">{Math.round((step.value / prev.value) * 100)}% of previous</span>}
              </span>
            </div>
            <div className="mt-0.5 h-3 rounded-sm bg-canvas">
              <div className="h-3 rounded-sm bg-blue-dark/40" style={{ width: `${(step.value / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function List({ section }: { section: Extract<Section, { kind: "list" }> }) {
  return (
    <ul className="divide-y divide-line">
      {section.items.map((item) => (
        <li key={item.title} className="py-2 first:pt-0 last:pb-0">
          <p className="text-sm font-medium text-ink">
            {item.title}
            {item.tag && <span className="ml-2 rounded border border-line px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider text-muted">{item.tag}</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

function Form({ section }: { section: Extract<Section, { kind: "form" }> }) {
  const field = "w-full rounded border border-line bg-canvas px-2 py-1.5 text-sm text-muted";
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {section.fields.map((f) => (
        <label key={f.label} className={cn("block", f.type === "textarea" && "md:col-span-2")}>
          <span className="mb-1 block font-display text-2xs uppercase tracking-widest text-muted">{f.label}</span>
          {f.type === "select" ? (
            <select disabled className={field} defaultValue="">
              <option value="">{f.placeholder}</option>
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea disabled rows={3} placeholder={f.placeholder} className={field} />
          ) : (
            <input disabled placeholder={f.placeholder} className={field} />
          )}
        </label>
      ))}
      <div className="md:col-span-2">
        <button type="button" disabled className="rounded bg-ink/30 px-3 py-1.5 font-display text-2xs uppercase tracking-wider text-white cursor-not-allowed" title="Not wired yet">
          {section.action}
        </button>
      </div>
    </div>
  );
}

function Body({ section }: { section: Section }) {
  switch (section.kind) {
    case "kpis":
      return <Kpis section={section} />;
    case "table":
      return <Table section={section} />;
    case "bars":
      return <Bars section={section} />;
    case "trend":
      // Avnet Green leads when the first series is Avnet's; the rest follow the data-viz order.
      return <GroupLines rows={section.rows} series={section.series} unit={section.unit} colors={section.series[0]?.startsWith("Avnet") ? [AVNET.green, AVNET.blueDark, AVNET.orange] : undefined} />;
    case "funnel":
      return <Funnel section={section} />;
    case "list":
      return <List section={section} />;
    case "form":
      return <Form section={section} />;
  }
}

/**
 * The strip at the top of every shell page: what it is for, which PRD item it
 * implements, and what is still mock. Also used on the older mock pages.
 */
export function ShellBanner({ purpose, prd, personas, hookups }: { purpose: string; prd: string; personas: string[]; hookups: string[]; title?: string }) {
  const pending = Array.from(new Set(hookups)).filter((id) => hookup(id)?.status !== "live");
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 text-xs shadow-card">
      <div className="flex items-start gap-3">
        <Construction className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-ink">{purpose}</p>
          <p className="mt-1 text-muted">
            Shell page · {prd} · for {personas.join(", ")} · layout settled, visual design pending
            {pending.length > 0 && ` · ${pending.length} data ${pending.length === 1 ? "hookup" : "hookups"} outstanding`}
          </p>
        </div>
      </div>
      <DataHookup ids={pending} />
    </div>
  );
}

/** Draws a shell page from its spec. Server component. */
export function ShellPage({ spec, children }: { spec: ShellSpec; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">
      <PageHeader title={spec.title} subtitle={spec.subtitle} />
      <ShellBanner purpose={spec.purpose} prd={spec.prd} personas={spec.personas} hookups={spec.sections.flatMap((s) => s.hookups)} />
      {children}
      <div className="grid gap-4 xl:grid-cols-2">
        {spec.sections.map((s) => (
          <Card key={s.title} title={s.title} subtitle={s.subtitle} source={isMock(s) ? "mock" : undefined} className={s.span === "half" ? "" : "xl:col-span-2"}>
            <Body section={s} />
            <DataHookup ids={s.hookups} />
          </Card>
        ))}
      </div>
    </div>
  );
}
