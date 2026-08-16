/**
 * Cookie name and transport constants only, in their own module so edge
 * middleware can import them without pulling the SQLite session store into the
 * edge bundle.
 */
export const SESSION_COOKIE = "ledger_session";
export const SESSION_TTL_HOURS = 12;

/** Set by middleware so server components can recover the requested path. */
export const REQUESTED_PATH_HEADER = "x-ledger-requested-path";
