import { snapshots } from "@/lib/store";
import { DATE_PATTERN, SLUG_PATTERN, type Snapshot } from "./model";

// Snapshot storage, one per distributor per day, through the snapshot store in
// src/lib/store (data/line-cards/<distributor>/<date>.json for now). Server-only.
// Note: a serverless deployment has a read-only filesystem, so writes only persist
// when the app runs on a machine with a writable disk.

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  if (!SLUG_PATTERN.test(snapshot.distributor) || !DATE_PATTERN.test(snapshot.date)) throw new Error("Invalid distributor or date");
  await snapshots.write(snapshot.distributor, snapshot.date, snapshot);
}

async function dates(distributor: string): Promise<string[]> {
  return (await snapshots.dates(distributor)).filter((d) => DATE_PATTERN.test(d));
}

const read = (distributor: string, date: string) => snapshots.read<Snapshot>(distributor, date);

export interface DistributorHistory {
  distributor: string;
  latest: Snapshot;
  /** The snapshot before the latest, when there is one. */
  previous: Snapshot | null;
  snapshots: number;
}

/** Latest and previous snapshot for every distributor that has at least one. */
export async function getHistories(): Promise<DistributorHistory[]> {
  const slugs = (await snapshots.distributors()).filter((s) => SLUG_PATTERN.test(s));
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
