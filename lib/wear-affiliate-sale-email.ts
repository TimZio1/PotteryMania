import { prisma } from "@/lib/db";
import { escapeHtml, renderEmailShell, sendEmailMessages } from "@/lib/email/base";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

function maskEmailHint(email: string | null | undefined) {
  const clean = email?.trim().toLowerCase();
  if (!clean || !clean.includes("@")) return "private buyer";
  const [localRaw, domainRaw] = clean.split("@");
  const local = localRaw || "";
  const [domainNameRaw, ...suffixParts] = (domainRaw || "").split(".");
  const domainName = domainNameRaw || "";
  const suffix = suffixParts.join(".");
  const localHint = local.length <= 2 ? `${local[0] ?? "*"}***` : `${local.slice(0, 2)}***`;
  const domainHint = domainName.length <= 1 ? `${domainName[0] ?? "*"}***` : `${domainName[0]}***`;
  return `${localHint}@${domainHint}${suffix ? `.${suffix}` : ""}`;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
  }).format(cents / 100);
}

function countryLabel(countryCode: string | null | undefined) {
  const code = countryCode?.trim().toUpperCase();
  if (!code) return "not provided";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export async function sendWearAffiliateSaleEmail(input: {
  wearOrderId: string;
  buyerEmail?: string | null;
  buyerCountry?: string | null;
}) {
  const order = await prisma.wearOrder.findUnique({
    where: { id: input.wearOrderId },
    select: {
      id: true,
      studioId: true,
      customerEmail: true,
      subtotalCents: true,
      discountCents: true,
      studioMarginCents: true,
      currency: true,
      studio: {
        select: {
          displayName: true,
          email: true,
          owner: { select: { email: true } },
        },
      },
      affiliateCommissionCredit: {
        select: { amountCents: true },
      },
      items: {
        select: {
          quantity: true,
        },
      },
    },
  });

  if (!order?.studioId || !order.affiliateCommissionCredit?.amountCents) return;

  const to = order.studio?.email || order.studio?.owner.email;
  if (!to) return;

  const currency = (order.currency || "EUR").toUpperCase();
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const saleAmount = formatMoney(order.subtotalCents, currency);
  const commission = formatMoney(order.affiliateCommissionCredit.amountCents, currency);
  const buyerHint = maskEmailHint(input.buyerEmail ?? order.customerEmail);
  const country = countryLabel(input.buyerCountry);
  const ref = order.id.slice(0, 8).toUpperCase();
  const partnerUrl = `${resolvePublicSiteUrl().replace(/\/+$/, "")}/wear/partner`;

  await sendEmailMessages([
    {
      to,
      subject: `Affiliate sale credited — ${commission}`,
      html: renderEmailShell({
        eyebrow: `Affiliate sale #${ref}`,
        title: "A referred apparel sale was credited",
        intro: `Good news: your PotteryMania affiliate link generated a paid sale, and your commission has been added to your balance.`,
        bodyHtml: `
          <p style="margin:0 0 10px;"><strong>Commission credited:</strong> ${escapeHtml(commission)}</p>
          <p style="margin:0 0 10px;"><strong>Final item sale amount:</strong> ${escapeHtml(saleAmount)}</p>
          <p style="margin:0 0 10px;"><strong>Items:</strong> ${escapeHtml(String(totalItems))}</p>
          <p style="margin:0 0 10px;"><strong>Buyer email hint:</strong> ${escapeHtml(buyerHint)}</p>
          <p style="margin:0 0 10px;"><strong>Buyer country:</strong> ${escapeHtml(country)}</p>
          <p style="margin:16px 0 0;font-size:13px;color:#5f5045;">For privacy, we do not share the buyer's name, full email, address, phone, or payment details. Shipping is not included in commission.</p>
        `,
        ctaLabel: "View affiliate program",
        ctaUrl: partnerUrl,
      }),
    },
  ]);
}
