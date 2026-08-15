import Link from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";
import { can, type Actor } from "../auth/actor";
import { ROLE_LABELS } from "../auth/roles";
import { LEDGER_APPS } from "./navigation";
import { ActorSwitcher } from "./ActorSwitcher";

/**
 * Ledger platform: the shell every internal application renders inside.
 * Navigation is filtered by the server-resolved actor's permissions.
 */

export function AppShell({
  actor,
  actors,
  pathname,
  children,
}: {
  actor: Actor;
  actors: Actor[];
  pathname: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between gap-4 border-b border-line bg-surface px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-ink text-[12px] font-bold text-white">
              L
            </span>
            <span className="text-[14px] font-semibold tracking-tight">
              The Ledger
            </span>
          </Link>
          <span className="hidden text-[11px] uppercase tracking-widest text-muted sm:inline">
            Internal Operations Platform
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[12px] font-medium text-ink">{actor.name}</div>
            <div className="text-[11px] text-muted">
              {ROLE_LABELS[actor.role]} · {actor.email}
            </div>
          </div>
          <ActorSwitcher actor={actor} actors={actors} />
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="shrink-0 border-b border-line bg-surface px-3 py-3 md:w-56 md:border-b-0 md:border-r">
          {LEDGER_APPS.map((app) => {
            const items = app.items.filter(
              (item) => !item.permission || can(actor, item.permission),
            );
            if (items.length === 0) return null;
            return (
              <div key={app.key} className="mb-4">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {app.name}
                </p>
                <ul className="flex flex-wrap gap-1 md:flex-col">
                  {items.map((item) => {
                    const active =
                      pathname === item.match || pathname.startsWith(`${item.match}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={clsx(
                            "block rounded px-2 py-1.5 text-[13px]",
                            active
                              ? "bg-accent/10 font-medium text-accent"
                              : "text-ink hover:bg-canvas",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="px-2 text-[11px] leading-snug text-muted">
            Navigation is filtered by permission, and every action re-checks
            authorization on the server.
          </p>
        </nav>

        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
