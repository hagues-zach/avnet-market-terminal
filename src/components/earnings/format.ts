import { formatPctSigned, formatUsdMillions } from "@/lib/format";
import type { Metric } from "@/lib/data/live/earnings-model";

// Shared by the server-rendered peer table and the client company view.

export type Kind = "usd" | "pct" | "growth" | "days" | "eps";

export interface Row {
  metric: Metric;
  label: string;
  kind: Kind;
}

/** A missing value. */
export const NA = "n/a";

export function format(kind: Kind, v: number | undefined): string {
  if (v === undefined) return NA;
  switch (kind) {
    case "usd":
      return `${v < 0 ? "−" : ""}${formatUsdMillions(Math.abs(v) / 1e6, { precise: true })}`;
    case "pct":
      return `${(v * 100).toFixed(1)}%`;
    case "growth":
      return formatPctSigned(v);
    case "days":
      return `${Math.round(v)}`;
    case "eps":
      return `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
  }
}

/** "Oct 28", with the year only when it isn't this one ("Jan 26, 2027"). */
export function longDate(d: string, thisYear = new Date().getUTCFullYear()): string {
  const x = new Date(`${d}T00:00:00Z`);
  const year = x.getUTCFullYear() === thisYear ? {} : { year: "numeric" as const };
  return x.toLocaleDateString("en-US", { month: "short", day: "numeric", ...year, timeZone: "UTC" });
}

/** `/earnings` link that keeps whichever of company/group isn't being changed. */
export function earningsHref(company: string, group: string): string {
  const p = new URLSearchParams({ company });
  if (group !== "all") p.set("group", group);
  return `/earnings?${p.toString()}`;
}
