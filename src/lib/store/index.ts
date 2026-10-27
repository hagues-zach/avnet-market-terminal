import { databricksStores } from "./databricks";
import { fileStore } from "./file";
import { oracleStores } from "./oracle";
import { fileSnapshots, type SnapshotStore } from "./snapshots";
import type { Store } from "./types";

// Where saved results live, chosen once from STORE_ADAPTER: "file" (the default)
// is local JSON; "databricks" and "oracle" are tables in Avnet's database (see
// docs/storage.md). A missing setting for the chosen adapter is an error at
// startup, naming the setting. Server-only.

export { cutoff, type Expiry, type Store } from "./types";
export type { SnapshotStore } from "./snapshots";

function choose(): { kv: Store; snapshots: SnapshotStore } {
  const adapter = (process.env.STORE_ADAPTER ?? "").trim() || "file";
  switch (adapter) {
    case "file":
      return { kv: fileStore(), snapshots: fileSnapshots() };
    case "databricks":
      return databricksStores();
    case "oracle":
      return oracleStores();
    default:
      throw new Error(`Unknown STORE_ADAPTER "${adapter}". Use "file", "databricks" or "oracle".`);
  }
}

const chosen = choose();

/** Saved results: Claude's answers, talking points, news angles and digests. */
export const store: Store = chosen.kv;
/** Line card snapshots. */
export const snapshots: SnapshotStore = chosen.snapshots;
