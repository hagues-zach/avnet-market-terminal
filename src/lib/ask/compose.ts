// Ask the Terminal, step 3.2: how a Claude answer is put together from the
// answerers it called. Pure, so the test reads the same rules. Sources, links
// and hookup markers come from the answerers that actually ran, never from
// Claude's text, so every figure keeps the provenance its page gives it.
import { plainDashes } from "@/lib/ai/dashes";
import { suggest } from "./route";
import type { Answer } from "./sentences";

const unique = <T>(items: T[], key: (t: T) => string) => [...new Map(items.map((t) => [key(t), t])).values()];

function joinNames(names: string[]): string {
  // "The cycle" starts a header but reads "the cycle" after another subject.
  names = names.map((n, i) => (i > 0 ? n.replace(/^The /, "the ") : n));
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** One answer from Claude's text and the answers of the tools it called (errors already left out). */
export function compose(question: string, text: string, parts: Answer[]): Answer {
  const clean = plainDashes(text.trim());
  if (!parts.length) {
    // Claude found nothing in the app's data to answer from: say so, and point at what can be asked.
    return { intent: "claude", question, subject: "Not in the app's data", text: clean, sources: [], links: [], suggestions: suggest(question) };
  }
  const periods = unique(parts.map((p) => p.period).filter((p): p is string => Boolean(p)), (p) => p);
  const hookups = unique(parts.flatMap((p) => p.hookups ?? []), (h) => h);
  return {
    intent: "claude",
    question,
    subject: joinNames(unique(parts.map((p) => p.subject), (s) => s)),
    period: periods.length === 1 ? periods[0] : undefined,
    text: clean,
    sources: unique(
      parts.flatMap((p) => p.sources),
      (s) => `${s.status} ${s.label}`,
    ),
    links: unique(
      parts.flatMap((p) => p.links),
      (l) => l.href,
    ),
    hookups: hookups.length ? hookups : undefined,
    parts,
  };
}

/** The same question on the same day is answered once: lower case, spaces collapsed, end punctuation dropped. */
export function cacheKey(question: string, today: string): string {
  const q = question
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[?.!\s]+$/, "")
    .trim();
  return `${today} ${q}`;
}
