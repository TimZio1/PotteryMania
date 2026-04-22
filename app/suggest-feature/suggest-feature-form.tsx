"use client";

import { useState, type FormEvent } from "react";
import { ui } from "@/lib/ui-styles";

type Status = "idle" | "submitting" | "success" | "error";

export function SuggestFeatureForm({ defaultEmail }: { defaultEmail: string }) {
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/feature-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          submitterEmail: email,
          submitterName: name,
          website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "We couldn’t send that. Try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setBody("");
      setName("");
    } catch {
      setError("We couldn’t send that. Try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={`${ui.card} space-y-3`}>
        <p className="text-lg font-semibold text-[var(--foreground)]">Thanks — we got it.</p>
        <p className="text-sm text-[var(--muted)]">
          We read every idea. If we build it, we’ll let you know.
          {email ? " Keep an eye on your inbox for a quick confirmation." : ""}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={ui.buttonSecondary}
        >
          Send another idea
        </button>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <label className={ui.label}>
        <span className="mb-1 block">Your idea</span>
        <textarea
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What would make PotteryMania better for you?"
          className={`${ui.input} resize-y`}
          disabled={submitting}
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          A few sentences is plenty. Tell us the problem, not just the fix.
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={ui.label}>
          <span className="mb-1 block">Your email (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={ui.input}
            autoComplete="email"
            disabled={submitting}
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            So we can ask a follow-up or tell you when it ships.
          </span>
        </label>

        <label className={ui.label}>
          <span className="mb-1 block">Your name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            className={ui.input}
            autoComplete="name"
            disabled={submitting}
          />
        </label>
      </div>

      <div aria-hidden="true" className="hidden">
        <label>
          Leave this field empty
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error ? <p className={ui.errorText}>{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--muted)]">
          We read every suggestion. We can’t always reply, but it goes straight to the team.
        </p>
        <button
          type="submit"
          disabled={submitting || body.trim().length < 10}
          className={ui.buttonPrimary}
        >
          {submitting ? "Sending…" : "Send idea"}
        </button>
      </div>
    </form>
  );
}
