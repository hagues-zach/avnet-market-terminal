import { fetchText, type LiveArticle } from "./shared";
import { tagArticle } from "./tagging";

// SEC EDGAR: material filings (8-K, 10-Q, 10-K) for US-listed suppliers and
// distributors, read from the public per-company submissions API. Filings are
// public-domain primary sources. `supplier` matches the label used by tagging.ts
// so filings line up with the supplier watchlist.

interface Filer {
  supplier: string;
  cik: number;
}

const FILERS: Filer[] = [
  { supplier: "Avnet", cik: 8858 },
  { supplier: "Arrow", cik: 7536 },
  { supplier: "Nvidia", cik: 1045810 },
  { supplier: "AMD", cik: 2488 },
  { supplier: "Intel", cik: 50863 },
  { supplier: "Micron", cik: 723125 },
  { supplier: "Texas Instruments", cik: 97476 },
  { supplier: "Analog Devices", cik: 6281 },
  { supplier: "Microchip", cik: 827054 },
  { supplier: "NXP", cik: 1413447 },
  { supplier: "onsemi", cik: 1097864 },
  { supplier: "Qualcomm", cik: 804328 },
  { supplier: "Broadcom", cik: 1730168 },
  { supplier: "Marvell", cik: 1835632 },
  { supplier: "GlobalFoundries", cik: 1709048 },
  { supplier: "Applied Materials", cik: 6951 },
  { supplier: "Lam Research", cik: 707549 },
  { supplier: "KLA", cik: 319201 },
  { supplier: "Wolfspeed", cik: 895419 },
  { supplier: "Vishay", cik: 103730 },
  { supplier: "Amphenol", cik: 820313 },
  { supplier: "TE Connectivity", cik: 1385157 },
  { supplier: "Lattice", cik: 855658 },
  { supplier: "Monolithic Power", cik: 1280452 },
  { supplier: "Skyworks", cik: 4127 },
  { supplier: "Qorvo", cik: 1604778 },
];

const FORMS = new Set(["8-K", "10-Q", "10-K"]);
const PERIODIC: Record<string, string> = { "10-Q": "Quarterly report", "10-K": "Annual report" };

// 8-K item numbers → plain labels. 9.01 (exhibits) rides along with almost every 8-K.
const ITEMS: Record<string, string> = {
  "1.01": "Material agreement",
  "1.02": "Agreement terminated",
  "1.05": "Cybersecurity incident",
  "2.01": "Acquisition or disposal completed",
  "2.02": "Results of operations",
  "2.03": "New financial obligation",
  "2.05": "Restructuring costs",
  "2.06": "Impairment",
  "3.02": "Unregistered equity sale",
  "5.02": "Director or officer change",
  "5.03": "Bylaw amendment",
  "5.07": "Shareholder vote results",
  "7.01": "Regulation FD disclosure",
  "8.01": "Other events",
};

interface Submissions {
  name?: string;
  filings?: {
    recent?: {
      form: string[];
      accessionNumber: string[];
      acceptanceDateTime: string[];
      primaryDocument: string[];
      items: string[];
    };
  };
}

const PER_FILER = 4;
// SEC asks for no more than 10 requests/second; stay well under it.
const BATCH = 5;

async function fromFiler({ supplier, cik }: Filer): Promise<LiveArticle[]> {
  const padded = String(cik).padStart(10, "0");
  const body = JSON.parse(await fetchText(`https://data.sec.gov/submissions/CIK${padded}.json`)) as Submissions;
  const r = body.filings?.recent;
  if (!r) return [];
  const out: LiveArticle[] = [];
  for (let i = 0; i < r.form.length && out.length < PER_FILER; i++) {
    const form = r.form[i];
    if (!FORMS.has(form)) continue;
    const t = Date.parse(r.acceptanceDateTime[i]);
    if (Number.isNaN(t)) continue;
    const items = (r.items[i] ?? "")
      .split(",")
      .map((code) => ITEMS[code.trim()])
      .filter(Boolean);
    const what = PERIODIC[form] ?? (items.length ? items.join("; ") : "Current report");
    const accession = r.accessionNumber[i];
    const title = `${supplier} files ${form}: ${what}`;
    const tags = tagArticle(title);
    out.push({
      id: `sec-${accession}`,
      kind: "filing",
      title,
      summary: `${body.name ?? supplier}, Form ${form}, accession ${accession}`,
      outlet: "SEC EDGAR",
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${r.primaryDocument[i]}`,
      publishedAt: new Date(t).toISOString(),
      ...tags,
      suppliers: [supplier],
      regions: [],
    });
  }
  return out;
}

export async function getFilings(): Promise<LiveArticle[]> {
  const out: LiveArticle[] = [];
  let failures = 0;
  for (let i = 0; i < FILERS.length; i += BATCH) {
    const settled = await Promise.allSettled(FILERS.slice(i, i + BATCH).map(fromFiler));
    for (const s of settled) {
      if (s.status === "fulfilled") out.push(...s.value);
      else failures += 1;
    }
  }
  // A few missing filers is a partial feed; all of them missing is an outage.
  if (failures === FILERS.length) throw new Error("SEC EDGAR unavailable");
  return out;
}
