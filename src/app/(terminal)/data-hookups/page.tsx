import Link from "next/link";
import { HOOKUPS, PILLAR_NAMES, type DataPillar, type HookupStatus } from "@/lib/hookups";
import * as specs from "@/lib/shells/specs";
import type { ShellSpec } from "@/lib/shells/types";
import { LEGACY } from "@/lib/shells/legacy";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ROUTES: Record<string, string> = {
  START: "/start",
  PERFORMANCE_SPEC: "/performance",
  MARKET_SHARE_SPEC: "/market-share",
  SUPPLY_CHAIN_SPEC: "/supply-chain",
  PIPELINE_SPEC: "/design-pipeline",
  CUSTOMERS_SPEC: "/customers",
  QBR_SPEC: "/tools/qbr",
  DECK_SPEC: "/tools/deck",
  LEADS_SPEC: "/tools/leads",
  MAPPING_SPEC: "/tools/mapping",
};

const STATUS_STYLE: Record<HookupStatus, string> = {
  live: "border-avnet-green text-ink",
  mock: "border-dashed border-accent-yellow text-ink",
  planned: "border-line text-muted",
};
const STATUS_LABEL: Record<HookupStatus, string> = { live: "Live", mock: "Mock in place", planned: "Planned" };
const ORDER: DataPillar[] = ["internal", "licensed", "derived", "open"];

export default function DataHookupsPage() {
  // Which pages use each hookup, from the shell specs and the older mock pages.
  const usedBy = new Map<string, { title: string; href: string }[]>();
  const add = (id: string, page: { title: string; href: string }) => {
    const list = usedBy.get(id) ?? [];
    if (!list.some((p) => p.href === page.href)) list.push(page);
    usedBy.set(id, list);
  };
  for (const [name, spec] of Object.entries(specs) as [string, ShellSpec][]) {
    const href = ROUTES[name];
    if (href) for (const s of spec.sections) for (const id of s.hookups) add(id, { title: spec.title, href });
  }
  for (const [href, page] of Object.entries(LEGACY)) for (const id of page.hookups) add(id, { title: page.title, href });

  const counts = (s: HookupStatus) => HOOKUPS.filter((h) => h.status === s).length;

  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">
      <PageHeader title="Data Hookups" subtitle="Every data source the app needs, where it is used, and what is still mock" />
      <div className="grid grid-cols-3 gap-3">
        {(["live", "mock", "planned"] as const).map((s) => (
          <div key={s} className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
            <span className="font-display text-2xs uppercase tracking-wider text-muted">{STATUS_LABEL[s]}</span>
            <div className="mt-1.5 font-display text-2xl tabular text-ink">{counts(s)}</div>
          </div>
        ))}
      </div>
      {ORDER.map((pillar) => (
        <Card key={pillar} title={PILLAR_NAMES[pillar]} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr className="border-b border-line text-left font-display text-2xs uppercase tracking-wider text-muted">
                  <th scope="col" className="px-4 py-2 font-normal">
                    Source
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    Tables, files or endpoints
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    Refresh
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    Used by
                  </th>
                </tr>
              </thead>
              <tbody>
                {HOOKUPS.filter((h) => h.pillar === pillar).map((h) => (
                  <tr key={h.id} id={h.id} className="border-b border-line align-top last:border-b-0">
                    <th scope="row" className="w-64 px-4 py-2 text-left font-normal">
                      <span className="font-medium text-ink">{h.name}</span>
                      <span className="mt-0.5 block text-2xs text-muted">{h.description}</span>
                      {h.notes && <span className="mt-0.5 block text-2xs text-muted">{h.notes}</span>}
                    </th>
                    <td className="px-3 py-2">
                      <span className={cn("whitespace-nowrap rounded border px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider", STATUS_STYLE[h.status])}>
                        {STATUS_LABEL[h.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <ul className="space-y-0.5 font-mono text-2xs text-ink">
                        {h.sources.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      {h.fields && <p className="mt-1 text-2xs text-muted">Fields: {h.fields.join(", ")}</p>}
                      {h.replaceIn && <p className="mt-0.5 text-2xs text-muted">Mock lives in {h.replaceIn}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">{h.refresh}</td>
                    <td className="px-3 py-2">
                      {(usedBy.get(h.id) ?? []).length === 0 ? (
                        <span className="text-muted">{h.status === "live" ? "Live pages" : "Not yet on a page"}</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {usedBy.get(h.id)!.map((p) => (
                            <li key={p.href}>
                              <Link href={p.href} className="text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark">
                                {p.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      <p className="px-1 text-2xs text-muted">
        The register is src/lib/hookups.ts. When a source is connected, set its status to live and replace the mock module it
        names; every page and marker that uses it updates. Table and view names are from the PRD and have not been checked
        against the Databricks workspace.
      </p>
    </div>
  );
}
