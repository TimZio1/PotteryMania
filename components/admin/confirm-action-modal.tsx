"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ui } from "@/lib/ui-styles";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmationText?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmationText,
  requireReason = true,
  reasonLabel = "Reason",
  pending = false,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const canSubmit = useMemo(() => {
    const reasonOk = !requireReason || reason.trim().length > 0;
    const typedOk = !confirmationText || typed.trim() === confirmationText;
    return reasonOk && typedOk && !pending;
  }, [confirmationText, pending, reason, requireReason, typed]);

  useEffect(() => {
    if (!open) {
      setReason("");
      setTyped("");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onCancel],
  );

  if (!open) return null;

  const titleId = "confirm-modal-title";
  const descriptionId = "confirm-modal-description";

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-stone-950/45 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Critical action</p>
        <h3 id={titleId} className="mt-3 text-2xl font-semibold tracking-tight text-amber-950">{title}</h3>
        <p id={descriptionId} className="mt-3 text-sm leading-7 text-stone-600">{description}</p>

        {requireReason ? (
          <div className="mt-5">
            <label className={ui.label} htmlFor="confirm-reason">
              {reasonLabel}
            </label>
            <textarea
              id="confirm-reason"
              className={`${ui.input} mt-2 min-h-28`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
              placeholder="Describe why this action is necessary."
            />
          </div>
        ) : null}

        {confirmationText ? (
          <div className="mt-5">
            <label className={ui.label} htmlFor="confirm-text">
              Type <code className="rounded bg-stone-100 px-1">{confirmationText}</code> to continue
            </label>
            <input
              id="confirm-text"
              className={`${ui.input} mt-2`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={pending}
            />
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={ui.buttonSecondary} onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={ui.buttonPrimary}
            disabled={!canSubmit}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
