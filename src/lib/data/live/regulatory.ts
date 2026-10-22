import { fetchText, type LiveArticle } from "./shared";
import { tagArticle } from "./tagging";

// Federal Register (US government, public domain): rules and notices that mention
// semiconductors, plus everything from the Bureau of Industry and Security, which
// issues the export-control rules.

const API = "https://www.federalregister.gov/api/v1/documents.json";
const FIELDS = ["title", "abstract", "html_url", "publication_date", "type", "agencies", "document_number"];
const MAX_ABSTRACT = 220;

interface FrDocument {
  title?: string;
  abstract?: string | null;
  html_url?: string;
  publication_date?: string; // YYYY-MM-DD
  type?: string;
  agencies?: { name?: string; raw_name?: string }[];
  document_number?: string;
}

function query(conditions: Record<string, string>): string {
  const p = new URLSearchParams({ order: "newest", per_page: "25" });
  for (const f of FIELDS) p.append("fields[]", f);
  for (const [k, v] of Object.entries(conditions)) p.append(k, v);
  return `${API}?${p.toString()}`;
}

const QUERIES = [
  query({ "conditions[term]": "semiconductor" }),
  query({ "conditions[agencies][]": "industry-and-security-bureau" }),
];

function clip(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_ABSTRACT) return clean;
  const cut = clean.slice(0, MAX_ABSTRACT);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), MAX_ABSTRACT - 40))}…`;
}

export async function getRegulatory(): Promise<LiveArticle[]> {
  const pages = await Promise.all(
    QUERIES.map(async (url) => (JSON.parse(await fetchText(url)) as { results?: FrDocument[] }).results ?? []),
  );
  const seen = new Set<string>();
  const out: LiveArticle[] = [];
  for (const doc of pages.flat()) {
    if (!doc.title || !doc.html_url || !doc.document_number || !/^\d{4}-\d{2}-\d{2}$/.test(doc.publication_date ?? "")) continue;
    if (seen.has(doc.document_number)) continue;
    seen.add(doc.document_number);
    const agencies = (doc.agencies ?? []).map((a) => a.name ?? a.raw_name).filter(Boolean);
    const abstract = clip(doc.abstract ?? "");
    const tags = tagArticle(`${doc.title} \n ${abstract}`);
    out.push({
      id: `fr-${doc.document_number}`,
      kind: "regulatory",
      title: doc.title.replace(/\s+/g, " ").trim(),
      summary: [doc.type, agencies[agencies.length - 1], abstract].filter(Boolean).join(". "),
      outlet: "Federal Register",
      url: doc.html_url,
      publishedAt: `${doc.publication_date}T00:00:00.000Z`,
      ...tags,
      regions: Array.from(new Set(["United States", ...tags.regions])),
    });
  }
  return out;
}
