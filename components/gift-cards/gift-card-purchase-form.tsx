"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GiftCardPreview from "@/components/gift-cards/gift-card-preview";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";

type TemplateOption = {
  id: string;
  name: string;
  imageUrl: string | null;
  bgColor: string | null;
  textColor: string | null;
  isDefault: boolean;
};

type StudioOption = {
  id: string;
  displayName: string;
  shortDescription: string | null;
  templates: TemplateOption[];
};

const SUGGESTED_AMOUNTS = [2500, 5000, 7500, 10000] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function preferredTemplateId(studio: StudioOption | null) {
  if (!studio) return "";
  return studio.templates.find((template) => template.isDefault)?.id ?? studio.templates[0]?.id ?? "";
}

export default function GiftCardPurchaseForm({ studios }: { studios: StudioOption[] }) {
  const router = useRouter();
  const [selectedStudioId, setSelectedStudioId] = useState(studios[0]?.id ?? "");
  const selectedStudio = useMemo(
    () => studios.find((studio) => studio.id === selectedStudioId) ?? studios[0] ?? null,
    [selectedStudioId, studios],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => preferredTemplateId(studios[0] ?? null));
  const [name, setName] = useState("Studio gift card");
  const [amountEur, setAmountEur] = useState("50");
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const nextPreferred = preferredTemplateId(selectedStudio);
    if (!selectedStudio?.templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(nextPreferred);
    }
  }, [selectedStudio, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => selectedStudio?.templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedStudio, selectedTemplateId],
  );

  const amountCents = useMemo(() => {
    const parsed = Number.parseFloat(amountEur.replace(",", "."));
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed * 100));
  }, [amountEur]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudio) {
      setErr("No studios are taking gift card orders just yet. Check back soon.");
      return;
    }
    if (!name.trim() || !purchaserName.trim() || !recipientName.trim()) {
      setErr("We need a gift title, your name, and the recipient’s name.");
      return;
    }
    if (!EMAIL_RE.test(purchaserEmail.trim()) || !EMAIL_RE.test(recipientEmail.trim())) {
      setErr("Double-check both email addresses — something looks off.");
      return;
    }
    if (amountCents < 500 || amountCents > 100000) {
      setErr("Gift cards must be between EUR 5 and EUR 1000.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId: selectedStudio.id,
          templateId: selectedTemplate?.id ?? null,
          name: name.trim(),
          amountCents,
          purchaserName: purchaserName.trim(),
          purchaserEmail: purchaserEmail.trim().toLowerCase(),
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim().toLowerCase(),
          personalMessage: personalMessage.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        checkoutUrl?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        setErr(data.error ?? "We couldn’t start checkout. Try again in a moment.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } finally {
      setBusy(false);
    }
  }

  function goToBalanceLookup() {
    if (!lookupCode.trim()) return;
    router.push(`/gift-cards/${encodeURIComponent(lookupCode.trim())}`);
  }

  if (studios.length === 0) {
    return (
      <div className={`${ui.card} text-center`}>
        <p className="text-lg font-semibold text-amber-950">Gift cards are coming soon</p>
        <p className="mt-2 text-sm text-stone-600">
          No studios are taking gift card orders yet — check back in a few days.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={onSubmit} className={`${ui.card} space-y-5`}>
        <div>
          <p className={ui.overline}>Buy a gift card</p>
          <h2 className="mt-1 text-2xl font-semibold text-amber-950">Send a pottery gift card</h2>
          <p className="mt-2 text-sm text-stone-600">
            Pay securely with Stripe. We&rsquo;ll email the code straight to your recipient — no printing needed.
          </p>
        </div>

        {err ? <p className={ui.errorText}>{err}</p> : null}

        <label className="block text-sm">
          <span className={ui.label}>Studio</span>
          <select
            className={`${ui.select} mt-1`}
            value={selectedStudio?.id ?? ""}
            onChange={(e) => setSelectedStudioId(e.target.value)}
          >
            {studios.map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.displayName}
              </option>
            ))}
          </select>
          {selectedStudio?.shortDescription ? (
            <span className="mt-1 block text-xs text-stone-500">{selectedStudio.shortDescription}</span>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className={ui.label}>Gift title</span>
            <input
              className={`${ui.input} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wheel class gift card"
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Amount (EUR)</span>
            <input
              className={`${ui.input} mt-1`}
              inputMode="decimal"
              value={amountEur}
              onChange={(e) => setAmountEur(e.target.value)}
              placeholder="50"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_AMOUNTS.map((value) => {
            const active = amountCents === value;
            return (
              <button
                key={value}
                type="button"
                className={`${ui.chip} ${active ? ui.chipOn : ui.chipOff}`}
                onClick={() => setAmountEur((value / 100).toFixed(2))}
              >
                EUR {(value / 100).toFixed(0)}
              </button>
            );
          })}
        </div>

        {selectedStudio?.templates.length ? (
          <label className="block text-sm">
            <span className={ui.label}>Template</span>
            <select
              className={`${ui.select} mt-1`}
              value={selectedTemplate?.id ?? ""}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              {selectedStudio.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className={ui.label}>Your name</span>
            <input
              className={`${ui.input} mt-1`}
              value={purchaserName}
              onChange={(e) => setPurchaserName(e.target.value)}
              placeholder="Alex Potter"
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Your email</span>
            <input
              className={`${ui.input} mt-1`}
              type="email"
              value={purchaserEmail}
              onChange={(e) => setPurchaserEmail(e.target.value)}
              placeholder="alex@example.com"
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Recipient name</span>
            <input
              className={`${ui.input} mt-1`}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Jamie Clay"
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Recipient email</span>
            <input
              className={`${ui.input} mt-1`}
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="jamie@example.com"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className={ui.label}>Personal message</span>
          <textarea
            className={`${ui.input} mt-1 min-h-28`}
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            placeholder="Enjoy a creative day at the studio."
            maxLength={500}
          />
        </label>

        <button type="submit" className={ui.buttonPrimary} disabled={busy}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              Starting checkout…
            </span>
          ) : (
            "Continue to secure payment"
          )}
        </button>

        <div className="border-t border-stone-100 pt-5">
          <p className="text-sm font-medium text-stone-800">Already have a gift card?</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              className={ui.input}
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="PM-GIFT-1234-ABCD"
            />
            <button type="button" className={ui.buttonSecondary} onClick={goToBalanceLookup}>
              Check balance
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-4">
        <GiftCardPreview
          studioName={selectedStudio?.displayName ?? "Studio"}
          code={null}
          title={name.trim() || "Studio gift card"}
          recipientName={recipientName}
          amountCents={Math.max(amountCents, 0)}
          bgColor={selectedTemplate?.bgColor}
          textColor={selectedTemplate?.textColor}
          imageUrl={selectedTemplate?.imageUrl}
          personalMessage={personalMessage}
        />
        <div className={`${ui.cardMuted} space-y-2 text-sm text-stone-600`}>
          <p className="font-medium text-stone-800">How it works</p>
          <p>1. Pick a studio, an amount, and who it&rsquo;s for.</p>
          <p>2. Pay securely through Stripe-hosted checkout.</p>
          <p>3. Your recipient gets the code and a balance link by email.</p>
        </div>
      </div>
    </div>
  );
}
