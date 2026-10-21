// Data Hookups rules: what is live, which pages each source reaches, and what
// to connect next. Pure, so the test can run them against any register.
import type { Hookup, HookupStatus } from "@/lib/hookups";
import type { ConnectionStep } from "./order";
import type { PageHookups } from "./pages";

export type StepStatus = "Connected" | "In progress" | "Not started";

export interface StepRead extends ConnectionStep {
  status: StepStatus;
  live: number;
  /** Pages that show any of the step's sources not yet live. */
  reach: PageHookups[];
  /** Pages whose every outstanding source is in this step. */
  completes: PageHookups[];
}

export interface PageRead extends PageHookups {
  live: number;
  /** Ids still mock or planned. */
  pending: string[];
}

const isLive = (byId: Map<string, Hookup>, id: string) => byId.get(id)?.status === "live";
const index = (hookups: Hookup[]) => new Map(hookups.map((h) => [h.id, h]));

export const countBy = (hookups: Hookup[], status: HookupStatus) => hookups.filter((h) => h.status === status).length;

export function readPages(hookups: Hookup[], pages: PageHookups[]): PageRead[] {
  const byId = index(hookups);
  return pages.map((p) => {
    const pending = p.ids.filter((id) => !isLive(byId, id));
    return { ...p, live: p.ids.length - pending.length, pending };
  });
}

/** Closest to fully live first: fewest outstanding sources, then nav order. */
export const byCloseness = (pages: PageRead[]) =>
  pages
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.pending.length - b.p.pending.length || a.i - b.i)
    .map((x) => x.p);

export function readSteps(hookups: Hookup[], pages: PageHookups[], steps: ConnectionStep[]): StepRead[] {
  const byId = index(hookups);
  const read = readPages(hookups, pages);
  return steps.map((s) => {
    const live = s.ids.filter((id) => isLive(byId, id)).length;
    const open = s.ids.filter((id) => !isLive(byId, id));
    const reach = read.filter((p) => p.pending.some((id) => open.includes(id)));
    const completes = reach.filter((p) => p.pending.every((id) => open.includes(id)));
    const status: StepStatus = live === s.ids.length ? "Connected" : live > 0 ? "In progress" : "Not started";
    return { ...s, status, live, reach, completes };
  });
}

/** The first step in order that is not connected. */
export const nextStep = (steps: StepRead[]) => steps.find((s) => s.status !== "Connected");

/** The step that reaches the most pages; the earlier step wins a tie. */
export const widestStep = (steps: StepRead[]) =>
  steps.reduce<StepRead | undefined>((best, s) => (s.reach.length > (best?.reach.length ?? 0) ? s : best), undefined);

/** Ids in the register that no step covers. */
export const unscheduled = (hookups: Hookup[], steps: ConnectionStep[]) => {
  const planned = new Set(steps.flatMap((s) => s.ids));
  return hookups.filter((h) => h.status !== "live" && !planned.has(h.id));
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function lead(hookups: Hookup[], pages: PageHookups[], steps: ConnectionStep[]): string {
  const live = hookups.filter((h) => h.status === "live");
  const mock = countBy(hookups, "mock");
  const planned = countBy(hookups, "planned");
  const marked = readPages(hookups, pages).filter((p) => p.pending.length > 0).length;
  const allOpen = live.length > 0 && live.every((h) => h.pillar === "open");
  const first =
    `${live.length} of ${hookups.length} sources are live${allOpen ? (live.length === 1 ? ", open data" : ", all of them open data") : ""}. ` +
    `${mock} run on mock data and ${planned} ${planned === 1 ? "is" : "are"} planned; ${plural(marked, "page")} still ${marked === 1 ? "shows" : "show"} a mock marker.`;
  const read = readSteps(hookups, pages, steps);
  const next = nextStep(read);
  if (!next) return `${first} Every phase 5 step is connected.`;
  const wide = widestStep(read.filter((s) => s.status !== "Connected"));
  if (!wide || wide.step === next.step)
    return `${first} Next is step ${next.step}, ${next.sentence}, which reaches the most pages (${next.reach.length}).`;
  return `${first} Next is step ${next.step}, ${next.sentence}; step ${wide.step}, ${wide.sentence}, reaches the most pages (${wide.reach.length}).`;
}

/** Register search: name, id, description, tables and fields; not case-sensitive. */
export function matches(h: Hookup, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [h.name, h.id, h.description, h.notes ?? "", ...h.sources, ...(h.fields ?? [])].some((t) => t.toLowerCase().includes(q));
}
