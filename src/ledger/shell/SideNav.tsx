"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { NavGroup } from "../apps/registry";

/**
 * Ledger platform: the sidebar. Groups arrive already filtered by the
 * server-resolved actor's permissions; the active item is derived on the client
 * so it stays correct across client-side navigations.
 */

export function SideNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname() ?? "";

  return (
    <>
      {groups.map((group) => (
        <div key={group.key} className="mb-4">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
            {group.name}
          </p>
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {group.items.map((item) => {
              const active =
                pathname === item.match || pathname.startsWith(`${item.match}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
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
      ))}
    </>
  );
}
