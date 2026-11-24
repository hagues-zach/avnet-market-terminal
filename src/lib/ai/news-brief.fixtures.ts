// Shared by news-brief.test.ts and prewrite.test.ts: an in-memory store and a
// sample story with feed text and tags.
import type { LiveArticle } from "@/lib/data/live/shared";
import type { Store } from "@/lib/store/types";

export function memoryStore(): Store & { data: Map<string, Map<string, unknown>> } {
  const data = new Map<string, Map<string, unknown>>();
  const ns = (n: string) => data.get(n) ?? data.set(n, new Map()).get(n)!;
  return {
    data,
    get: async <T>(n: string, k: string) => ns(n).get(k) as T | undefined,
    getAll: async <T>(n: string) => Object.fromEntries(ns(n)) as Record<string, T>,
    set: async (n, k, v) => void ns(n).set(k, v),
    setMany: async (n, entries) => void Object.entries(entries).forEach(([k, v]) => ns(n).set(k, v)),
  };
}

export const story = (over: Partial<LiveArticle> = {}): LiveArticle => ({
  id: "https://example.com/microchip-lead-times",
  kind: "news",
  title: "Microchip says MCU lead times are back to 12 weeks",
  summary: "Microchip expects distributors to restock in the March quarter.",
  outlet: "EPS News",
  url: "https://example.com/microchip-lead-times",
  publishedAt: "2026-11-20T14:00:00Z",
  body: "Microchip Technology said microcontroller lead times have fallen to 12 weeks. The company expects distributors to restock in the March quarter as industrial demand recovers in Europe.",
  segments: ["MCU & Embedded"],
  suppliers: ["Microchip"],
  customers: [],
  endMarkets: ["Industrial"],
  regions: ["Europe"],
  ...over,
});

