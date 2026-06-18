import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return NextResponse.json({ ok: true }); // gate disabled (e.g. local dev)

  let password = "";
  try {
    ({ password } = await req.json());
  } catch {
    // ignore malformed body
  }

  if (password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
