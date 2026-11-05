import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { runCorpusJob } from "@/lib/brief/corpus";

// The morning brief's corpus job: reads every news source once and saves the day's
// shared corpus (src/lib/brief/corpus.ts). Run before 6:00 am Eastern by
// scripts/brief-corpus.sh. Public to the password gate; the bearer secret guards it.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get("authorization"))) return new NextResponse(null, { status: 401 });
  return NextResponse.json(await runCorpusJob());
}
