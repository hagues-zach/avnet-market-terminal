import Link from "next/link";
import { HOOKUPS, PILLAR_NAMES } from "@/lib/hookups";
import { CONNECTION_ORDER } from "@/lib/data-hookups/order";
import { PAGE_HOOKUPS } from "@/lib/data-hookups/pages";
import { byCloseness, countBy, lead, nextStep, readPages, readSteps, unscheduled } from "@/lib/data-hookups/read";
import { NAV } from "@/components/layout/nav";
import { PageBody } from "@/components/layout/page-body";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageTitle } from "@/components/ui/page-title";
import { HookupsWorkbench } from "@/components/hookups/workbench";

// Data Hookups (PRD 10.3): every source the app needs, what each takes, the
// pages it feeds and the phase 5 order. Built from the register in
// src/lib/hookups.ts and the page usage in src/lib/data-hookups/pages.ts, so
// nothing here is mock: changing a status to "live" changes this page.

const link = "text-ink underline-offset-2 hover:underline";

export default function DataHookupsPage() {
  const pages = readPages(HOOKUPS, PAGE_HOOKUPS);
  const marked = pages.filter((p) => p.pending.length > 0).length;
  const steps = readSteps(HOOKUPS, PAGE_HOOKUPS, CONNECTION_ORDER);
  const live = HOOKUPS.filter((h) => h.status === "live");
  const register = { status: "live" as const, label: "Register" };

  return (
    <PageBody>
      <PageTitle title="Data Hookups" subtitle="Every data source the app needs, what each one takes, and the order the data team connects them" />

      <h2 className="text-pretty text-xl leading-snug text-ink">{lead(HOOKUPS, PAGE_HOOKUPS, CONNECTION_ORDER)}</h2>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label="Live"
          value={String(live.length)}
          note={live.every((h) => h.pillar === "open") ? "all open data" : undefined}
          source={register}
        />
        <KpiTile label="Mock" value={String(countBy(HOOKUPS, "mock"))} note="a mock stands in" source={register} />
        <KpiTile label="Planned" value={String(countBy(HOOKUPS, "planned"))} note="nothing in place yet" source={register} />
        <KpiTile label="Pages with a mock marker" value={`${marked} of ${NAV.length}`} note="in the navigation" source={register} />
      </div>

      <HookupsWorkbench
        hookups={HOOKUPS}
        pillars={PILLAR_NAMES}
        steps={steps.map((s) => ({
          step: s.step,
          name: s.name,
          status: s.status,
          live: s.live,
          total: s.ids.length,
          ids: s.ids,
          reach: s.reach.map((p) => p.href),
          completes: s.completes.map((p) => p.title),
        }))}
        next={nextStep(steps)?.step}
        unscheduled={unscheduled(HOOKUPS, CONNECTION_ORDER).map((h) => h.name)}
        pageRows={byCloseness(pages).map((p) => ({ href: p.href, title: p.title, ids: p.ids, live: p.live }))}
      />

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-caption text-ink-muted">
        <p className="max-w-[90ch]">
          Table and view names are from the PRD and have not been checked against the Databricks workspace. Sources are queried in place, never copied
          (build plan, step 5.1). To connect one, set its status to live in{" "}
          <span translate="no" className="font-mono text-micro">
            src/lib/hookups.ts
          </span>{" "}
          and replace the mock module it names; every marker that uses it clears.
        </p>
        <Link href="/learn#sources" className={`${link} ml-auto text-body-sm`}>
          Sellers see these sources in plain words in the Learning Center
        </Link>
      </div>
    </PageBody>
  );
}
