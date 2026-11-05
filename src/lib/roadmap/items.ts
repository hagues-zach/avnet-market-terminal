// The public roadmap: what ships in each Avnet fiscal quarter. Edit this file
// through a PR to move an item; the Roadmap page (/roadmap) draws it as it is.
// Roadmap items only: no internal costs or budget notes (those live in
// docs/mvp-plan.md). See docs/mvp-plan.md for the plan behind it.

export type RoadmapStatus = "Shipped" | "In progress" | "Planned";

export interface RoadmapItem {
  title: string;
  /** One plain sentence on why it matters to the people using the app. */
  why: string;
  status: RoadmapStatus;
}

export interface RoadmapQuarter {
  /** Avnet fiscal quarter, "FY27 Q3". */
  quarter: string;
  items: RoadmapItem[];
}

/** When this file last changed in substance; shown on the page. */
export const ROADMAP_UPDATED = "2026-11-05";

/** The launch the page leads with. */
export const LAUNCH = { date: "2027-02-01", line: "The MVP launches February 1, 2027 for the pilot group." };

export const ROADMAP: RoadmapQuarter[] = [
  {
    quarter: "FY27 Q3",
    items: [
      {
        title: "MVP launch, February 1",
        why: "The morning brief for the pilot, Market, Americas earnings, lead times and signals, Avnet performance for global users, and the Pitch Deck Builder.",
        status: "In progress",
      },
      { title: "Start Here by role", why: "Each role lands on what matters to it.", status: "Planned" },
    ],
  },
  {
    quarter: "FY27 Q4",
    items: [
      {
        title: "Scoped access to Avnet performance",
        why: "Supplier, region and customer views, without one team seeing another's numbers.",
        status: "Planned",
      },
      { title: "Morning brief for more users", why: "Opens beyond the pilot, built on the same shared news.", status: "Planned" },
      { title: "X posts in the morning brief", why: "Supplier and customer news that reaches X before the trade press.", status: "Planned" },
      { title: "QBR Prep returns", why: "A one-page brief from earnings, news and Avnet performance.", status: "Planned" },
    ],
  },
  {
    quarter: "FY28 Q1",
    items: [
      {
        title: "Europe and Asia companies",
        why: "WPG, WT Micro, RS Group and the Asian filers come out of beta.",
        status: "Planned",
      },
      { title: "Cycle Engine", why: "A coincident index for the market Avnet serves.", status: "Planned" },
      { title: "Scenario Modeler", why: "What-if growth and share targets over the market data.", status: "Planned" },
    ],
  },
  {
    quarter: "FY28 Q2",
    items: [
      { title: "Open to about 500 users", why: "Self-serve onboarding across Avnet Americas.", status: "Planned" },
      { title: "Premium voices", why: "More natural audio for the morning brief.", status: "Planned" },
      { title: "Customizable Start Here", why: "Add, remove and resize sections.", status: "Planned" },
      { title: "Brief by email or podcast", why: "Listen without opening the app.", status: "Planned" },
    ],
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A fiscal quarter's calendar months. Avnet's year starts in July (FY27 Q1 is
 * July to September 2026); its quarters end on a Saturday, which a roadmap
 * can ignore.
 */
export function quarterMonths(label: string): { start: Date; end: Date; range: string } {
  const [, fy, q] = /^FY(\d\d) Q([1-4])$/.exec(label) ?? [];
  if (!fy) throw new Error(`Not a fiscal quarter label: ${label}`);
  const first = 6 + 3 * (Number(q) - 1); // 0-based month: July, October, January, April
  const year = 2000 + Number(fy) - 1 + Math.floor(first / 12);
  const m = first % 12;
  const start = new Date(Date.UTC(year, m, 1));
  const end = new Date(Date.UTC(year, m + 3, 0));
  return { start, end, range: `${MONTHS[m]} to ${MONTHS[(m + 2) % 12]} ${end.getUTCFullYear()}` };
}

/** Whether a date falls inside a fiscal quarter. */
export function isCurrentQuarter(label: string, now: Date): boolean {
  const { start, end } = quarterMonths(label);
  return now >= start && now < new Date(end.getTime() + 86_400_000);
}
