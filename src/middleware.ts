import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/ledger/auth/sessionCookie";

/**
 * Cheap edge guard whose only job is to preserve the requested path in
 * `?next=`; it checks for the presence of a cookie, never its validity. The
 * authoritative session lookup stays in `requireActor()` on the server, so a
 * forged or expired cookie still gets bounced from the authenticated layout.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/refunds/:path*", "/admin/:path*"],
};
