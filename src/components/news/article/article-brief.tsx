import type { BriefResult } from "@/lib/ai/news-brief";
import type { LiveArticle } from "@/lib/data/live/shared";
import { Skeleton } from "@/components/ui/states";

// The article page's reading column, written by Claude in our own words
// (src/lib/ai/news-brief.ts). Two server components share one promise, so the
// takeaway sits under the headline while the sections sit under the byline.

/** One sentence under the headline. Nothing when there is no brief. */
export async function Takeaway({ brief }: { brief: Promise<BriefResult> }) {
  const { brief: b } = await brief;
  if (!b) return null;
  return <p className="max-w-[68ch] text-lg leading-relaxed text-ink">{b.takeaway}</p>;
}

export function TakeawayFallback() {
  return (
    <div aria-hidden className="max-w-[68ch] space-y-2">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline pt-5">
      <h2 className="font-display text-section-title text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export async function BriefSections({ brief, article }: { brief: Promise<BriefResult>; article: LiveArticle }) {
  const { brief: b, status, message } = await brief;

  if (!b) {
    // AI off or the call failed: the outlet's own teaser, clearly attributed, and why.
    return (
      <div className="space-y-5">
        <Section title="From the outlet">
          <p className="max-w-[68ch] text-body leading-relaxed text-ink">{article.summary || "The outlet published a headline only."}</p>
        </Section>
        <p className="text-caption text-ink-muted">
          {status === "off" ? message : `No summary yet: ${message ?? "the brief could not be written."} Reload to try again.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Key points">
        <ol className="max-w-[68ch] list-decimal space-y-2 pl-5 text-body leading-relaxed text-ink marker:text-ink-muted">
          {b.keyPoints.map((p, i) => (
            <li key={i} className="pl-1">
              {p}
            </li>
          ))}
        </ol>
      </Section>
      {/* Either can be empty when every sentence in it was dropped for a figure the story doesn't contain. */}
      {b.whyItMatters && (
        <Section title="Why it matters to Avnet">
          <p className="max-w-[68ch] text-body leading-relaxed text-ink">{b.whyItMatters}</p>
        </Section>
      )}
      {b.watchFor && (
        <Section title="What to watch">
          <p className="max-w-[68ch] text-body leading-relaxed text-ink">{b.watchFor}</p>
        </Section>
      )}
      <p className="border-t border-hairline pt-4 text-caption text-ink-muted">
        {b.thin
          ? `Summary by Claude from ${article.outlet}'s headline and teaser only; the full story may say more. Check the original before quoting it.`
          : `Summary by Claude from ${article.outlet}'s feed. Check the original before quoting it.`}
      </p>
    </div>
  );
}

export function BriefSectionsFallback() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Writing the summary…</span>
      {[4, 3, 1].map((lines, i) => (
        <div key={i} aria-hidden className="space-y-2 border-t border-hairline pt-5">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: lines }, (_, j) => (
            <Skeleton key={j} className={j === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"} />
          ))}
        </div>
      ))}
    </div>
  );
}
