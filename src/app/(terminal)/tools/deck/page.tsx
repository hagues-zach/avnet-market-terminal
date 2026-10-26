import { COMPANIES, ROLE_LABELS, roleOf, type Role } from "@/lib/data/live/earnings-model";
import { deckHref, parseStart } from "@/lib/deck/outline";
import { previewsFor, talkingPreview } from "@/lib/deck/preview";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { DeckBuilder } from "@/components/deck/builder";

// Pitch Deck Builder, merged with the older Export Center: a deck of the app's
// own views, each marked live or mock from src/lib/hookups.ts. The URL carries
// where the deck started (?company=microchip&from=qbr, ?primer=...&from=learn,
// ?from=scenario, ?slide=cycle for one view). Export arrives in step 3.3.

export const dynamic = "force-dynamic";

const GROUP_ORDER: Role[] = ["supplier", "customer", "competitor", "ecosystem"];
const OPTIONS = GROUP_ORDER.flatMap((role) =>
  COMPANIES.filter((c) => roleOf(c) === role)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ slug: c.slug, name: c.name, group: ROLE_LABELS[role] })),
);

export default async function DeckPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const start = parseStart(await searchParams);
  const key = deckHref({
    audience: start.audience,
    company: start.company?.slug,
    primer: start.primer?.slug,
    from: start.from,
    slide: start.single,
    scenario: start.scenario,
  });
  return (
    <PageBody>
      <PageTitle title="Pitch Deck Builder" subtitle="Build a deck from the app's own views, each slide marked live or mock" />
      {/* Talking points may need Claude on a miss (about 15 seconds), so they load on their own and hold up only their slide. */}
      <DeckBuilder
        key={key}
        start={start}
        companies={OPTIONS}
        previews={previewsFor(start, { writeTalking: false })}
        talking={talkingPreview(start)}
      />
    </PageBody>
  );
}
