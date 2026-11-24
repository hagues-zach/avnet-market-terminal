"use server";

import { revalidatePath } from "next/cache";
import { VOTES_NS, type Pick, type Vote } from "@/lib/ai/news-brief-eval";
import { store } from "@/lib/store";

// Saves one blind vote from /dev/news-brief-eval. Dev only, like the page.

export interface VoteState {
  ok: boolean;
  message: string;
}

const score = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
};

export async function saveVote(_prev: VoteState, form: FormData): Promise<VoteState> {
  if (process.env.NODE_ENV === "production") return { ok: false, message: "Not available." };
  const slug = String(form.get("slug") ?? "");
  const pick = String(form.get("pick") ?? "") as Pick;
  if (!/^[a-z0-9]{1,20}$/.test(slug) || !["A", "B", "tie"].includes(pick)) return { ok: false, message: "Pick A, B or tie first." };
  const vote: Vote = {
    slug,
    pick,
    whyA: score(form.get("whyA")),
    whyB: score(form.get("whyB")),
    reason: String(form.get("reason") ?? "").trim().slice(0, 500) || undefined,
    votedAt: new Date().toISOString(),
  };
  await store.set(VOTES_NS, slug, vote);
  revalidatePath("/dev/news-brief-eval");
  return { ok: true, message: "Saved." };
}
