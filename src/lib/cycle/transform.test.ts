// Cycle transforms. Run with: npx tsx src/lib/cycle/transform.test.ts
import assert from "node:assert/strict";
import { addMonths, align, average, groupQuarters, quarterMonths, quarterlyToMonthly, ratio, toMonthly, yoy } from "./transform";

// Daily to monthly averages; missing values skipped.
assert.deepEqual(toMonthly([{ date: "2020-01-02", value: 1 }, { date: "2020-01-30", value: 3 }, { date: "2020-02-03", value: NaN }, { date: "2020-02-04", value: 5 }]), [
  { month: "2020-01", value: 2 },
  { month: "2020-02", value: 5 },
]);
assert.equal(addMonths("2020-11", 3), "2021-02");

// Growth on a year ago, ratios and averages.
const s = Array.from({ length: 24 }, (_, i) => ({ month: addMonths("2020-01", i), value: 100 + i }));
assert.equal(yoy(s).length, 12);
assert.ok(Math.abs(yoy(s)[0].value - 112 / 100 + 1) < 1e-12);
assert.deepEqual(ratio([{ month: "2020-01", value: 10 }], [{ month: "2020-01", value: 4 }]), [{ month: "2020-01", value: 2.5 }]);
assert.equal(average(s, 3)[0].month, "2020-03");
assert.equal(average(s, 3)[0].value, 101);
// A gap breaks the average.
assert.equal(average([{ month: "2020-01", value: 1 }, { month: "2020-02", value: 1 }, { month: "2020-04", value: 1 }], 3).length, 0);

// Quarters to months.
assert.deepEqual(quarterMonths("CY26 Q2"), ["2026-04", "2026-05", "2026-06"]);
assert.equal(quarterlyToMonthly([{ quarter: "CY25 Q4", value: 0.1 }]).length, 3);

// Group growth uses the same companies a year apart, and drops thinly reported quarters.
const companies = [
  { slug: "a", cohort: "x", quarters: [{ quarter: "CY24 Q1", revenue: 100, operatingIncome: 20 }, { quarter: "CY25 Q1", revenue: 120, operatingIncome: 30 }] },
  { slug: "b", cohort: "x", quarters: [{ quarter: "CY24 Q1", revenue: 100 }, { quarter: "CY25 Q1", revenue: 80 }] },
  { slug: "c", cohort: "x", quarters: [{ quarter: "CY25 Q1", revenue: 500 }] },
];
const g = groupQuarters(companies, 2);
assert.equal(g.length, 1);
assert.equal(g[0].growth, 0, "200 against 200: the newcomer doesn't count");
assert.equal(g[0].margin, 0.25, "30 of 120");

// Alignment keeps common months.
assert.deepEqual(align([s.slice(0, 5), s.slice(3, 8)]).months, ["2020-04", "2020-05"]);

console.log("cycle transforms: ok");
