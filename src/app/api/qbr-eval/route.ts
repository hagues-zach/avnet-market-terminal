import { NextResponse } from "next/server";
import { gatherBrief } from "@/lib/qbr/gather";
import { readSetup } from "@/lib/qbr/setup";
import { writeTalkingPoints } from "@/lib/qbr/talking-points";

// Dev only: uncached QBR talking points for one setup as JSON, with the brief Claude
// read, so src/lib/qbr/eval.ts can grade them against the app's live data (which
// loads only inside Next). Not served in production.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const params = (await req.json().catch(() => ({}))) as Record<string, string>;
  const setup = readSetup(params);
  if (!setup.company) return NextResponse.json({ error: "company: a slug from the app's list" }, { status: 400 });
  const withCompany = { ...setup, company: setup.company };
  const started = Date.now();
  const brief = await gatherBrief(withCompany);
  const out = await writeTalkingPoints(brief, withCompany);
  return NextResponse.json({ ...out, supplier: brief.supplier, ms: Date.now() - started });
}
