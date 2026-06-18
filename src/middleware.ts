import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

// Cookie-based password gate for the demo deployment. Active only when
// SITE_PASSWORD is set (prod/preview on Vercel); open in local dev when unset.
// Uses a redirect to a branded /login page rather than HTTP Basic Auth, because
// Vercel's edge strips the WWW-Authenticate header (so the browser dialog never shows).
export function middleware(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  if (req.cookies.get(AUTH_COOKIE)?.value === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|avnet-logo.png).*)"],
};
