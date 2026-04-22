"use client";

import { getProviders, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";

function messageForAuthError(error: string | undefined, code: string | undefined): string | null {
  if (code === "suspended" || error === "AccessDenied") {
    return "This account is paused. Email support if that looks wrong.";
  }
  if (code === "email_not_verified") {
    return "Confirm your email first — open the link we sent you.";
  }
  if (code === "rate_limited") {
    return "A few too many tries. Wait a few minutes, then have another go.";
  }
  if (error === "Configuration") {
    return "Sign-in isn’t working right now. Try again in a moment.";
  }
  if (error === "CredentialsSignin" || error === "CallbackRouteError") {
    return "That email or password doesn’t match.";
  }
  if (error) {
    return "We couldn’t sign you in. Try again.";
  }
  return null;
}

export default function LoginInner() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard";
  const suspendedNotice = sp.get("reason") === "suspended";
  const verifiedOk = sp.get("verified") === "1";
  const verifiedBad = sp.get("verified") === "invalid";
  const signedOutNotice = sp.get("signedOut") === "1";
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
        setErr(messageForAuthError(r.error, r.code ?? undefined) ?? "That email or password doesn’t match.");
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
      setErr("That email or password doesn’t match.");
      setPending(false);
    } catch {
      setErr("Something went wrong. Try again.");
      setPending(false);
    }
  }

  async function onGoogleSignIn() {
    setErr("");
    setGooglePending(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setErr("Google sign-in isn’t working right now. Try email instead.");
      setGooglePending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {signedOutNotice ? (
        <div className={`${ui.cardMuted} border-emerald-800/40 bg-emerald-950/30`}>
          <p className={ui.successText}>You’re signed out. See you next time.</p>
        </div>
      ) : null}
      {suspendedNotice ? (
        <p className={ui.errorText}>This account is paused. Email support if that looks wrong.</p>
      ) : null}
      {verifiedOk ? (
        <div className={`${ui.cardMuted} border-emerald-800/40 bg-emerald-950/30`}>
          <p className={ui.successText}>Email confirmed. Sign in below.</p>
        </div>
      ) : null}
      {verifiedBad ? (
        <p className={ui.errorText}>
          That link has expired or isn&rsquo;t valid anymore. Sign up again to get a fresh one.
        </p>
      ) : null}
      {displayErr ? <p className={ui.errorText}>{displayErr}</p> : null}
      {googleEnabled ? (
        <>
          <button type="button" disabled={pending || googlePending} onClick={() => void onGoogleSignIn()} className={`${ui.buttonSecondary} w-full`}>
            {googlePending ? "Connecting…" : "Continue with Google"}
          </button>
          <div className={`flex items-center gap-(--pm-space-3) ${ui.overline} text-[var(--muted)]`}>
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span>or email</span>
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
            Forgot your password?
          </Link>
        </p>
      </div>
      <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        First time here?{" "}
        <Link href={callbackUrl && callbackUrl !== "/dashboard" ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"} className="font-medium text-[var(--accent)] hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
