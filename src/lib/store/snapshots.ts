import { promises as fs } from "node:fs";
import path from "node:path";

// Line card snapshots: one JSON document per distributor per day. They don't go
// through the key-value Store because the file layout is part of the repo: the
// snapshots under data/line-cards/<distributor>/<date>.json are committed and
// shipped with the app, pretty-printed so a diff reads well, and found by
// listing folders. A database adapter can keep them as rows keyed by distributor
// and date instead; see docs/storage.md. Callers check slugs and dates. Server-only.

export interface SnapshotStore {
  /** Distributors with at least one snapshot. */
  distributors(): Promise<string[]>;
  /** A distributor's snapshot dates, oldest first. */
  dates(distributor: string): Promise<string[]>;
  read<T>(distributor: string, date: string): Promise<T | null>;
  /** Throws when the snapshot can't be saved, so the collector can say so. */
  write<T>(distributor: string, date: string, snapshot: T): Promise<void>;
}

export function fileSnapshots(root = path.join(process.cwd(), "data", "line-cards")): SnapshotStore {
  return {
    async distributors() {
      try {
        return (await fs.readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
      } catch {
        return [];
      }
    },
    async dates(distributor) {
      try {
        return (await fs.readdir(path.join(root, distributor))).map((f) => f.replace(/\.json$/, "")).sort();
      } catch {
        return [];
      }
    },
    async read<T>(distributor: string, date: string) {
      try {
        return JSON.parse(await fs.readFile(path.join(root, distributor, `${date}.json`), "utf8")) as T;
      } catch {
        return null;
      }
    },
    async write(distributor, date, snapshot) {
      const dir = path.join(root, distributor);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `${date}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    },
  };
}
