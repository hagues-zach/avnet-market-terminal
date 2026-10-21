import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { HOOKUPS, PILLAR_NAMES } from "@/lib/hookups";
import { GLOSSARY, METHODS, PRIMERS } from "@/lib/learn/content";
import { PageBody } from "@/components/layout/page-body";
import { DataChip } from "@/components/ui/chip";
import { PageTitle } from "@/components/ui/page-title";
import { Panel } from "@/components/ui/panel";
import { GlossarySearch, RolePaths } from "@/components/learn/interactive";
import { MakerLine, MakerLineFallback } from "@/components/learn/makers";
import { cn } from "@/lib/utils";

// Learning Center (PRD section 8.1): paths by role, technology primers that end
// with who makes the part (live), the glossary, the methods and the sources.

export const dynamic = "force-dynamic";

const link = "text-ink underline-offset-2 hover:underline";
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

export default function LearnPage() {
  return (
    <PageBody>
      <PageTitle title="Learning Center" subtitle="Paths through the app by role, primers on the parts you sell, and how every number is made" />

      <p className="text-pretty text-xl leading-snug text-ink">
        New here? Pick your role for a path through the app, or start with a part family below.
      </p>

      <section id="paths" className="scroll-mt-16">
        <Panel title="Learning paths" subtitle="Five pages to open first, in order" bodyClassName="p-0">
          <RolePaths />
        </Panel>
      </section>

      <section id="primers" aria-labelledby="primers-title" className="scroll-mt-16 space-y-3">
        <div>
          <h2 id="primers-title" className="font-display text-section-title text-ink">
            Technology primers
          </h2>
          <p className="mt-0.5 text-caption text-ink-muted">
            What the part is, where it&apos;s used, what to ask the customer, and who makes it. Revenue growth is live from SEC filings
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PRIMERS.map((p) => (
            <article key={p.slug} className="flex flex-col rounded-sm border border-hairline bg-surface">
              <Link href={`/learn/${p.slug}`} className="block border-b border-hairline bg-canvas" tabIndex={-1} aria-hidden>
                <Image
                  src={`/learn/${p.slug}.jpg`}
                  alt=""
                  width={960}
                  height={717}
                  sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="aspect-video w-full object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col px-4 py-3">
                <h3 className="font-display text-card-title text-ink">
                  <Link href={`/learn/${p.slug}`} className={link}>
                    {p.name}
                  </Link>
                </h3>
                <p className="mt-1 text-body-sm text-ink-muted">{p.summary}</p>
                <p className="mt-3 font-display text-label uppercase text-ink-muted">Who makes it</p>
                <div className="mt-1 flex-1">
                  <Suspense fallback={<MakerLineFallback slugs={p.makers} />}>
                    <MakerLine slugs={p.makers} />
                  </Suspense>
                </div>
                <Link href={`/learn/${p.slug}`} className={cn(link, "mt-3 text-body-sm")}>
                  Read the primer<span className="sr-only">: {p.name}</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <section id="glossary" className="scroll-mt-16 xl:col-span-7">
          <Panel title="Glossary" subtitle="The terms used across the app">
            <GlossarySearch entries={GLOSSARY} />
          </Panel>
        </section>
        <section id="methods" className="scroll-mt-16 xl:col-span-5">
          <Panel title="How numbers are calculated">
            <dl className="divide-y divide-hairline">
              {METHODS.map((m) => (
                <div key={m.title} className="py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-body-strong text-ink">
                    {m.href ? (
                      <Link href={m.href} className={link}>
                        {m.title}
                      </Link>
                    ) : (
                      m.title
                    )}
                  </dt>
                  <dd className="mt-0.5 text-body-sm text-ink-muted">{m.body}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </section>
      </div>

      <section id="sources" className="scroll-mt-16">
        <Panel
          title="Where the numbers come from"
          subtitle="Every source in the app, what it is, how often it refreshes, and whether it is connected"
          bodyClassName="p-0"
          footer={
            <Link href="/data-hookups" className={cn(link, "ml-auto")}>
              Technical detail in Data Hookups
            </Link>
          }
        >
          <div role="region" aria-label="Data sources" tabIndex={0} className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse font-body text-table">
              <caption className="sr-only">
                Data sources: what each is, its pillar, whether it is live, mock or planned, and how often it refreshes.
              </caption>
              <thead className="bg-surface-sunken">
                <tr className="border-b border-hairline">
                  <th scope="col" className={cn(TH, "text-left")}>
                    Source
                  </th>
                  <th scope="col" className={cn(TH, "text-left")}>
                    Pillar
                  </th>
                  <th scope="col" className={cn(TH, "text-left")}>
                    Status
                  </th>
                  <th scope="col" className={cn(TH, "text-left")}>
                    Refresh
                  </th>
                </tr>
              </thead>
              <tbody>
                {HOOKUPS.map((h) => (
                  <tr key={h.id} className="border-b border-hairline align-top last:border-b-0">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <span className="text-ink">{h.name}</span>
                      <span className="block text-caption text-ink-muted">{h.description}</span>
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{PILLAR_NAMES[h.pillar]}</td>
                    <td className="px-3 py-2">
                      <DataChip status={h.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{h.refresh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <p id="walkthroughs" className="flex flex-wrap items-center gap-2 text-body-sm text-ink">
        <span className="font-display text-card-title">Walkthroughs</span>
        <DataChip status="planned" />
        <span className="text-ink-muted">Short videos for each role, to be recorded.</span>
      </p>
    </PageBody>
  );
}
