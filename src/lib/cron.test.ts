// Scheduled job authorization. Run with: npx tsx src/lib/cron.test.ts
import assert from "node:assert/strict";
import { cronAuthorized } from "./cron";

assert.equal(cronAuthorized("Bearer s3cret", "s3cret"), true);
assert.equal(cronAuthorized("Bearer wrong", "s3cret"), false);
assert.equal(cronAuthorized("s3cret", "s3cret"), false, "needs the Bearer form");
assert.equal(cronAuthorized(null, "s3cret"), false);
assert.equal(cronAuthorized("Bearer ", ""), false, "an empty secret refuses everything");
assert.equal(cronAuthorized("Bearer undefined", undefined), false, "an unset secret refuses everything");

console.log("cron: ok");
