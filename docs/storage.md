# Storage

Everything the app saves goes through `src/lib/store`. Today that is local files.
When Avnet's provisioned database is ready, adding a database adapter there is the
only change: no caller knows where its data lives.

## The interface

`src/lib/store/types.ts`:

```ts
interface Store {
  get<T>(ns: string, key: string): Promise<T | undefined>;
  getAll<T>(ns: string): Promise<Record<string, T>>;
  set<T>(ns: string, key: string, value: T, expire?: Expiry<T>): Promise<void>;
  setMany<T>(ns: string, entries: Record<string, T>, expire?: Expiry<T>): Promise<void>;
}

interface Expiry<T> {
  days: number;
  dateOf: (key: string, value: T) => string | undefined; // YYYY-MM-DD
}
```

- Values are plain JSON.
- `setMany` adds or replaces the given entries and keeps the rest.
- `expire`, when given on a write, drops every entry in the namespace whose date is
  older than `days` ago (or that has no date). Callers that prune pass it on every
  write, so the namespace never grows without bound.
- Writes never throw. A lost write only costs a repeat call to Claude next time.

The adapter is chosen once in `src/lib/store/index.ts` from `STORE_ADAPTER`
(default `file`), which exports `store` and `snapshots`.

## The file adapter

`src/lib/store/file.ts`. One JSON object per namespace at `.cache/ai/<ns>.json`
(not committed). Each process keeps what it wrote or read in memory in front of the
files, so on a read-only or per-instance disk (Vercel) results still last for the
life of the instance. Reads also go to the file, so another process's writes are
seen. Writes to one namespace run one at a time within a process.

Tests: `npx tsx src/lib/store/file.test.ts`.

## Namespaces today

| Namespace | Written by | Read by | Key | Value | Size seen | Pruned |
|---|---|---|---|---|---|---|
| `ask-claude-v3` | `src/lib/ask/claude.ts` | same | `YYYY-MM-DD question` (lower case, spaces collapsed) | Ask the Terminal `Answer` | about 3 KB each, a handful a day | 7 days, by the date in the key |
| `qbr-points-v1` | `src/lib/qbr/talking-points.ts` (QBR Prep, and the deck builder on a miss) | same, `src/lib/deck/preview.ts` | `slug\|meeting\|focus\|filed\|YYYY-Www` | `TalkingPoints` with `writtenAt` | about 3 KB each | 21 days, by `writtenAt` |
| `news-angles-v1` | `src/lib/ai/news-angles.ts` | same, `src/lib/qbr/gather.ts`, `src/lib/ask/answer.ts`, `src/components/overview/sections.tsx` | the story's URL | `{ relevance, angle }` | about 150 bytes each, 440 entries and growing | never |
| `commentary-v1` | `src/lib/ai/commentary.ts` | same | SEC accession number (`0000827054-26-000037`; the first ten digits are the filer's CIK) | `{ digest, filed, releaseUrl }` | about 2 to 3 KB each | never |

`ask-claude-v2` may still be on disk from before; nothing reads it.

Keys can be long (story URLs run to a few hundred characters) and contain any
character, so a database should store them as text, not as part of an identifier.

## Line card snapshots

`src/lib/store/snapshots.ts`, used only by `src/lib/line-cards/store.ts`. These stay
off the key-value `Store` because their files are part of the repo: snapshots under
`data/line-cards/<distributor>/<date>.json` are committed, shipped with the app,
pretty-printed for readable diffs and found by listing folders. The interface is:

```ts
interface SnapshotStore {
  distributors(): Promise<string[]>;
  dates(distributor: string): Promise<string[]>; // oldest first
  read<T>(distributor: string, date: string): Promise<T | null>;
  write<T>(distributor: string, date: string, snapshot: T): Promise<void>; // throws on failure
}
```

A snapshot is about 8 to 36 KB. Distributor slugs and dates are checked by the caller.

## Adding a database adapter

1. Write `src/lib/store/<name>.ts` returning a `Store` (and a `SnapshotStore`).
2. Add a `case` for it in `choose()` in `src/lib/store/index.ts` and set `STORE_ADAPTER`.
3. Nothing else changes.

What it must do:

- **Key-value table**: one row per `(ns, key)` with a JSON value and a write time.
  `get` and `set` are a single row; `getAll` reads one namespace (hundreds of rows,
  under 100 KB in total today); `setMany` is an upsert of several rows.
- **Expiry**: either delete rows older than `days` by applying `dateOf` to each row
  on write, or store the date it returns in a column and delete by that. The second
  is cheaper; `dateOf` reads only the key or the value already being written.
- **Never throw on write**: log and carry on, as the file adapter does.
- **Snapshots**: one row per `(distributor, date)` with the snapshot as JSON. The
  committed files under `data/line-cards` are the seed data to load once.
- Keep a small in-process memory in front if round trips are slow; results are
  immutable once written, so it needs no invalidation.

Do not point an adapter at the production Supabase project; it is read only.
