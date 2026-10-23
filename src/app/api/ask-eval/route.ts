import { NextResponse } from "next/server";
import { askFresh } from "@/lib/ask/claude";

// Dev only: one uncached Claude answer as JSON, so src/lib/ask/eval.ts can grade
// models against the app's live data (which loads only inside Next). Not served
// in production.

export const dynamic = "force-dynamic";

const MODELS = new Set(["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]);

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const { question, model } = (await req.json().catch(() => ({}))) as { question?: string; model?: string };
  if (!question || (model && model !== "auto" && !MODELS.has(model))) return NextResponse.json({ error: "question, and model if given, from the list" }, { status: 400 });
  const started = Date.now();
  // "auto", or no model, picks by the question's depth as the page does.
  const result = await askFresh(question.slice(0, 200), new Date().toISOString().slice(0, 10), model === "auto" ? undefined : model);
  return NextResponse.json({ ...result, ms: Date.now() - started });
}
