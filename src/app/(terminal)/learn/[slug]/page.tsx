import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GLOSSARY, PRIMERS, ROLES } from "@/lib/learn/content";
import { PageBody } from "@/components/layout/page-body";
import { DataChip } from "@/components/ui/chip";
import { PageTitle } from "@/components/ui/page-title";
import { LoadingBlock } from "@/components/ui/states";
import { MakerTable } from "@/components/learn/makers";
import { cn } from "@/lib/utils";

// One technology primer as a reading page: what the part is, where it's used,
// what to ask the customer, and the suppliers in the app that make it (live).

export const dynamic = "force-dynamic";

const link = "text-ink underline-offset-2 hover:underline";
const H2 = "font-display text-section-title text-ink";
const RAIL_LABEL = "font-display text-label uppercase text-ink-muted";

export default async function PrimerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = PRIMERS.findIndex((p) => p.slug === slug);
  if (i < 0) notFound();
  const p = PRIMERS[i];
  const prev = PRIMERS[i - 1];
  const next = PRIMERS[i + 1];
  const related = GLOSSARY.filter((g) => p.related.includes(g.term));

  return (
    <PageBody>
      <PageTitle
        title={p.name}
        subtitle={p.summary}
        breadcrumb={[{ label: "Learning Center", href: "/learn" }, { label: "Technology primers", href: "/learn#primers" }, { label: p.name }]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <nav
          aria-label="Learning Center"
          className="rounded-sm border border-hairline bg-surface px-4 py-3 text-body-sm lg:sticky lg:top-16 lg:col-span-3"
        >
          <p className={RAIL_LABEL}>Paths by role</p>
          <ul className="mt-1 space-y-1">
            {ROLES.map((r) => (
              <li key={r.id}>
                <Link href="/learn#paths" className={link}>
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className={cn(RAIL_LABEL, "mt-4")}>Technology primers</p>
          <ul className="mt-1 space-y-1">
            {PRIMERS.map((x) => {
              const current = x.slug === p.slug;
              return (
                <li key={x.slug}>
                  <Link
                    href={`/learn/${x.slug}`}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "-ml-4 block border-l-[3px] pl-[13px]",
                      current ? "border-primary font-semibold text-ink" : "border-transparent text-ink hover:underline",
                    )}
                  >
                    {x.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className={cn(RAIL_LABEL, "mt-4")}>Reference</p>
          <ul className="mt-1 space-y-1">
            <li>
              <Link href="/learn#glossary" className={link}>
                Glossary
              </Link>
            </li>
            <li>
              <Link href="/learn#methods" className={link}>
                Methods
              </Link>
            </li>
            <li>
              <Link href="/learn#sources" className={link}>
                Data sources
              </Link>
            </li>
            <li className="flex items-center gap-2 text-ink-muted">
              Walkthroughs <DataChip status="planned" />
            </li>
          </ul>
        </nav>

        <article className="space-y-6 rounded-sm border border-hairline bg-surface px-6 py-5 lg:col-span-9">
          <figure className="overflow-hidden rounded-sm border border-hairline">
            <Image
              src={`/learn/${p.slug}.jpg`}
              alt={p.alt}
              width={960}
              height={717}
              sizes="(min-width: 1024px) 60vw, 100vw"
              priority
              className="aspect-video w-full object-cover"
            />
          </figure>

          <section aria-labelledby="what" className="max-w-prose">
            <h2 id="what" className={H2}>
              What it is
            </h2>
            <p className="mt-2 text-body text-ink">{p.whatItIs}</p>
          </section>

          <section aria-labelledby="uses" className="max-w-prose border-t border-hairline pt-5">
            <h2 id="uses" className={H2}>
              Where it&apos;s used
            </h2>
            <dl className="mt-2 space-y-1.5 text-body">
              {p.uses.map((u) => (
                <div key={u.name}>
                  <dt className="inline font-semibold text-ink">{u.name}: </dt>
                  <dd className="inline text-ink">{u.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="ask" className="max-w-prose border-t border-hairline pt-5">
            <h2 id="ask" className={H2}>
              Questions to ask the customer
            </h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-body text-ink">
              {p.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="makers" className="border-t border-hairline pt-5">
            <h2 id="makers" className={H2}>
              Who makes it
            </h2>
            <div className="mt-2">
              <Suspense fallback={<LoadingBlock label="Loading the makers' filings…" lines={4} />}>
                <MakerTable slugs={p.makers} />
              </Suspense>
            </div>
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-body-sm">
              <Link href={`/tools/deck?primer=${p.slug}&from=learn`} className={link}>
                Build a pitch
              </Link>
              <Link href={`/tools/leads?primer=${p.slug}`} className={link}>
                Find leads
              </Link>
              <Link href="/line-cards" className={link}>
                Who carries these suppliers
              </Link>
            </p>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="terms" className="border-t border-hairline pt-5">
              <h2 id="terms" className={H2}>
                Related terms
              </h2>
              <dl className="mt-2 grid gap-x-6 gap-y-3 md:grid-cols-2">
                {related.map((g) => (
                  <div key={g.term}>
                    <dt className="text-body-strong text-ink">{g.term}</dt>
                    <dd className="text-body-sm text-ink-muted">{g.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <nav aria-label="Other primers" className="flex items-center justify-between gap-4 border-t border-hairline pt-4 text-body-sm">
            {prev ? (
              <Link href={`/learn/${prev.slug}`} className={cn(link, "inline-flex items-center gap-1")}>
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                Previous: {prev.name}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/learn/${next.slug}`} className={cn(link, "inline-flex items-center gap-1")}>
                Next: {next.name}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </Link>
            )}
          </nav>
        </article>
      </div>
    </PageBody>
  );
}
