"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./primitives";

/**
 * Ledger platform UI kit: confirmation dialog for irreversible actions.
 * Native <dialog> so focus trapping and Escape come for free.
 */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="w-[420px] max-w-[92vw] rounded-md border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
    >
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[14px] font-semibold">{title}</h2>
      </div>
      <div className="px-4 py-3 text-[13px] text-muted">{body}</div>
      <div className="flex justify-end gap-2 border-t border-line bg-canvas px-4 py-2.5">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          size="sm"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
