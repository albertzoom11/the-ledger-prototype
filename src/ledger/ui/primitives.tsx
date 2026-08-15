import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

/** Ledger platform UI kit: layout and feedback primitives. */

export function Card({
  title,
  actions,
  children,
  className,
  dense = false,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <section
      className={clsx(
        "rounded-md border border-line bg-surface shadow-[0_1px_2px_rgba(16,21,28,0.04)]",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className={dense ? "" : "px-4 py-3"}>{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-0.5 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DescriptionList({
  items,
  columns = 2,
}: {
  items: { label: string; value: ReactNode }[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={clsx(
        "grid gap-x-6 gap-y-2.5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {item.label}
          </dt>
          <dd className="truncate text-[13px] text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-14 text-center">
      <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-canvas text-muted">
        ∅
      </div>
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  retry,
}: {
  title?: string;
  description?: string;
  retry?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-[13px] font-semibold text-red-800">{title}</p>
      {description && <p className="text-red-700">{description}</p>}
      {retry}
    </div>
  );
}

export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-4 py-2.5">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="ledger-skeleton h-3 flex-1 rounded bg-line"
              style={{ animationDelay: `${(rowIndex + colIndex) * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <button type={type} className={buttonClass(variant, size)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "secondary",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <Link href={href} className={buttonClass(variant, size)}>
      {children}
    </Link>
  );
}

export function buttonClass(
  variant: "primary" | "secondary" | "danger" | "ghost",
  size: "sm" | "md" = "md",
): string {
  return clsx(
    "inline-flex items-center justify-center gap-1.5 rounded border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "px-2 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
    variant === "primary" &&
      "border-accent bg-accent text-white hover:bg-[#1a44bb]",
    variant === "secondary" &&
      "border-line bg-surface text-ink hover:bg-canvas",
    variant === "danger" &&
      "border-red-600 bg-red-600 text-white hover:bg-red-700",
    variant === "ghost" && "border-transparent text-muted hover:bg-canvas",
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "danger" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium",
        tone === "neutral" && "border-line bg-canvas text-muted",
        tone === "warn" && "border-amber-300 bg-amber-50 text-amber-800",
        tone === "danger" && "border-red-300 bg-red-50 text-red-700",
      )}
    >
      {children}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12px] text-muted">{children}</span>;
}
