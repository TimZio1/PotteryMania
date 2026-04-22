"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { ui } from "@/lib/ui-styles";

export function RegisterForm() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getProviders().then((providers) => {
      if (mounted) setGoogleEnabled(Boolean(providers?.google));
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    setPending(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, marketingConsent }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; user?: unknown };
      if (!r.ok) {
        setErr(j.error || "We couldn’t create your account. Try again.");
        setPending(false);
        return;
      }
      if (j.user) {
        setOk("Check your email. Open the link to confirm, then sign in.");
      } else {
        setOk("If this email is new, check your inbox. Already have an account? Sign in instead.");
      }
      setPending(false);
    } catch {
      setErr("Sign-up failed. Try again.");
      setPending(false);
    }
  }

  async function onGoogleSignUp() {
    setErr("");
    setGooglePending(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setErr("Google sign-up isn’t available right now.");
      setGooglePending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {err ? (
        <p className={ui.errorText} role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <div className={`${ui.cardMuted} border-emerald-800/40 bg-emerald-950/30`}>
          <p className={ui.successText}>{ok}</p>
          <Link href={callbackUrl !== "/dashboard" ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"} className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </div>
      ) : null}
      {googleEnabled ? (
        <>
          <button type="button" disabled={pending || googlePending} onClick={() => void onGoogleSignUp()} className={`${ui.buttonSecondary} w-full`}>
            {googlePending ? "Connecting…" : "Continue with Google"}
          </button>
          <div className={`flex items-center gap-(--pm-space-3) ${ui.overline} text-[var(--muted)]`}>
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span>or email</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
        </>
      ) : null}
      <div className={`${ui.cardMuted} border-[var(--border)]/80`}>
        <p className="text-sm font-medium text-[var(--foreground)]">Same login for shopping and for your studio.</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          When you open a studio, you agree to the{" "}
          <Link href="/vendor-terms" className="font-medium text-[var(--accent)] underline-offset-2 hover:underline">
            studio terms
          </Link>
          .
        </p>
      </div>
      <div>
        <label className={ui.label} htmlFor="reg-email">
          Email
        </label>
        <input
          id="reg-email"
          className={`${ui.input} mt-2`}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-[var(--border)]"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          disabled={pending}
        />
        <span>Email me tips. Unsubscribe anytime.</span>
      </label>
      <div>
        <label className={ui.label} htmlFor="reg-password">
          Password
        </label>
        <input
          id="reg-password"
          className={`${ui.input} mt-2`}
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={pending}
        />
      </div>
      <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full`}>
        {pending ? "Creating…" : "Continue"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href={callbackUrl !== "/dashboard" ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"} className="font-medium text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
