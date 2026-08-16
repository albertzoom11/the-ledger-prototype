import Link from "next/link";
import clsx from "clsx";

/**
 * Ledger platform UI kit: counted tabs above a list view.
 *
 * Applications supply labels, counts and hrefs; the status vocabulary itself is
 * application domain and stays there.
 */

export interface StatusTab {
  key: string;
  label: string;
  count: number;
  href: string;
  active: boolean;
}

export function StatusTabs({ tabs }: { tabs: StatusTab[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={clsx(
            "flex items-baseline gap-2 rounded border px-3 py-1.5",
            tab.active
              ? "border-accent bg-accent/5 text-accent"
              : "border-line bg-surface text-ink hover:bg-canvas",
          )}
        >
          <span className="text-[12px] font-medium">{tab.label}</span>
          <span className="text-[13px] font-semibold tabular-nums">{tab.count}</span>
        </Link>
      ))}
    </div>
  );
}
