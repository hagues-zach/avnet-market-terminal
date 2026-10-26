// The storage seam for saved results: Claude's answers, talking points, news
// angles and digests. Callers only see this interface, so moving from local files
// to Avnet's database means writing one adapter (see docs/storage.md).

/**
 * Drop entries older than `days` when writing. `dateOf` gives an entry's date as
 * YYYY-MM-DD (from its key or its value); an entry without one is dropped too.
 */
export interface Expiry<T> {
  days: number;
  dateOf: (key: string, value: T) => string | undefined;
}

/**
 * A namespaced key-value store of JSON values. A namespace is one kind of saved
 * result with a version in its name ("ask-claude-v3"), so a change of shape starts
 * a new namespace instead of migrating the old one. Writes never throw: losing a
 * saved copy only costs a repeat call, never the result being shown.
 */
export interface Store {
  get<T>(ns: string, key: string): Promise<T | undefined>;
  /** Every entry in the namespace. Namespaces are small (hundreds of entries at most). */
  getAll<T>(ns: string): Promise<Record<string, T>>;
  set<T>(ns: string, key: string, value: T, expire?: Expiry<T>): Promise<void>;
  /** Adds or replaces these entries; the rest of the namespace is kept. */
  setMany<T>(ns: string, entries: Record<string, T>, expire?: Expiry<T>): Promise<void>;
}

/** The first day still kept: YYYY-MM-DD, `days` before now. */
export function cutoff(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 864e5).toISOString().slice(0, 10);
}
