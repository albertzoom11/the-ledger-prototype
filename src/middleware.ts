import { NextResponse, type NextRequest } from "next/server";
import { REQUESTED_PATH_HEADER, SESSION_COOKIE } from "@/ledger/auth/sessionCookie";

/**
 * Cheap edge guard whose only job is to preserve the requested path in
 * `?next=`; it checks for the presence of a cookie, never its validity. The
 * authoritative session lookup stays in `requireActor()` on the server, so a
 * forged or expired cookie still gets bounced from the authenticated layout —
 * which reads the requested path back from a header so it can preserve `?next=`
 * as well.
 */
export function middleware(request: NextRequest) {
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (request.cookies.has(SESSION_COOKIE)) {
    const headers = new Headers(request.headers);
    headers.set(REQUESTED_PATH_HEADER, requestedPath);
    return NextResponse.next({ request: { headers } });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", requestedPath);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/refunds/:path*", "/admin/:path*"],
};
