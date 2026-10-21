// Earnings season rules. Run with: npx tsx src/lib/earnings/season.test.ts
import assert from "node:assert/strict";
import type { ReleaseEvent } from "@/lib/data/live/earnings-calendar";
import { COMPANIES, type Quarter } from "@/lib/data/live/earnings-model";
import { groupMedian, justReported, season, seasonQuarter, weekStart, yearAgo, type PeerRow } from "./season";

const co = (slug: string) => COMPANIES.find((c) => c.slug === slug)!;
const q = (calendarLabel: string, values: Quarter["values"], end = "2026-09-30"): Quarter => ({
  end,
  fiscalLabel: "Q",
  calendarLabel,
  values,
  backedOut: [],
});
const ev = (slug: string, date: string, status: ReleaseEvent["status"]): ReleaseEvent => ({ company: co(slug), date, status, timing: null });

// The season is the last calendar quarter to have ended.
assert.equal(seasonQuarter("2026-10-21"), "CY26 Q3");
assert.equal(seasonQuarter("2026-01-15"), "CY25 Q4");
assert.equal(seasonQuarter("2026-07-01"), "CY26 Q2");
assert.equal(weekStart("2026-10-21"), "2026-10-19");

const rows: PeerRow[] = [
  { company: co("microchip"), latest: q("CY26 Q3", { revenueYoY: 0.18, operatingMargin: 0.2 }) },
  { company: co("nxp"), latest: q("CY26 Q3", { revenueYoY: 0.06, operatingMargin: 0.3 }) },
  { company: co("onsemi"), latest: q("CY26 Q3", { revenueYoY: 0.1 }) },
  { company: co("avnet"), latest: q("CY26 Q2", { revenueYoY: 0.47 }) },
  { company: co("arrow"), latest: null },
];
const events = [
  ev("texas-instruments", "2026-10-21", "estimated"),
  ev("arrow", "2026-10-29", "estimated"),
  ev("avnet", "2026-11-04", "estimated"),
  ev("skyworks", "2026-10-15", "due"),
  ev("microchip", "2026-10-20", "reported"),
  ev("wolfspeed", "2026-10-16", "reported"),
];

const s = season(rows, events, "2026-10-21");
assert.equal(s.quarter, "CY26 Q3");
assert.deepEqual(
  s.reported.map((r) => r.company.slug),
  ["microchip", "nxp", "onsemi"],
);
assert.equal(s.total, 5);
assert.equal(s.medianGrowth, 0.1);
assert.deepEqual(
  s.thisWeek.map((e) => e.company.slug),
  ["texas-instruments"],
);
assert.deepEqual(
  s.nextWeek.map((e) => e.company.slug),
  ["arrow"],
);
assert.deepEqual(
  s.due.map((e) => e.company.slug),
  ["skyworks"],
);
assert.equal(s.next.avnet?.date, "2026-11-04");
assert.equal(s.next.arrow?.date, "2026-10-29");

// Just reported: newest first; figures only once that quarter's filing is in.
const jr = justReported(events, rows, "CY26 Q3");
assert.deepEqual(
  jr.map((j) => j.event.company.slug),
  ["microchip", "wolfspeed"],
);
assert.equal(jr[0].quarter?.values.revenueYoY, 0.18);
assert.equal(jr[1].quarter, null);

// Group medians skip missing figures.
assert.equal(groupMedian(rows, "operatingMargin"), 0.25);

// A year ago by end date, within three weeks.
const qs = [q("CY25 Q3", {}, "2025-09-27"), q("CY26 Q2", {}, "2026-06-27"), q("CY26 Q3", {}, "2026-09-26")];
assert.equal(yearAgo(qs, qs[2])?.calendarLabel, "CY25 Q3");

console.log("season: all tests passed");
