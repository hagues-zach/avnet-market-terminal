// Pages hidden from the whole app: the nav, direct URLs, links from other pages,
// deck slides, QBR briefs, Start Here and Ask the Terminal. Their code stays in
// place. Remove a path here to bring the page back everywhere. Kept free of UI
// imports so the edge middleware can read it.
export const HIDDEN_PATHS: string[] = [
  "/learn", // Learning Center
  "/line-cards", // Line Cards
  "/supply-chain", // Supply Chain
  "/tools/leads", // Lead Finder
];

/** Whether a link lands on a hidden page: the page itself or anything under it, ignoring query and hash. */
export function isHidden(href: string): boolean {
  const path = href.split(/[?#]/)[0];
  return HIDDEN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Links with the hidden pages taken out. */
export const visible = <T extends { href: string }>(links: T[]): T[] => links.filter((l) => !isHidden(l.href));
