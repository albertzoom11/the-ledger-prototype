import clsx from "clsx";

/**
 * Ledger platform UI kit: status badge.
 *
 * Applications supply a status -> tone map so every tool renders states with
 * the same visual language.
 */

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export interface StatusDescriptor {
  label: string;
  tone: StatusTone;
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-line bg-canvas text-muted",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  danger: "border-red-200 bg-red-50 text-red-800",
};

const DOT_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted",
  info: "bg-blue-600",
  warning: "bg-amber-500",
  success: "bg-emerald-600",
  danger: "bg-red-600",
};

export function StatusBadge({
  descriptor,
  size = "md",
}: {
  descriptor: StatusDescriptor;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-[12px]",
        TONE_CLASS[descriptor.tone],
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", DOT_CLASS[descriptor.tone])} />
      {descriptor.label}
    </span>
  );
}
