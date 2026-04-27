"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { SkeletonText } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const LANG_OPTIONS = [
  { value: "", label: "Default" },
  { value: "en", label: "English" },
  { value: "el", label: "Greek (Ελληνικά)" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
];

const CURR_OPTIONS = [
  { value: "", label: "Default (EUR)" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "USD", label: "USD" },
];

const inputClass =
  "mt-1.5 w-full min-h-11 rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700";
const labelClass = "text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600";

function HubCard({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:border-amber-300/70 hover:shadow-md"
    >
      <span className="text-base font-semibold text-amber-950 group-hover:text-amber-900">{title}</span>
      <span className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">{description}</span>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
        {cta}
        <span aria-hidden className="transition group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}

export function AccountClient() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    const res = await fetch("/api/me/customer-profile");
    if (!res.ok) {
      setErr("We couldn’t load your profile. Refresh the page to try again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setEmail(data.email ?? "");
    setFullName(data.profile?.fullName ?? "");
    setPhone(data.profile?.phone ?? "");
    setPreferredLanguage(data.profile?.preferredLanguage ?? "");
    setPreferredCurrency(data.profile?.preferredCurrency ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setErr("");
    const res = await fetch("/api/me/customer-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone,
        preferredLanguage,
        preferredCurrency,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "We couldn’t save your changes. Try again in a moment.");
    } else {
      setMsg("Saved.");
      if (data.profile) {
        setFullName(data.profile.fullName ?? "");
        setPhone(data.profile.phone ?? "");
        setPreferredLanguage(data.profile.preferredLanguage ?? "");
        setPreferredCurrency(data.profile.preferredCurrency ?? "");
      }
    }
    setSaving(false);
  }

  async function onDownloadData() {
    setExporting(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/me/data-export");
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "We couldn’t prepare your export. Try again.");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `potterymania-data-export-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Your data is downloading.");
    } catch {
      setErr("We couldn’t prepare your export. Try again.");
    } finally {
      setExporting(false);
    }
  }

  async function onDeleteAccount() {
    const confirmed = window.confirm(
      "Delete your account for good? You’ll be signed out, and we can’t bring it back.",
    );
    if (!confirmed) return;
    setDeleting(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/me/data-deletion", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "We couldn’t delete your account. Message support and we’ll sort it.");
        return;
      }
      window.location.href = "/login?reason=account_deleted";
    } catch {
      setErr("We couldn’t delete your account. Message support and we’ll sort it.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20" role="status" aria-busy="true" aria-label="Loading account">
        <div className="flex flex-col items-center gap-8">
          <Spinner className="text-amber-800" />
          <SkeletonText className="w-full max-w-md" lines={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-stone-700">Made with heat</p>
      <h1 className="mt-4 text-center font-serif text-3xl tracking-tight text-amber-950 sm:text-4xl">Your account</h1>
      <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-relaxed text-stone-600 sm:text-base">
        One place for your profile, your drops, and what happens after you pay. Receipts and shipment tracking live in{" "}
        <Link href="/my-orders" className="font-medium text-amber-950 underline underline-offset-2 hover:text-amber-900">
          My orders
        </Link>
        .
      </p>

      <section className="mt-12" aria-labelledby="account-hub">
        <h2 id="account-hub" className="sr-only">
          Shortcuts
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <HubCard
              href="/my-orders"
              title="Orders & tracking"
              description="Receipts, line items, and shipment status for everything tied to this account."
              cta="Open orders"
            />
          </li>
          <li>
            <HubCard
              href="/wear/shop"
              title="Shop the drop"
              description="New tees, hoodies, and headwear — the same drop energy as the homepage."
              cta="Enter the shop"
            />
          </li>
          <li>
            <HubCard
              href="/refunds"
              title="Shipping & returns"
              description="Shipping, fit, and how we handle returns — plain language, no fluff."
              cta="Read the policy"
            />
          </li>
          <li>
            <HubCard
              href="/wear/partner"
              title="Affiliate program"
              description="Share your link, earn on qualifying sales — we handle fulfillment end to end."
              cta="Partner up"
            />
          </li>
        </ul>
      </section>

      {err ? (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-800" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900" role="status">
          {msg}
        </p>
      ) : null}

      <section className="mt-14" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="font-serif text-2xl text-amber-950">
          Profile
        </h2>
        <p className="mt-2 max-w-xl text-sm text-stone-600">
          We use this to pre-fill checkout where Stripe allows. Sign-in email stays fixed for security.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-sm">
          <div>
            <label className={labelClass} htmlFor="acct-email">
              Email
            </label>
            <input id="acct-email" type="email" value={email} disabled className={`${inputClass} cursor-not-allowed opacity-70`} />
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              This is how you sign in. Need to change it? Email{" "}
              <a href="mailto:support@potterymania.com" className="font-medium text-amber-950 underline underline-offset-2 hover:text-amber-900">
                support@potterymania.com
              </a>
              .
            </p>
          </div>
          <div>
            <label className={labelClass} htmlFor="acct-name">
              Full name
            </label>
            <input
              id="acct-name"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="acct-phone">
              Phone
            </label>
            <input
              id="acct-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="acct-lang">
              Preferred language
            </label>
            <select
              id="acct-lang"
              name="preferredLanguage"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className={inputClass}
            >
              {LANG_OPTIONS.map((o) => (
                <option key={o.value || "default"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="acct-curr">
              Preferred currency
            </label>
            <select
              id="acct-curr"
              name="preferredCurrency"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
              className={inputClass}
            >
              {CURR_OPTIONS.map((o) => (
                <option key={o.value || "default"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-amber-950 px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-amber-900 disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      <section className="mt-10 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-6 sm:p-8" aria-labelledby="data-heading">
        <h2 id="data-heading" className="font-serif text-xl text-amber-950">
          Your data
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Download everything we store on you, or delete your account. Deletion is permanent — export first if you need a
          record.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownloadData}
            disabled={exporting}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-800/40 bg-white px-5 text-sm font-medium text-amber-950 transition hover:bg-amber-50 disabled:opacity-60"
          >
            {exporting ? "Preparing…" : "Download my data"}
          </button>
          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={deleting}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-300 bg-white px-5 text-sm font-medium text-red-800 transition hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </section>

      <p className="mt-12 text-center">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login?signedOut=1" })}
          className="text-sm font-medium text-stone-600 underline underline-offset-4 transition hover:text-amber-950"
        >
          Sign out
        </button>
      </p>
    </div>
  );
}
