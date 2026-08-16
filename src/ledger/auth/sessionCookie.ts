/**
 * Cookie name only, in its own module so edge middleware can import it without
 * pulling the SQLite session store into the edge bundle.
 */
export const SESSION_COOKIE = "ledger_session";
export const SESSION_TTL_HOURS = 12;
