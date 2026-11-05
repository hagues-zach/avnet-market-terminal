import { readFileSync } from "node:fs";
import path from "node:path";
import { CUSTOMERS } from "@/lib/data/live/tagging";

// Which customers in the universe are Avnet's top Americas customers. That list is
// internal, and this repo is public, so it never lives in the code: it is read
// from BRIEF_TOP_CUSTOMERS (names, comma-separated) or from
// data/private/top-customers.json (a JSON array of names, gitignored). With
// neither, no customer is flagged. On the Avnet machine it moves to Oracle with the
// profiles (phase B5). Server-only.

export const TOP_CUSTOMERS_FILE = path.join(process.cwd(), "data", "private", "top-customers.json");

const KNOWN = new Map(CUSTOMERS.map((c) => [c.name.toLowerCase(), c.name]));

/** Names as the universe writes them; unknown names are reported in `unknown`, not flagged. Pure. */
export function parseTopCustomers(names: string[]): { top: Set<string>; unknown: string[] } {
  const top = new Set<string>();
  const unknown: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const known = KNOWN.get(name.toLowerCase());
    if (known) top.add(known);
    else unknown.push(name);
  }
  return { top, unknown };
}

function readNames(env = process.env.BRIEF_TOP_CUSTOMERS, file = TOP_CUSTOMERS_FILE): string[] {
  if (env?.trim()) return env.split(",");
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

export function topCustomers(env?: string, file?: string): Set<string> {
  const { top, unknown } = parseTopCustomers(readNames(env, file));
  if (unknown.length) console.warn(`Top customers not in the customer universe, so not flagged: ${unknown.join(", ")}`);
  return top;
}
