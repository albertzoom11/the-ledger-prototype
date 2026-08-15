import clsx from "clsx";
import type { ReactNode } from "react";

/** Ledger platform UI kit: form field wrappers with consistent error display. */

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-red-700">{error}</p>
      ) : (
        hint && <p className="text-[12px] text-muted">{hint}</p>
      )}
    </div>
  );
}

const controlClass =
  "rounded border border-line bg-surface px-2 py-1.5 text-[13px] text-ink placeholder:text-muted/70";

export function TextArea({
  invalid,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={clsx(controlClass, invalid && "border-red-400", className)}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={clsx(controlClass, "h-8 py-0", invalid && "border-red-400", className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Input({
  invalid,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={clsx(controlClass, "h-8", invalid && "border-red-400", className)}
      {...rest}
    />
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] text-red-800">
      {message}
    </p>
  );
}
