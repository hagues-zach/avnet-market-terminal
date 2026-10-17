import type { ChartRow, Unit } from "@/components/charts/cycle-charts";
import type { Pillar } from "@/components/layout/nav";

// Shell pages are described as data and drawn by one renderer
// (src/components/shell/shell-page.tsx). Each is a deliberate placeholder: the
// layout and the questions it answers are settled, the visual design is not.
// Design passes (docs/superapp-plan.md) replace sections with bespoke components.

interface Base {
  title: string;
  subtitle?: string;
  /** Data hookup ids from src/lib/hookups.ts. A section with any non-live hookup is shown as mock. */
  hookups: string[];
  /** Full width, or half when two sit side by side. */
  span?: "full" | "half";
}

export interface Kpi {
  label: string;
  value: string;
  /** Plain text such as "+4.2% YoY"; shown green or red by `good`. */
  change?: string;
  good?: boolean;
  note?: string;
}

export type Section =
  | (Base & { kind: "kpis"; items: Kpi[] })
  | (Base & { kind: "table"; columns: { key: string; label: string; align?: "left" | "right" }[]; rows: Record<string, string>[] })
  | (Base & { kind: "bars"; items: { label: string; value: number; display: string; avnet?: boolean; note?: string }[] })
  | (Base & { kind: "trend"; unit: Unit; series: string[]; rows: ChartRow[] })
  | (Base & { kind: "funnel"; steps: { label: string; value: number; display: string }[] })
  | (Base & { kind: "list"; items: { title: string; body: string; tag?: string }[] })
  | (Base & { kind: "form"; fields: { label: string; placeholder: string; type?: "text" | "select" | "textarea"; options?: string[] }[]; action: string });

export interface ShellSpec {
  title: string;
  subtitle: string;
  pillar: Pillar;
  /** What this page is for, in a sentence or two. Shown at the top of the shell. */
  purpose: string;
  /** PRD module or section this page implements. */
  prd: string;
  /** Who it is for (PRD section 9 personas). */
  personas: string[];
  sections: Section[];
}
