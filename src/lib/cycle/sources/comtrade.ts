// Korea's exports of electronic integrated circuits (HS 8542) to the world, by
// month, from UN Comtrade's public preview API (no key; one month per call, rate
// limited). Comtrade carries Korea Customs' figures about nine months after the
// month; Korea Customs' own API is current and replaces this once a key is set
// up. Pure: the history script fetches, this reads the response.

export const KOREA = 410;
export const HS_CHIPS = "8542";

export const comtradeUrl = (yyyymm: string, reporter = KOREA, cmd = HS_CHIPS) =>
  `https://comtradeapi.un.org/public/v1/preview/C/M/HS?reporterCode=${reporter}&period=${yyyymm}&cmdCode=${cmd}&flowCode=X&partnerCode=0`;

export type ComtradeResult = { kind: "value"; month: string; value: number } | { kind: "none" } | { kind: "rate-limited"; retryAfter: number } | { kind: "error"; message: string };

/** One month's response: its export value in US dollars, nothing yet, or a rate limit. */
export function parseComtrade(body: unknown): ComtradeResult {
  if (!body || typeof body !== "object") return { kind: "error", message: "Not JSON" };
  const b = body as { statusCode?: number; message?: string; count?: number; data?: { period?: string | number; primaryValue?: number; partnerCode?: number; flowCode?: string }[]; error?: string };
  if (b.statusCode === 429) return { kind: "rate-limited", retryAfter: Number(b.message?.match(/(\d+) seconds?/)?.[1] ?? 5) };
  if (b.error) return { kind: "error", message: b.error };
  const row = (b.data ?? []).find((r) => r.partnerCode === 0 && r.flowCode === "X" && typeof r.primaryValue === "number");
  if (!row) return { kind: "none" };
  const p = String(row.period);
  return { kind: "value", month: `${p.slice(0, 4)}-${p.slice(4, 6)}`, value: row.primaryValue! };
}

/** The months from `from` to `to` inclusive, as YYYYMM. */
export function periods(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
