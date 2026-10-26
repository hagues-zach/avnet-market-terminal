// Runs every src/**/*.test.ts in its own tsx process and reports a pass or fail
// line per file. Each test file prints "...: ok" and sets a non-zero exit code
// when something fails, so the exit code is the verdict.
//
//   npx tsx scripts/test.ts              all tests
//   npx tsx scripts/test.ts cycle deck   only files whose path contains "cycle" or "deck"

import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
// Tests are independent, so a few run at once; TEST_JOBS=1 runs them in order.
const JOBS = Math.max(1, Number(process.env.TEST_JOBS) || 4);

function findTests(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findTests(full);
    return entry.name.endsWith(".test.ts") ? [full] : [];
  });
}

type Result = { file: string; ok: boolean; ms: number; output: string };

function run(file: string): Promise<Result> {
  const started = Date.now();
  return new Promise((resolve) => {
    // This runner is itself started by tsx, so reusing node's own flags (tsx's
    // loader) runs each test the same way "npx tsx <file>" would.
    const child = spawn(process.execPath, [...process.execArgv, file], { cwd: ROOT, env: process.env });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", (error) => resolve({ file, ok: false, ms: Date.now() - started, output: output + String(error) }));
    child.on("close", (code) => resolve({ file, ok: code === 0, ms: Date.now() - started, output }));
  });
}

async function main() {
  const filters = process.argv.slice(2);
  const files = findTests(SRC)
    .map((f) => path.relative(ROOT, f))
    .filter((f) => filters.length === 0 || filters.some((term) => f.includes(term)))
    .sort();

  if (files.length === 0) {
    console.error(`No test files match ${filters.join(", ")}`);
    process.exit(1);
  }

  const started = Date.now();
  const results: Result[] = [];
  let next = 0;
  async function worker() {
    while (next < files.length) {
      const result = await run(files[next++]);
      results.push(result);
      const time = `${(result.ms / 1000).toFixed(1)}s`.padStart(6);
      console.log(`${result.ok ? "pass" : "FAIL"} ${time}  ${result.file}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, files.length) }, worker));

  const failed = results.filter((r) => !r.ok);
  for (const r of failed) {
    console.log(`\n--- ${r.file} ---\n${r.output.trimEnd()}`);
  }
  const total = `${((Date.now() - started) / 1000).toFixed(1)}s`;
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed, ${results.length} files in ${total}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
