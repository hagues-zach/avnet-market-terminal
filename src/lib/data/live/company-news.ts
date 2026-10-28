import type { Company } from "./earnings-model";
import { getLiveNews, type LiveArticle } from "./news";

// News about one company, picked out of the Market News feed by name. Server-only.

// Names that are also ordinary words, or that the press shortens, need their own
// pattern. Everything else matches on the company name, ignoring case.
const PATTERNS: Record<string, RegExp> = {
  arrow: /\bArrow Electronics\b|\bArrow\b(?! (key|keys|function))/,
  "texas-instruments": /Texas Instruments|\bTI\b/,
  "analog-devices": /Analog Devices|\bADI\b/,
  microchip: /Microchip Technology|\bMicrochip\b/,
  onsemi: /\bonsemi\b|\bON Semiconductor\b/,
  "monolithic-power": /Monolithic Power|\bMPS\b/,
  lattice: /\bLattice\b/,
  "silicon-labs": /Silicon Lab(s|oratories)/i,
  allegro: /Allegro Micro/i,
  diodes: /\bDiodes Inc/i,
  amd: /\bAMD\b/,
  intel: /\bIntel\b/,
  micron: /\bMicron\b/,
  credo: /\bCredo\b/,
  coherent: /\bCoherent\b/,
  kla: /\bKLA\b/,
  onto: /Onto Innovation/i,
  cadence: /\bCadence\b/,
  "astera-labs": /\bAstera\b/i,
  flex: /\bFlex Ltd\b|\bFlextronics\b/,
  alphabet: /\bAlphabet\b|\bGoogle\b/,
  amazon: /\bAmazon\b|\bAWS\b/,
  meta: /\bMeta\b/,
  apple: /\bApple\b/,
  dell: /\bDell\b/,
  hpe: /\bHPE\b|Hewlett Packard Enterprise/,
  "super-micro": /Super ?Micro/i,
  gm: /General Motors|\bGM\b/,
  ford: /\bFord\b/,
  deere: /\bDeere\b/,
  emerson: /\bEmerson\b/,
  rockwell: /Rockwell Automation/i,
  itt: /\bITT\b/,
  cts: /\bCTS Corp(oration)?\b/,
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The stories in an already-loaded feed that name the company. */
export function newsFor(company: Company, articles: LiveArticle[], limit = 8): LiveArticle[] {
  const pattern = PATTERNS[company.slug] ?? new RegExp(`\\b${escape(company.name)}\\b`, "i");
  return articles.filter((a) => pattern.test(`${a.title} ${a.summary}`)).slice(0, limit);
}

export async function getCompanyNews(company: Company, limit = 8): Promise<LiveArticle[]> {
  const { articles } = await getLiveNews();
  return newsFor(company, articles, limit);
}
