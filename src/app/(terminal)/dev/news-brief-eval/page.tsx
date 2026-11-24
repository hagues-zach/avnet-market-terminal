import { readFile } from "node:fs/promises";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RUN_FILE, VOTES_NS, type Run, type Vote } from "@/lib/ai/news-brief-eval";
import type { ArticleBrief } from "@/lib/ai/news-brief";
import { store } from "@/lib/store";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { VoteForm } from "./vote-form";

// Dev only: blind side-by-side review of the Opus and Sonnet article briefs made
// by scripts/news-brief-eval.ts run. Which model wrote A and which wrote B is
// fixed per story and never shown here; scripts/news-brief-eval.ts report
// unblinds the totals. Not served in production.

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Brief model review" };

function BriefColumn({ label, brief, message }: { label: string; brief: ArticleBrief | null; message?: string }) {
  return (
    <div className="min-w-0 space-y-3">
      <h3 className="font-display text-card-title text-ink">Brief {label}</h3>
      {!brief ? (
        <p className="text-body-sm text-negative">
          No brief: {message ?? "the call failed."} Rerun the comparison to try this story again, or vote on the brief that exists.
        </p>
      ) : (
        <>
          <p className="text-body font-semibold leading-relaxed text-ink">{brief.takeaway}</p>
          <ol className="list-decimal space-y-1 pl-5 text-body-sm leading-relaxed text-ink marker:text-ink-muted">
            {brief.keyPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Why it matters to Avnet</p>
            <p className="mt-1 text-body-sm leading-relaxed text-ink">{brief.whyItMatters || "(nothing held up against the story)"}</p>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-ink-muted">What to watch</p>
            <p className="mt-1 text-body-sm leading-relaxed text-ink">{brief.watchFor || "(nothing held up against the story)"}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default async function BriefEvalPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const run = await readFile(RUN_FILE, "utf8")
    .then((t) => JSON.parse(t) as Run)
    .catch(() => undefined);
  const votes = await store.getAll<Vote>(VOTES_NS);

  return (
    <PageBody>
      <div className="space-y-4">
        <PageTitle
          title="Brief model review"
          subtitle={run ? `${Object.keys(votes).filter((s) => run.rows.some((r) => r.slug === s)).length} of ${run.rows.length} stories voted. Models are hidden; the report unblinds them.` : undefined}
        />
        {!run ? (
          <Panel>
            <p className="text-body text-ink">
              No run yet. Take a sample, then run both models: <code translate="no" className="break-words">npx tsx --env-file=.env.local scripts/news-brief-eval.ts sample</code>, then <code translate="no">… run</code>.
            </p>
          </Panel>
        ) : (
          run.rows.map((row, i) => {
            const [a, b] = row.order;
            return (
              <Panel
                key={row.slug}
                title={`${i + 1}. ${row.title}`}
                subtitle={row.outlet}
                actions={
                  <>
                    {row.relevance && <Chip>{row.relevance}</Chip>}
                    {row.thin && <Chip>Headline and teaser only</Chip>}
                    {votes[row.slug] && <Chip>Voted</Chip>}
                  </>
                }
              >
                <div className="space-y-4">
                  <a href={row.url} target="_blank" rel="noreferrer" className="text-body-sm text-ink underline underline-offset-2 hover:decoration-2">
                    Read the original<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <div className="grid gap-6 md:grid-cols-2 md:divide-x md:divide-hairline">
                    <BriefColumn label="A" brief={row.arms[a].brief} message={row.arms[a].message} />
                    <div className="md:pl-6">
                      <BriefColumn label="B" brief={row.arms[b].brief} message={row.arms[b].message} />
                    </div>
                  </div>
                  <VoteForm slug={row.slug} vote={votes[row.slug]} />
                </div>
              </Panel>
            );
          })
        )}
      </div>
    </PageBody>
  );
}
