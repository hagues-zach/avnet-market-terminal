import { unstable_cache } from "next/cache";

// Economic Signals on open data. Five public sources, none needing an API key:
// Federal Reserve G.17 (production, utilization), BLS (producer prices,
// employment), IMF Primary Commodity Prices (metals), US Treasury and the New
// York Fed (rates), and ECB reference rates via Frankfurter (currency).
// Server-only. Each source is cached on its own, and a failed fetch is never
// cached, so one outage neither blanks the page nor sticks.

const REVALIDATE_SECONDS = 6 * 60 * 60;
const USER_AGENT = "MarketTerminal/0.1 (news reader)";
const TIMEOUT_MS = 20_000;
const MONTHS_KEPT = 36;
const DAILY_DAYS_KEPT = 400;
const DAY = 86_400_000;

export type SignalGroup = "activity" | "prices" | "inputs" | "rates" | "currency";

export const GROUP_LABELS: Record<SignalGroup, string> = {
  activity: "Industry activity",
  prices: "Producer prices",
  inputs: "Input metals",
  rates: "Interest rates",
  currency: "Currency",
};

export const GROUP_ORDER: SignalGroup[] = ["activity", "prices", "inputs", "rates", "currency"];

/** How a value is printed. Rates and utilization are levels in percent, so they change in points. */
export type SignalUnit = "index" | "percent" | "usd" | "thousands" | "fx";

export interface SignalPoint {
  date: string; // YYYY-MM for monthly series, YYYY-MM-DD for daily
  value: number;
}

export interface Signal {
  key: string;
  label: string;
  group: SignalGroup;
  unit: SignalUnit;
  frequency: "monthly" | "daily";
  source: string;
  /** A short qualifier shown under the label, e.g. the index base or the quote convention. */
  detail: string;
  /** Whether a rise is good news for the supply chain; null when it depends on where you sit. */
  upIsGood: boolean | null;
  points: SignalPoint[]; // oldest → newest
}

export interface Signals {
  signals: Signal[];
  failed: string[];
  fetchedAt: string;
}

