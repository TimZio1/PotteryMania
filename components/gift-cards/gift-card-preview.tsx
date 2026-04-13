"use client";

import { BrandLogo } from "@/components/brand-logo";
import { DEFAULT_GIFT_CARD_BG, DEFAULT_GIFT_CARD_TEXT } from "@/lib/gift-cards/theme";

export default function GiftCardPreview({
  studioName,
  code,
  title,
  recipientName,
  amountCents,
  bgColor,
  textColor,
  imageUrl,
  personalMessage,
}: {
  studioName: string;
  code?: string | null;
  title: string;
  recipientName?: string | null;
  amountCents: number;
  bgColor?: string | null;
  textColor?: string | null;
  imageUrl?: string | null;
  personalMessage?: string | null;
}) {
  const ink = textColor || DEFAULT_GIFT_CARD_TEXT;
  const background = bgColor || DEFAULT_GIFT_CARD_BG;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-stone-200/80 p-6 shadow-sm"
      style={{ backgroundColor: background, color: ink }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      ) : null}
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <BrandLogo href={null} size="sm" className="opacity-90" />
          <span className="rounded-full border border-current/15 px-3 py-1 text-xs font-medium uppercase tracking-wide">
            Gift card
          </span>
        </div>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.18em] opacity-75">{studioName}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-5 text-4xl font-semibold">€{(amountCents / 100).toFixed(2)}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70">Recipient</p>
            <p className="mt-1 text-sm font-medium">{recipientName?.trim() || "Your recipient"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70">Code</p>
            <p className="mt-1 font-mono text-sm font-semibold">{code || "PM-GIFT-XXXX-XXXX"}</p>
          </div>
        </div>
        {personalMessage?.trim() ? (
          <p className="mt-6 max-w-md text-sm leading-6 opacity-90">{personalMessage.trim()}</p>
        ) : null}
      </div>
    </div>
  );
}
