/**
 * Sanitises a `?next=` value so the login flow can only ever bounce back into
 * this application. Anything absolute, protocol-relative or otherwise unsafe
 * falls back to the default landing page.
 */

export const DEFAULT_LANDING_PATH = "/refunds";

const SAFE_PATH = /^\/[A-Za-z0-9\-._~/?&=%+]*$/;

export function safeNextPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_LANDING_PATH,
): string {
  if (!next) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return SAFE_PATH.test(next) ? next : fallback;
}
