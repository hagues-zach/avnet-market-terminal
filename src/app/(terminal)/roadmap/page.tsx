import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { Chip } from "@/components/ui/chip";
import { HighlightBar } from "@/components/ui/highlight-bar";
import { isCurrentQuarter, LAUNCH, quarterMonths, ROADMAP, ROADMAP_UPDATED, type RoadmapStatus } from "@/lib/roadmap/items";
import { cn } from "@/lib/utils";

// Rendered per request so "Now" follows the calendar.
export const dynamic = "force-dynamic";

const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const TONE: Record<RoadmapStatus, "positive" | "neutral"> = { Shipped: "positive", "In progress": "neutral", Planned: "neutral" };

export default function RoadmapPage() {
  const now = new Date();
  const launched = now >= new Date(`${LAUNCH.date}T00:00:00Z`);

  return (
    <PageBody>
      <PageTitle
        title="Roadmap"
        subtitle="What we plan to deliver over the next four Avnet fiscal quarters. Dates can move, and this page changes when they do."
        actions={<span className="text-caption text-ink-muted">Updated {longDay(ROADMAP_UPDATED)}</span>}
      />

      {!launched && <HighlightBar>{LAUNCH.line}</HighlightBar>}

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ROADMAP.map((q) => {
          const current = isCurrentQuarter(q.quarter, now);
          return (
            <section
              key={q.quarter}
              aria-labelledby={`q-${q.quarter}`}
              className={cn("rounded-sm border border-hairline bg-surface", current && "border-t-[3px] border-t-primary")}
            >
              <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 pb-3 pt-3">
                <div>
                  <h2 id={`q-${q.quarter}`} className="font-display text-section-title text-ink">
                    {q.quarter}
                  </h2>
                  <p className="mt-0.5 text-caption text-ink-muted">{quarterMonths(q.quarter).range}</p>
                </div>
                {current && <Chip>Now</Chip>}
              </header>
              <ul className="divide-y divide-hairline">
                {q.items.map((item) => (
                  <li key={item.title} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-body font-semibold text-ink">{item.title}</h3>
                      <Chip tone={TONE[item.status]} className="mt-0.5 shrink-0">
                        {item.status}
                      </Chip>
                    </div>
                    <p className="mt-1 text-body-sm text-ink-muted">{item.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </PageBody>
  );
}
