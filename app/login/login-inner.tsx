"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";

function messageForAuthError(error: string | undefined, code: string | undefined): string | null {
  if (code === "suspended" || error === "AccessDenied") {
    return "This account has been suspended. Contact support if you think this is a mistake.";
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

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {suspendedNotice ? (
        <p className={ui.errorText}>This account has been suspended. Contact support if you think this is a mistake.</p>
      ) : null}
      {displayErr ? <p className={ui.errorText}>{displayErr}</p> : null}
      <div>
        <label className={ui.label} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className={`${ui.input} mt-1`}
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
          className={`${ui.input} mt-1`}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-stone-600">
        New here?{" "}
        <Link href="/register" className="font-medium text-amber-900 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="text-center text-xs text-stone-500">
        Early-access interest alone doesn&apos;t create a password — you need a full account when registration is open.
      </p>
    </form>
  );
}
