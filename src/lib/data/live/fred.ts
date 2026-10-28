// FRED series as a keyless CSV download. Shared by the cycle engine's history
// script and the exchange rates foreign earnings are converted at.

export interface FredPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

/** "observation_date,ID" rows; "." marks a day with no observation and is skipped. */
export function parseFredCsv(text: string): FredPoint[] {
  return text
    .trim()
    .split("\n")
    .slice(1)
    .flatMap((r) => {
      const [date, v] = r.trim().split(",");
      const value = Number(v);
      return v && v !== "." && Number.isFinite(value) ? [{ date, value }] : [];
    });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The series from `since` (YYYY-MM-DD) on, or all of it. Retries twice before failing. */
export async function fred(id: string, since?: string): Promise<FredPoint[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}${since ? `&cosd=${since}` : ""}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: "no-store" }).catch(() => null);
    if (res?.ok) return parseFredCsv(await res.text());
    await sleep(2000 * attempt);
  }
  throw new Error(`FRED didn't return ${id}`);
}
