// Shared earnings formatters. Run with: npx tsx src/components/earnings/format.test.ts
import assert from "node:assert/strict";
import { NA, format, longDate } from "./format";

// A missing value reads "n/a", never a dash.
assert.equal(NA, "n/a");
for (const k of ["usd", "pct", "growth", "days", "eps"] as const) assert.equal(format(k, undefined), "n/a", k);

assert.equal(format("usd", 1_485_000_000), "$1.49B");
assert.equal(format("pct", 0.632), "63.2%");
assert.equal(format("days", 115.4), "115");

// Dates read "Oct 28", with the year only when it isn't this one.
assert.equal(longDate("2026-10-28", 2026), "Oct 28");
assert.equal(longDate("2027-01-26", 2026), "Jan 26, 2027");
assert.equal(longDate("2025-06-27", 2026), "Jun 27, 2025");

// No visible output has an em-dash, en-dash, middle dot or slash ("n/a" is the agreed exception).
for (const t of [NA, format("growth", -0.031), format("usd", -2e9), longDate("2026-01-05", 2026)]) assert.ok(!/[—–·/]/.test(t.replace("n/a", "")), t);

console.log("earnings format: ok");
