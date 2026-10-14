"use server";

import { revalidatePath } from "next/cache";
import { collectAll } from "@/lib/line-cards/collect";
import { cleanName, DATE_PATTERN, distributorName, MAX_NAME_LENGTH, MAX_SUPPLIERS, SLUG_PATTERN } from "@/lib/line-cards/model";
import { writeSnapshot } from "@/lib/line-cards/store";

export interface ActionState {
  ok: boolean;
  messages: string[];
}

export async function collectNow(): Promise<ActionState> {
  const results = await collectAll();
  for (const r of results) if (r.snapshot) await writeSnapshot(r.snapshot);
  revalidatePath("/line-cards");
  return { ok: results.some((r) => r.ok), messages: results.map((r) => `${distributorName(r.distributor)}: ${r.message}`) };
}

/** Turn pasted text into supplier names: one per line, or the first column of a CSV. */
function parseList(text: string): string[] {
  const names: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // First CSV column, honouring a quoted value that contains commas.
    const first = line.startsWith('"') ? (line.match(/^"((?:[^"]|"")*)"/)?.[1].replace(/""/g, '"') ?? line) : line.split(/[,\t;]/)[0];
    const name = cleanName(first);
    if (name.length >= 2 && name.length <= MAX_NAME_LENGTH) names.push(name);
  }
  // A header row such as "Manufacturer" or "Supplier name" is not a supplier.
  if (names.length && /^(manufacturer|supplier|brand|line|name|vendor)( name)?s?$/i.test(names[0])) names.shift();
  return Array.from(new Set(names));
}

export async function importSnapshot(_prev: ActionState, form: FormData): Promise<ActionState> {
  const chosen = String(form.get("distributor") ?? "");
  const other = String(form.get("other") ?? "").trim();
  const distributor = chosen === "other" ? other.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : chosen;
  const date = String(form.get("date") ?? "");
  const source = String(form.get("source") ?? "").trim().slice(0, 200) || "Imported list";
  if (!SLUG_PATTERN.test(distributor)) return { ok: false, messages: ["Choose a distributor, or type a name for a new one."] };
  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(date))) return { ok: false, messages: ["Enter the date the list is from."] };
  if (date > new Date().toISOString().slice(0, 10)) return { ok: false, messages: ["The date cannot be in the future."] };
  const suppliers = parseList(String(form.get("list") ?? ""));
  if (suppliers.length < 2) return { ok: false, messages: ["Paste at least two supplier names, one per line."] };
  if (suppliers.length > MAX_SUPPLIERS) return { ok: false, messages: [`That is ${suppliers.length} names; the limit is ${MAX_SUPPLIERS}.`] };

  await writeSnapshot({ distributor, date, method: "imported", source, suppliers });
  revalidatePath("/line-cards");
  return { ok: true, messages: [`Saved ${suppliers.length} suppliers for ${distributorName(distributor)} as of ${date}.`] };
}
