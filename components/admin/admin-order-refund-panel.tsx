"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmActionModal } from "@/components/admin/confirm-action-modal";
import { ui } from "@/lib/ui-styles";
import type { OrderRefundSnapshot } from "@/lib/orders/admin-stripe-order-refund";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}

type Props = {
  orderId: string;
  snapshot: OrderRefundSnapshot;
};

export function AdminOrderRefundPanel({ orderId, snapshot }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** EUR string for partial refund; empty = full remaining balance */
  const [partialEur, setPartialEur] = useState("");

  if (!snapshot.ok) {
    return (
      <div className={`${ui.cardMuted} mt-8`}>
        <p className={ui.label}>Stripe refund</p>
        <p className="mt-1 text-sm text-stone-600">{snapshot.error}</p>
      </div>
    );
  }

  if (snapshot.refundableCents <= 0) {
    return (
      <div className={`${ui.cardMuted} mt-8`}>
        <p className={ui.label}>Stripe refund</p>
        <p className="mt-1 text-sm text-stone-600">
          No refundable balance on Stripe (already fully refunded or not captured).
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Received {formatMoney(snapshot.amountReceivedCents, snapshot.currency)}, already refunded{" "}
          {formatMoney(snapshot.amountRefundedCents, snapshot.currency)}.
        </p>
      </div>
    );
  }

  const submit = async (reason: string) => {
    setError(null);
    setPending(true);
    try {
      let amountCents: number | undefined;
      const trimmed = partialEur.trim();
      if (trimmed.length > 0) {
        const n = parseFloat(trimmed.replace(",", "."));
        if (!Number.isFinite(n) || n <= 0) {
          setError("Enter a valid positive amount in EUR, or leave empty for a full refund of the remaining balance.");
          setOpen(false);
          setPending(false);
          return;
        }
        amountCents = Math.round(n * 100);
        if (amountCents < 1) {
          setError("Amount too small.");
          setOpen(false);
          setPending(false);
          return;
        }
        if (amountCents > snapshot.refundableCents) {
          setError(
            `Amount exceeds refundable balance (${formatMoney(snapshot.refundableCents, snapshot.currency)}).`,
          );
          setOpen(false);
          setPending(false);
          return;
        }
      }

      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          ...(amountCents !== undefined ? { amountCents } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Refund failed");
        setOpen(false);
        setPending(false);
        return;
      }
      setOpen(false);
      setPartialEur("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={`${ui.cardMuted} mt-8`}>
      <p className={ui.label}>Stripe refund</p>
      <p className="mt-1 text-sm text-stone-700">
        Refundable now:{" "}
        <span className="font-semibold tabular-nums text-amber-950">
          {formatMoney(snapshot.refundableCents, snapshot.currency)}
        </span>
        <span className="text-stone-500">
          {" "}
          (captured {formatMoney(snapshot.amountReceivedCents, snapshot.currency)}, refunded so far{" "}
          {formatMoney(snapshot.amountRefundedCents, snapshot.currency)})
        </span>
      </p>
      <p className="mt-2 text-xs text-stone-500">
        Uses destination-charge refund rules (reverse transfer + application fee). Logged to audit with your reason.
      </p>

      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}

      <div className="mt-4">
        <label className={ui.label} htmlFor="refund-partial-eur">
          Partial amount (EUR, optional)
        </label>
        <input
          id="refund-partial-eur"
          type="text"
          inputMode="decimal"
          className={`${ui.input} mt-1 max-w-xs`}
          placeholder={`Leave empty for full refund (${(snapshot.refundableCents / 100).toFixed(2)})`}
          value={partialEur}
          onChange={(e) => setPartialEur(e.target.value)}
          disabled={pending}
        />
      </div>

      <button type="button" className={`${ui.buttonPrimary} mt-4`} onClick={() => setOpen(true)} disabled={pending}>
        Issue Stripe refund…
      </button>

      <ConfirmActionModal
        open={open}
        title="Refund this order in Stripe?"
        description={`You are about to refund up to ${formatMoney(snapshot.refundableCents, snapshot.currency)} to the customer. This cannot be undone in PotteryMania — reconcile in Stripe if needed.`}
        confirmLabel="Issue refund"
        confirmationText="REFUND"
        onCancel={() => setOpen(false)}
        onConfirm={submit}
        pending={pending}
      />
    </div>
  );
}
