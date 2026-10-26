import { cache } from "react";
import type { AccountFigures, AvnetInputs } from "./contracts";
import { buildModel, type AvnetModel } from "./derive";
import { mockSource } from "./mock";
import { METHODS, type AvnetData } from "./source";

// Avnet's own data, from the adapter AVNET_DATA names: "mock" (the default) or
// "databricks". Server-only. Pages call getAvnet() once and read the figures
// they need from the model; nothing else imports the mock datasets.
//
// AVNET_DATA=databricks without its settings fails with a clear error. It never
// falls back to mock numbers, so a page can't show synthetic figures as Avnet's.
// Datasets not in Databricks yet can be taken from the mock on purpose, by name:
// AVNET_MOCK_DATASETS=markets,supply. Pages then mark Avnet's figures as mock.

export type { AvnetModel } from "./derive";

/** How long real figures are kept between queries. Avnet's tables refresh daily. */
const KEEP_MS = Number(process.env.AVNET_CACHE_MINUTES ?? 15) * 60_000;

const DATASETS = [...METHODS, "account"] as const;

/** The datasets AVNET_MOCK_DATASETS names. An unknown name is an error, not ignored. */
export function mockedDatasets(env: Record<string, string | undefined> = process.env): (typeof DATASETS)[number][] {
  const names = (env.AVNET_MOCK_DATASETS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = names.filter((n) => !(DATASETS as readonly string[]).includes(n));
  if (unknown.length) throw new Error(`Unknown AVNET_MOCK_DATASETS ${unknown.join(", ")}. Use any of ${DATASETS.join(", ")}.`);
  return names as (typeof DATASETS)[number][];
}

/** An adapter with the named datasets taken from the mock instead. */
export function withMock(source: AvnetData, names: readonly (typeof DATASETS)[number][]): AvnetData {
  if (!names.length) return source;
  const mock = mockSource();
  const out = { ...source, name: source.name } as Record<string, unknown>;
  for (const n of names) out[n] = mock[n];
  return out as unknown as AvnetData;
}

export async function avnetSource(): Promise<AvnetData> {
  const adapter = process.env.AVNET_DATA ?? "mock";
  switch (adapter) {
    case "mock":
      return mockSource();
    case "databricks": {
      const { databricksSource } = await import("./databricks/adapter");
      return withMock(databricksSource(), mockedDatasets());
    }
    default:
      throw new Error(`Unknown AVNET_DATA "${adapter}". Use "mock" or "databricks".`);
  }
}

/** Every dataset from one adapter, in parallel. */
export async function loadInputs(source: AvnetData): Promise<AvnetInputs> {
  const [fiscalCalendar, performance, segments, regions, suppliers, verticals, pipeline, customers, codeMap, supply, markets] = await Promise.all([
    source.fiscalCalendar(),
    source.performance(),
    source.segments(),
    source.regions(),
    source.suppliers(),
    source.verticals(),
    source.pipeline(),
    source.customers(),
    source.codeMap(),
    source.supply(),
    source.markets(),
  ]);
  return { fiscalCalendar, performance, segments, regions, suppliers, verticals, pipeline, customers, codeMap, supply, markets };
}

let kept: { at: number; model: Promise<AvnetModel> } | null = null;

async function load(): Promise<AvnetModel> {
  const source = await avnetSource();
  return buildModel(await loadInputs(source), source.name, source.name === "mock" ? [] : mockedDatasets());
}

/** The model, built at most once per request and kept for AVNET_CACHE_MINUTES across requests. A failed load isn't kept. */
export const getAvnet = cache(async (): Promise<AvnetModel> => {
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.model;
  const model = load();
  kept = { at: Date.now(), model };
  model.catch(() => {
    if (kept?.model === model) kept = null;
  });
  return model;
});

/** One company's business with Avnet, once per request. Kept with the model's other figures for AVNET_CACHE_MINUTES. */
const accounts = new Map<string, { at: number; figures: Promise<AccountFigures | null> }>();

export const getAccount = cache(async (slug: string, name: string, supplier: boolean): Promise<{ figures: AccountFigures | null; status: "mock" | "live" }> => {
  const source = await avnetSource();
  const key = `${source.name}:${slug}:${supplier}`;
  let hit = accounts.get(key);
  if (!hit || Date.now() - hit.at >= KEEP_MS) {
    hit = { at: Date.now(), figures: source.account({ slug, name, supplier }) };
    accounts.set(key, hit);
    hit.figures.catch(() => accounts.delete(key));
  }
  return { figures: await hit.figures, status: source.name === "mock" || mockedDatasets().includes("account") ? "mock" : "live" };
});
