import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { refreshEarnings } from "@/lib/data/live/earnings";

// One batch of the scheduled filing refresh, so a run fits a serverless time limit
// and stays under SEC's request limit. scripts/refresh-filings.sh walks the batches
// by following `next`. Public to the password gate; the bearer secret guards it.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get("authorization"))) return new NextResponse(null, { status: 401 });
  const from = Number(new URL(req.url).searchParams.get("from") ?? 0);
  if (!Number.isInteger(from) || from < 0) return NextResponse.json({ error: "from must be a whole number" }, { status: 400 });
  return NextResponse.json(await refreshEarnings(from));
}