async function get(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json, text/plain, text/csv, */*", ...init?.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res;
}

const lastMonths = (points: SignalPoint[]) => points.sort((a, b) => a.date.localeCompare(b.date)).slice(-MONTHS_KEPT);
const lastDays = (points: SignalPoint[]) => {
  const cutoff = new Date(Date.now() - DAILY_DAYS_KEPT * DAY).toISOString().slice(0, 10);
  return points.filter((p) => p.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
};
const isoDaysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);

// ---- Federal Reserve G.17 ----
// Fixed-width text: a quoted series code, a year, then up to twelve monthly values.

function g17Series(text: string, code: string): SignalPoint[] {
  const out: SignalPoint[] = [];
  const prefix = `"${code}"`;
  for (const line of text.split("\n")) {
    if (!line.startsWith(prefix)) continue;
    const cells = line.slice(prefix.length).trim().split(/\s+/);
    const year = Number(cells[0]);
    if (!Number.isInteger(year)) continue;
    cells.slice(1, 13).forEach((cell, i) => {
      const value = Number(cell);
      if (cell !== "" && Number.isFinite(value)) out.push({ date: `${year}-${String(i + 1).padStart(2, "0")}`, value });
    });
  }
  if (!out.length) throw new Error(`G.17 series ${code} not found`);
  return lastMonths(out);
}

async function fromFed(): Promise<Signal[]> {
  const base = "https://www.federalreserve.gov/releases/g17/Current/ipdisk";
  const [ip, utl] = await Promise.all([get(`${base}/ip_sa.txt`).then((r) => r.text()), get(`${base}/utl_sa.txt`).then((r) => r.text())]);
  const fed = { group: "activity" as const, frequency: "monthly" as const, source: "Federal Reserve G.17" };
  return [
    { ...fed, key: "ip-semis", label: "Semiconductor and component production", unit: "index", detail: "Index, 2017 = 100, seasonally adjusted", upIsGood: true, points: g17Series(ip, "G3344") },
    { ...fed, key: "ip-electronics", label: "Computer and electronic product production", unit: "index", detail: "Index, 2017 = 100, seasonally adjusted", upIsGood: true, points: g17Series(ip, "G334") },
    { ...fed, key: "ip-total", label: "Total industrial production", unit: "index", detail: "Index, 2017 = 100, seasonally adjusted", upIsGood: true, points: g17Series(ip, "B50001") },
    { ...fed, key: "util-semis", label: "Capacity utilization, semiconductors and components", unit: "percent", detail: "Percent of capacity, seasonally adjusted", upIsGood: true, points: g17Series(utl, "G3344") },
  ];
}

// ---- Bureau of Labor Statistics ----
// One keyless POST covers every series; unregistered callers get 25 requests a day.

const BLS_SERIES: Omit<Signal, "points" | "frequency" | "source">[] = [
  { key: "PCU334413334413", label: "Semiconductor producer prices", group: "prices", unit: "index", detail: "Producer price index, semiconductors and related devices", upIsGood: null },
  { key: "PCU334417334417", label: "Connector producer prices", group: "prices", unit: "index", detail: "Producer price index, electronic connectors", upIsGood: null },
  { key: "PCU334412334412", label: "Printed circuit board producer prices", group: "prices", unit: "index", detail: "Producer price index, bare printed circuit boards", upIsGood: null },
  { key: "CES3133440001", label: "Semiconductor and component employment", group: "activity", unit: "thousands", detail: "US jobs, thousands, seasonally adjusted", upIsGood: true },
];

interface BlsResponse {
  status?: string;
  Results?: { series?: { seriesID: string; data: { year: string; period: string; value: string }[] }[] };
}

async function fromBls(): Promise<Signal[]> {
  const year = new Date().getUTCFullYear();
  const res = await get("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seriesid: BLS_SERIES.map((s) => s.key), startyear: String(year - 3), endyear: String(year) }),
  });
  const body = (await res.json()) as BlsResponse;
  if (body.status !== "REQUEST_SUCCEEDED") throw new Error("BLS request did not succeed");
  const out: Signal[] = [];
  for (const meta of BLS_SERIES) {
    const data = body.Results?.series?.find((s) => s.seriesID === meta.key)?.data ?? [];
    const points = data
      // M13 is the annual average.
      .filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period) && Number.isFinite(Number(d.value)))
      .map((d) => ({ date: `${d.year}-${d.period.slice(1)}`, value: Number(d.value) }));
    if (points.length) out.push({ ...meta, frequency: "monthly", source: "Bureau of Labor Statistics", points: lastMonths(points) });
  }
  if (!out.length) throw new Error("BLS returned no data");
  return out;
}

// ---- IMF Primary Commodity Prices ----

const IMF_SERIES: Record<string, { label: string; detail: string }> = {
  PCOPP: { label: "Copper", detail: "US dollars per tonne · connectors, cable, leadframes" },
  PTIN: { label: "Tin", detail: "US dollars per tonne · solder" },
  PNICK: { label: "Nickel", detail: "US dollars per tonne · capacitors, plating" },
  PALUM: { label: "Aluminum", detail: "US dollars per tonne · capacitors, heat sinks" },
};

interface ImfResponse {
  data?: {
    dataSets?: { series?: Record<string, { observations?: Record<string, (string | null)[]> }> }[];
    structures?: {
      dimensions?: {
        series?: { id: string; values: { id: string }[] }[];
        observation?: { id: string; values: { value: string }[] }[];
      };
    }[];
  };
}

async function fromImf(): Promise<Signal[]> {
  const start = `${new Date().getUTCFullYear() - 3}-01`;
  const key = `G001.${Object.keys(IMF_SERIES).join("+")}.USD.M`;
  const res = await get(`https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.RES/PCPS/+/${key}?c%5BTIME_PERIOD%5D=ge:${start}`);
  const data = ((await res.json()) as ImfResponse).data;
  const dims = data?.structures?.[0]?.dimensions;
  const seriesDims = dims?.series ?? [];
  const indicatorAt = seriesDims.findIndex((d) => d.id === "INDICATOR");
  const periods = dims?.observation?.[0]?.values.map((v) => v.value) ?? [];
  const out: Signal[] = [];
  for (const [seriesKey, series] of Object.entries(data?.dataSets?.[0]?.series ?? {})) {
    const code = seriesDims[indicatorAt]?.values[Number(seriesKey.split(":")[indicatorAt])]?.id;
    const meta = code ? IMF_SERIES[code] : undefined;
    if (!meta) continue;
    const points: SignalPoint[] = [];
    for (const [i, obs] of Object.entries(series.observations ?? {})) {
      const period = periods[Number(i)]?.replace("-M", "-"); // 2026-M05 → 2026-05
      const value = Number(obs[0]);
      if (period && obs[0] !== null && Number.isFinite(value)) points.push({ date: period, value });
    }
    if (points.length) {
      out.push({ key: `imf-${code}`, group: "inputs", unit: "usd", frequency: "monthly", source: "IMF Primary Commodity Prices", upIsGood: false, ...meta, points: lastMonths(points) });
    }
  }
  if (!out.length) throw new Error("IMF returned no data");
  return Object.keys(IMF_SERIES).flatMap((code) => out.filter((s) => s.key === `imf-${code}`));
}

// ---- Rates: US Treasury par yields and the New York Fed's effective federal funds rate ----

function treasuryYields(csv: string): Record<"2 Yr" | "10 Yr", SignalPoint[]> {
  const [head, ...rows] = csv.trim().split("\n");
  const cols = head.split(",").map((c) => c.replace(/"/g, "").trim());
  const out = { "2 Yr": [] as SignalPoint[], "10 Yr": [] as SignalPoint[] };
  for (const row of rows) {
    const cells = row.split(",");
    const m = cells[0]?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) continue;
    for (const tenor of ["2 Yr", "10 Yr"] as const) {
      const value = Number(cells[cols.indexOf(tenor)]);
      if (Number.isFinite(value) && value > 0) out[tenor].push({ date: `${m[3]}-${m[1]}-${m[2]}`, value });
    }
  }
  return out;
}

async function fromRates(): Promise<Signal[]> {
  const year = new Date().getUTCFullYear();
  const treasury = (y: number) =>
    get(`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${y}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${y}&page&_format=csv`).then((r) => r.text());
  const [thisYear, lastYear, effr] = await Promise.all([
    treasury(year),
    treasury(year - 1),
    get(`https://markets.newyorkfed.org/api/rates/unsecured/effr/search.json?startDate=${isoDaysAgo(DAILY_DAYS_KEPT)}&endDate=${isoDaysAgo(0)}`).then(
      (r) => r.json() as Promise<{ refRates?: { effectiveDate: string; percentRate: number }[] }>,
    ),
  ]);
  const a = treasuryYields(thisYear);
  const b = treasuryYields(lastYear);
  const rate = { group: "rates" as const, unit: "percent" as const, frequency: "daily" as const, upIsGood: null };
  const funds = (effr.refRates ?? []).filter((r) => Number.isFinite(r.percentRate)).map((r) => ({ date: r.effectiveDate, value: r.percentRate }));
  return [
    { ...rate, key: "fed-funds", label: "Federal funds rate", source: "Federal Reserve Bank of New York", detail: "Effective rate, percent", points: lastDays(funds) },
    { ...rate, key: "ust-2y", label: "2-year Treasury yield", source: "US Treasury", detail: "Par yield, percent", points: lastDays([...a["2 Yr"], ...b["2 Yr"]]) },
    { ...rate, key: "ust-10y", label: "10-year Treasury yield", source: "US Treasury", detail: "Par yield, percent", points: lastDays([...a["10 Yr"], ...b["10 Yr"]]) },
  ].filter((s) => s.points.length > 0);
}

// ---- Currency: ECB reference rates, served by the open Frankfurter API ----

const CURRENCIES: Record<string, string> = { EUR: "Euro", JPY: "Japanese yen", CNY: "Chinese yuan", KRW: "Korean won" };

async function fromFx(): Promise<Signal[]> {
  const symbols = Object.keys(CURRENCIES).join(",");
  const res = await get(`https://api.frankfurter.dev/v1/${isoDaysAgo(DAILY_DAYS_KEPT)}..?base=USD&symbols=${symbols}`);
  const body = (await res.json()) as { rates?: Record<string, Record<string, number>> };
  const out: Signal[] = Object.entries(CURRENCIES).map(([code, name]) => ({
    key: `fx-${code}`,
    label: name,
    group: "currency",
    unit: "fx",
    frequency: "daily",
    source: "European Central Bank",
    detail: `${code} per US dollar · a rise means a stronger dollar`,
    upIsGood: null,
    points: lastDays(
      Object.entries(body.rates ?? {})
        .filter(([, r]) => Number.isFinite(r[code]))
        .map(([date, r]) => ({ date, value: r[code] })),
    ),
  }));
  if (!out.some((s) => s.points.length)) throw new Error("Frankfurter returned no data");
  return out.filter((s) => s.points.length > 0);
}

const SOURCES: { name: string; load: () => Promise<Signal[]> }[] = [
  { name: "Federal Reserve G.17", load: fromFed },
  { name: "Bureau of Labor Statistics", load: fromBls },
  { name: "IMF commodity prices", load: fromImf },
  { name: "Treasury and New York Fed rates", load: fromRates },
  { name: "ECB exchange rates", load: fromFx },
].map((s, i) => ({ name: s.name, load: unstable_cache(s.load, [`signals-v1-${i}`], { revalidate: REVALIDATE_SECONDS }) }));

export async function getSignals(): Promise<Signals> {
  const settled = await Promise.allSettled(SOURCES.map((s) => s.load()));
  const signals: Signal[] = [];
  const failed: string[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") signals.push(...s.value);
    else failed.push(SOURCES[i].name);
  });
  return { signals, failed, fetchedAt: new Date().toISOString() };
}

// ---- Shared maths for the page ----

export interface SignalChange {
  /** Relative change for indexes and prices; change in points for percent-level series. */
  value: number;
  inPoints: boolean;
}

function changeFrom(signal: Signal, earlier: SignalPoint | undefined): SignalChange | undefined {
  const last = signal.points[signal.points.length - 1];
  if (!last || !earlier || earlier === last) return undefined;
  if (signal.unit === "percent") return { value: last.value - earlier.value, inPoints: true };
  return earlier.value === 0 ? undefined : { value: last.value / earlier.value - 1, inPoints: false };
}

/** The point about `days` before the latest one (monthly series: that many months back). */
function pointBefore(signal: Signal, months: number): SignalPoint | undefined {
  const { points } = signal;
  const last = points[points.length - 1];
  if (!last) return undefined;
  if (signal.frequency === "monthly") return points[points.length - 1 - months];
  const target = new Date(Date.parse(last.date) - months * 30.44 * DAY).toISOString().slice(0, 10);
  // Latest observation on or before the target date.
  return [...points].reverse().find((p) => p.date <= target);
}

export const monthChange = (s: Signal) => changeFrom(s, pointBefore(s, 1));
export const yearChange = (s: Signal) => changeFrom(s, pointBefore(s, 12));
