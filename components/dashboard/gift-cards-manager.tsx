"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GiftCardPreview from "@/components/gift-cards/gift-card-preview";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";

type TemplateItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  bgColor: string | null;
  textColor: string | null;
  isDefault: boolean;
  isActive: boolean;
};

type GiftCardItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  originalValueCents: number;
  remainingValueCents: number;
  recipientName: string | null;
  recipientEmail: string | null;
  purchaserName: string | null;
  personalMessage: string | null;
  validUntil: string | null;
  sentAt: string | null;
  isActive: boolean;
  template: TemplateItem | null;
};

function firstTemplateId(templates: TemplateItem[]) {
  return templates.find((template) => template.isDefault)?.id ?? templates[0]?.id ?? "";
}

export default function GiftCardsManager({
  studioId,
  studioName,
  initialGiftCards,
  initialTemplates,
}: {
  studioId: string;
  studioName: string;
  initialGiftCards: GiftCardItem[];
  initialTemplates: TemplateItem[];
}) {
  const router = useRouter();
  const [giftCards, setGiftCards] = useState(initialGiftCards);
  const [templates, setTemplates] = useState(initialTemplates);
  const [issueName, setIssueName] = useState("Studio gift card");
  const [issueValue, setIssueValue] = useState("50");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(firstTemplateId(initialTemplates));
  const [templateName, setTemplateName] = useState("");
  const [templateBg, setTemplateBg] = useState("#F3E7DA");
  const [templateText, setTemplateText] = useState("#2C1810");
  const [templateImageUrl, setTemplateImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  async function issueGiftCard() {
    const amount = Math.round(Number.parseFloat(issueValue.replace(",", ".")) * 100);
    if (!Number.isFinite(amount) || amount < 100) {
      setErr("Enter a valid value of at least EUR 1.");
      return;
    }
    if (!recipientName.trim() || !recipientEmail.trim()) {
      setErr("Recipient name and email are required.");
      return;
    }

    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/studios/${studioId}/gift-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: issueName.trim(),
          originalValueCents: amount,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim().toLowerCase(),
          personalMessage: message.trim() || null,
          templateId: selectedTemplate?.id ?? null,
          sendEmail: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        emailWarning?: string;
        giftCard?: GiftCardItem;
      };
      if (!res.ok || !data.giftCard) {
        throw new Error(data.error ?? "Could not issue gift card.");
      }
      setGiftCards((current) => [data.giftCard!, ...current]);
      setRecipientName("");
      setRecipientEmail("");
      setMessage("");
      setMsg(data.emailWarning ?? "Gift card created and delivery started.");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not issue gift card.");
    } finally {
      setBusy(false);
    }
  }

  async function createTemplate() {
    if (!templateName.trim()) {
      setErr("Template name is required.");
      return;
    }

    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/studios/${studioId}/gift-card-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          bgColor: templateBg.trim() || null,
          textColor: templateText.trim() || null,
          imageUrl: templateImageUrl.trim() || null,
          isDefault: templates.length === 0,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; template?: TemplateItem };
      if (!res.ok || !data.template) {
        throw new Error(data.error ?? "Could not create template.");
      }
      setTemplates((current) => [...current, data.template!]);
      setSelectedTemplateId(data.template.id);
      setTemplateName("");
      setTemplateImageUrl("");
      setMsg("Gift card template created.");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not create template.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      {msg ? <p className={ui.successText}>{msg}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className={`${ui.card} space-y-4`}>
          <div>
            <p className={ui.overline}>Issue card</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Create and email a gift card</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Issue a studio-owned gift card instantly and email the live code to the recipient.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className={ui.label}>Title</span>
              <input className={`${ui.input} mt-1`} value={issueName} onChange={(e) => setIssueName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className={ui.label}>Value (EUR)</span>
              <input className={`${ui.input} mt-1`} value={issueValue} onChange={(e) => setIssueValue(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className={ui.label}>Recipient name</span>
              <input className={`${ui.input} mt-1`} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className={ui.label}>Recipient email</span>
              <input className={`${ui.input} mt-1`} type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
            </label>
          </div>

          <label className="block text-sm">
            <span className={ui.label}>Template</span>
            <select className={`${ui.select} mt-1`} value={selectedTemplate?.id ?? ""} onChange={(e) => setSelectedTemplateId(e.target.value)}>
              <option value="">No template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className={ui.label}>Message</span>
            <textarea className={`${ui.input} mt-1 min-h-28`} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>

          <button type="button" className={ui.buttonPrimary} disabled={busy} onClick={issueGiftCard}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" className="text-white" />
                Sending...
              </span>
            ) : (
              "Issue gift card"
            )}
          </button>
        </section>

        <section className={`${ui.card} space-y-4`}>
          <div>
            <p className={ui.overline}>Template</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Create a gift card style</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Set a background image and colors to make gift cards feel branded.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className={ui.label}>Template name</span>
              <input className={`${ui.input} mt-1`} value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className={ui.label}>Background color</span>
              <input className={`${ui.input} mt-1`} value={templateBg} onChange={(e) => setTemplateBg(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className={ui.label}>Text color</span>
              <input className={`${ui.input} mt-1`} value={templateText} onChange={(e) => setTemplateText(e.target.value)} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className={ui.label}>Image URL</span>
              <input className={`${ui.input} mt-1`} value={templateImageUrl} onChange={(e) => setTemplateImageUrl(e.target.value)} />
            </label>
          </div>

          <button type="button" className={ui.buttonSecondary} disabled={busy} onClick={createTemplate}>
            Save template
          </button>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <GiftCardPreview
            studioName={studioName}
            code={null}
            title={issueName}
            recipientName={recipientName}
            amountCents={Math.max(0, Math.round((Number.parseFloat(issueValue.replace(",", ".")) || 0) * 100))}
            bgColor={selectedTemplate?.bgColor}
            textColor={selectedTemplate?.textColor}
            imageUrl={selectedTemplate?.imageUrl}
            personalMessage={message}
          />
        </div>

        <section className={`${ui.card} space-y-4`}>
          <div>
            <p className={ui.overline}>History</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Issued gift cards</h2>
          </div>
          {giftCards.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
              No gift cards issued yet.
            </p>
          ) : (
            <div className="space-y-3">
              {giftCards.map((giftCard) => (
                <div key={giftCard.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{giftCard.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {giftCard.code} · {giftCard.recipientName || "Recipient"} · {giftCard.recipientEmail || "No email"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-[var(--foreground)]">EUR {(giftCard.remainingValueCents / 100).toFixed(2)} left</p>
                      <p className="text-xs text-[var(--muted)]">
                        of EUR {(giftCard.originalValueCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {giftCard.sentAt ? `Sent ${giftCard.sentAt.slice(0, 10)}` : "Not emailed yet"} ·{" "}
                    {giftCard.isActive ? "active" : "inactive"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
