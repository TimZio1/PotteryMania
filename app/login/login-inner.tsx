"use client";

import { getProviders, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";

function messageForAuthError(error: string | undefined, code: string | undefined): string | null {
  if (code === "suspended" || error === "AccessDenied") {
    return "This account has been suspended. Contact support if you think this is a mistake.";
  }
  if (code === "email_not_verified") {
    return "Verify your email before signing in. Use a fresh verification link or register again if the link expired.";
  }
  if (code === "rate_limited") {
    return "Too many sign-in attempts. Wait a few minutes and try again.";
  }
  if (error === "Configuration") {
    return "Sign-in is temporarily unavailable. Please try again later.";
  }
  if (error === "CredentialsSignin" || error === "CallbackRouteError") {
    return "Invalid email or password.";
  }
  if (error) {
    return "Unable to sign in. Please try again.";
  }
  return null;
}

export default function LoginInner() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard";
  const suspendedNotice = sp.get("reason") === "suspended";
  const verifiedOk = sp.get("verified") === "1";
  const verifiedBad = sp.get("verified") === "invalid";
  const urlAuthError = sp.get("error") ?? undefined;
  const urlAuthCode = sp.get("code") ?? undefined;
  const urlDerivedErr = useMemo(
    () => messageForAuthError(urlAuthError, urlAuthCode),
    [urlAuthError, urlAuthCode],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
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

  const displayErr = err || urlDerivedErr;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setPending(true);
    try {
      const r = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (r?.error) {
        setErr(messageForAuthError(r.error, r.code ?? undefined) ?? "Invalid email or password.");
        setPending(false);
        return;
      }
      if (r?.ok) {
        let dest = callbackUrl;
        if (r.url) {
          try {
            const u = new URL(r.url, window.location.origin);
            if (!u.searchParams.get("error")) {
              dest = r.url.startsWith("http") ? r.url : `${u.pathname}${u.search}`;
            }
          } catch {
            dest = r.url;
          }
        }
        window.location.assign(dest);
        return;
      }
      setErr("Invalid email or password.");
      setPending(false);
    } catch {
      setErr("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  async function onGoogleSignIn() {
    setErr("");
    setGooglePending(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setErr("Google sign-in is unavailable right now.");
      setGooglePending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {suspendedNotice ? (
        <p className={ui.errorText}>This account has been suspended. Contact support if you think this is a mistake.</p>
      ) : null}
      {verifiedOk ? (
        <div className={`${ui.cardMuted} border-emerald-800/40 bg-emerald-950/30`}>
          <p className={ui.successText}>Your email is verified. You can sign in.</p>
        </div>
      ) : null}
      {verifiedBad ? (
        <p className={ui.errorText}>
          This verification link is invalid or has expired. Sign in and use &quot;Resend email&quot; from your dashboard,
          or register again.
        </p>
      ) : null}
      {displayErr ? <p className={ui.errorText}>{displayErr}</p> : null}
      {googleEnabled ? (
        <>
          <button type="button" disabled={pending || googlePending} onClick={() => void onGoogleSignIn()} className={`${ui.buttonSecondary} w-full`}>
            {googlePending ? "Connecting Google…" : "Continue with Google"}
          </button>
          <div className={`flex items-center gap-(--pm-space-3) ${ui.overline} text-[var(--muted)]`}>
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span>or sign in with email</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
        </>
      ) : null}
      <div>
        <label className={ui.label} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
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
      <div>
        <label className={ui.label} htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          className={`${ui.input} mt-2`}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={pending}
        />
        <p className="mt-2 text-right text-sm">
          <Link href="/forgot-password" className="font-medium text-[var(--accent)] hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
      <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        New here?{" "}
        <Link href={callbackUrl && callbackUrl !== "/dashboard" ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"} className="font-medium text-[var(--accent)] hover:underline">
          Create an account
        </Link>
      </p>
      <p className="text-center text-xs text-[var(--muted)]">
        Early-access interest alone doesn&apos;t create a password — you need a full account when registration is open.
      </p>
    </form>
  );
}
