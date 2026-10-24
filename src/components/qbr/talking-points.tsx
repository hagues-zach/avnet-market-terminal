import type { Brief, BriefSetup } from "@/lib/qbr/gather";
import { getTalkingPoints, type Point, type SectionId } from "@/lib/qbr/talking-points";
import { longDate } from "@/components/earnings/format";
import { Chip, DataChip } from "@/components/ui/chip";
import { LoadingBlock } from "@/components/ui/states";

// Section 6 of the QBR brief: talking points and questions Claude wrote for this
// meeting and focus (step 3.1), each linked to the section of the brief it rests
// on. Loads in its own Suspense boundary so the rest of the brief shows first.
// Without Claude, the earnings release takeaways stand in, as before.

const LABEL = "font-display text-label uppercase text-ink-muted";

function From({ section, supplier }: { section: SectionId; supplier: boolean }) {
  const names: Record<SectionId, string> = {
    quarter: "The quarter in brief",
    management: "What management said",
    distribution: supplier ? "Distribution position" : "Market backdrop",
    news: "In the news",
    business: "Our business with them",
  };
  return (
    <span className="ml-2 inline-flex items-center gap-1.5 align-middle print:hidden">
      <a href={`#${section}`} className="text-caption text-ink-muted underline underline-offset-2 hover:text-ink">
        From: {names[section]}
      </a>
      {section === "business" && <DataChip status="mock" />}
    </span>
  );
}

function Items({ title, items, supplier }: { title: string; items: (Point & { why?: string })[]; supplier: boolean }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className={LABEL}>{title}</h3>
      <ol className="mt-2 list-decimal space-y-2.5 pl-5 text-body text-ink marker:text-ink-muted">
        {items.map((i) => (
          <li key={i.text} className="pl-1">
            {i.text}
            <From section={i.section} supplier={supplier} />
            {i.why && <span className="mt-0.5 block text-body-sm text-ink-muted">{i.why}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export async function TalkingPoints({ brief, setup }: { brief: Brief; setup: BriefSetup }) {
  const t = await getTalkingPoints(brief, setup);
  const takeaways = brief.digest?.takeaways ?? [];

  if (t.status !== "ok")
    return (
      <div className="space-y-3">
        {takeaways.length > 0 ? (
          <>
            <p className="text-body-strong text-ink">From the latest earnings release, as written by Claude.</p>
            <ul className="list-disc space-y-1.5 pl-5 text-body text-ink marker:text-ink-muted">
              {takeaways.map((x) => (
                <li key={x}>
                  {x} <Chip className="ml-1 align-middle">Commentary</Chip>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-body text-ink-muted">No talking points yet: the release hasn&apos;t been summarised.</p>
        )}
        {t.message && (
          <p className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
            {t.status === "off" && <DataChip status="planned" />}
            {t.message}
          </p>
        )}
      </div>
    );

  return (
    <div className="space-y-5">
      <Items title="Talking points" items={t.points} supplier={brief.supplier} />
      <Items title="Questions to ask" items={t.questions} supplier={brief.supplier} />
      {t.writtenAt && (
        <p className="text-caption text-ink-muted">
          Written by Claude on {longDate(t.writtenAt)} from the brief above. Items whose figures weren&apos;t in the brief were left out. Check figures
          before quoting.
        </p>
      )}
    </div>
  );
}

export function TalkingPointsFallback() {
  return <LoadingBlock label="Claude is writing points for this meeting… about twenty seconds. The rest of the brief is ready above." lines={5} />;
}
