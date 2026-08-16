/**
 * Ledger platform: time arithmetic used by domain rules (SLA windows, ageing)
 * as well as by the UI. Kept out of `ui/` so that pure, client-safe domain rules
 * never have to import presentation code.
 */

export function ageInHours(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 3_600_000);
}
