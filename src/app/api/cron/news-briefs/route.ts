import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { prewriteBriefs } from "@/lib/news/prewrite";

// Writes article briefs for new high and medium relevance stories before anyone
// opens them (src/lib/news/prewrite.ts). Run every 30 minutes by
// scripts/news-briefs.sh. Public to the password gate; the bearer secret guards it.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get("authorization"))) return new NextResponse(null, { status: 401 });
  return NextResponse.json(await prewriteBriefs());
}
