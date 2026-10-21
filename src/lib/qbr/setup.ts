// The QBR setup lives in the URL so a brief can be bookmarked or shared:
// /tools/qbr?company=microchip&meeting=supplier&date=2026-11-12&focus=…

import { COMPANIES, roleOf, type Company } from "@/lib/data/live/earnings-model";

export type Meeting = "supplier" | "customer";

export const MEETING_LABELS: Record<Meeting, string> = {
  supplier: "Supplier line review",
  customer: "Customer account review",
};

export interface Setup {
  company: Company | null;
  meeting: Meeting;
  date: string | null; // YYYY-MM-DD
  focus: string;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function readSetup(params: Record<string, string | string[] | undefined>): Setup {
  const company = COMPANIES.find((c) => c.slug === one(params.company)) ?? null;
  const asked = one(params.meeting);
  const meeting: Meeting =
    asked === "supplier" || asked === "customer" ? asked : company && roleOf(company) === "customer" ? "customer" : "supplier";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(one(params.date) ?? "") ? one(params.date)! : null;
  return { company, meeting, date, focus: (one(params.focus) ?? "").slice(0, 200) };
}
