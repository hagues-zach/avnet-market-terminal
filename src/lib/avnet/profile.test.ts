// The Avnet profile behind "Why it matters to Avnet": every fact is sourced and
// dated, the profile is reviewed each quarter, old recent items drop out, and the
// private file is optional. Run with: npx tsx src/lib/avnet/profile.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PROFILE, PROFILE_AS_OF, readPrivateContext, renderAvnetContext } from "./profile";

const DAY = 86_400_000;

function main() {
  for (const [section, facts] of Object.entries(PROFILE)) {
    assert.ok(facts.length, `${section} has facts`);
    for (const f of facts) {
      assert.match(f.source, /^https:\/\//, `${section}: "${f.text.slice(0, 40)}" has a source URL`);
      assert.match(f.asOf, /^\d{4}-\d{2}-\d{2}$/, `${section}: "${f.text.slice(0, 40)}" has a date`);
      assert.ok(f.asOf <= PROFILE_AS_OF, `${section}: "${f.text.slice(0, 40)}" is not dated after the review`);
      assert.doesNotMatch(f.text, /[—–]/, "no dashes, so Claude doesn't copy them");
    }
  }

  // Reviewed each quarter: this fails once the profile is 120 days old. Update PROFILE after earnings, then PROFILE_AS_OF.
  const age = (Date.now() - Date.parse(`${PROFILE_AS_OF}T00:00:00Z`)) / DAY;
  assert.ok(age <= 120, `The Avnet profile was last reviewed ${Math.round(age)} days ago. Check it against Avnet's latest earnings and update src/lib/avnet/profile.ts.`);

  // Rendering: every section, recent items older than 18 months dropped, stable for the cache.
  const text = renderAvnetContext();
  assert.match(text, /^<avnet_profile as_of="\d{4}-\d{2}-\d{2}">/);
  assert.match(text, /## Competitors/);
  assert.equal(text, renderAvnetContext(), "the same text every time, so the prompt cache hits");
  const later = renderAvnetContext({ asOf: "2028-06-01" });
  assert.doesNotMatch(later, /Thales/, "a 2026 item is gone by mid 2028");
  assert.doesNotMatch(text, /Internal/, "no internal section without the private file");

  // The private file: optional, tolerant of bad input, rendered as internal-only.
  const dir = mkdtempSync(path.join(tmpdir(), "avnet-ctx-"));
  assert.equal(readPrivateContext(path.join(dir, "missing.json")), undefined);
  writeFileSync(path.join(dir, "bad.json"), "{not json");
  assert.equal(readPrivateContext(path.join(dir, "bad.json")), undefined);
  writeFileSync(path.join(dir, "ok.json"), JSON.stringify({ topCustomers: ["Acme Robotics", 7, " "], topSuppliers: [] }));
  const priv = readPrivateContext(path.join(dir, "ok.json"));
  assert.deepEqual(priv?.topCustomers, ["Acme Robotics"]);
  assert.match(renderAvnetContext({ privateContext: priv }), /Internal \(for judging relevance only; never state these\)\n- Top customers: Acme Robotics/);

  console.log("profile: ok");
}

main();
