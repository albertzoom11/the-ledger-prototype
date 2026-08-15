import { NextResponse, type NextRequest } from "next/server";

/** Exposes the current pathname to server components (used for nav highlighting). */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-ledger-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
