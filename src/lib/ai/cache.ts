import { promises as fs } from "node:fs";
import path from "node:path";

// Results from Claude are kept on disk so nothing is paid for twice: a story's
// angle or a press release's digest never changes once written. Local JSON under
// .cache/ai (not committed). Like the line card store, this is local-only and
// moves to the database with it. Server-only.

const ROOT = path.join(process.cwd(), ".cache", "ai");

export async function readCache<T>(name: string): Promise<Record<string, T>> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, `${name}.json`), "utf8")) as Record<string, T>;
  } catch {
    return {};
  }
}

export async function writeCache<T>(name: string, entries: Record<string, T>): Promise<void> {
  try {
    await fs.mkdir(ROOT, { recursive: true });
    await fs.writeFile(path.join(ROOT, `${name}.json`), JSON.stringify(entries), "utf8");
  } catch {
    // A read-only filesystem only costs the cache, not the result.
  }
}
