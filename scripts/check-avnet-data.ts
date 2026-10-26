// Check Avnet's data against the contracts before pointing the app at it: loads
// every dataset from the adapter AVNET_DATA names, one at a time so a failure
// names its dataset, then runs the contract suite (src/lib/avnet/contract.ts).
// Exits non-zero on any problem.
//
//   AVNET_DATA=databricks npx tsx scripts/check-avnet-data.ts
//   AVNET_DATA=databricks AVNET_MOCK_DATASETS=markets,supply npx tsx scripts/check-avnet-data.ts
import { checkContract } from "../src/lib/avnet/contract";
import type { AvnetInputs } from "../src/lib/avnet/contracts";
import { avnetSource, mockedDatasets } from "../src/lib/avnet/index";
import { METHODS } from "../src/lib/avnet/source";

async function main() {
  const source = await avnetSource();
  const mocked = source.name === "mock" ? [] : mockedDatasets();
  console.log(`Adapter: ${source.name}${mocked.length ? ` (mock: ${mocked.join(", ")})` : ""}`);

  const inputs: Partial<AvnetInputs> = {};
  let failed = 0;
  for (const method of METHODS) {
    const started = Date.now();
    try {
      (inputs as Record<string, unknown>)[method] = await source[method]();
      console.log(`  ok    ${method} (${Date.now() - started} ms)`);
    } catch (e) {
      failed += 1;
      console.log(`  FAIL  ${method}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (failed) {
    console.log(`\n${failed} of ${METHODS.length} datasets didn't load; fix those before the contract check.`);
    process.exitCode = 1;
    return;
  }

  const problems = checkContract(inputs as AvnetInputs);
  for (const p of problems) console.log(`  problem  ${p}`);
  console.log(problems.length ? `\n${problems.length} contract problems.` : "\nEvery dataset passes the contract.");
  if (problems.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
