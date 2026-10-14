import { promises as fs } from "node:fs";
import path from "node:path";
import { DATE_PATTERN, SLUG_PATTERN, type Snapshot } from "./model";

// Snapshot storage. Local JSON files for now, one per distributor per day, under
// data/line-cards/<distributor>/<date>.json. The functions here are the whole
// storage surface, so moving to Supabase means reimplementing this file only.
// Server-only. Note: a serverless deployment has a read-only filesystem, so
// writes only persist when the app runs on a machine with a writable disk.

const ROOT = path.join(process.cwd(), "data", "line-cards");

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  if (!SLUG_PATTERN.test(snapshot.distributor) || !DATE_PATTERN.test(snapshot.date)) throw new Error("Invalid distributor or date");
  const dir = path.join(ROOT, snapshot.distributor);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${snapshot.date}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

async function dates(distributor: string): Promise<string[]> {
  try {
    const files = await fs.readdir(path.join(ROOT, distributor));
    return files
      .map((f) => f.replace(/\.json$/, ""))
      .filter((d) => DATE_PATTERN.test(d))
      .sort();
  } catch {
    return [];
  }
}

async function read(distributor: string, date: string): Promise<Snapshot | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, distributor, `${date}.json`), "utf8")) as Snapshot;
  } catch {
    return null;
  }
}

export interface DistributorHistory {
  distributor: string;
  latest: Snapshot;
  /** The snapshot before the latest, when there is one. */
  previous: Snapshot | null;
  snapshots: number;
}

/** Latest and previous snapshot for every distributor that has at least one. */
export async function getHistories(): Promise<DistributorHistory[]> {
  let slugs: string[] = [];
  try {
    slugs = (await fs.readdir(ROOT, { withFileTypes: true })).filter((e) => e.isDirectory() && SLUG_PATTERN.test(e.name)).map((e) => e.name);
  } catch {
    return [];
  }
  const out: DistributorHistory[] = [];
  for (const distributor of slugs) {
    const all = await dates(distributor);
    const latest = all.length ? await read(distributor, all[all.length - 1]) : null;
    if (!latest) continue;
    const previous = all.length > 1 ? await read(distributor, all[all.length - 2]) : null;
    out.push({ distributor, latest, previous, snapshots: all.length });
  }
  return out;
}
