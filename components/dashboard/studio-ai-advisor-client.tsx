"use client";

import { useState } from "react";
import Link from "next/link";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

export default function StudioAiAdvisorClient({
  studioId,
  entitled,
  openAiConfigured,
}: {
  studioId: string;
  entitled: boolean;
  openAiConfigured: boolean;
}) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setReply(null);
    const res = await fetch(`/api/studios/${studioId}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = (await res.json()) as { reply?: string; error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    if (data.reply) setReply(data.reply);
  }

  if (!entitled) {
    return (
      <div className={cn(ui.cardMuted, "space-y-4")}>
        <p className="text-sm font-semibold text-[var(--foreground)]">AI Advisor is locked</p>
        <p className="text-sm text-[var(--muted)]">
          Enable the <strong>AI Advisor</strong> add-on under Features to ask questions tailored to your studio&apos;s
          listings and booking activity.
        </p>
        <Link href={`/dashboard/${studioId}/features`} className={cn(ui.buttonPrimary, "inline-flex w-full justify-center text-center sm:w-auto")}>
          Open packs & add-ons
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!openAiConfigured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          AI chat is not available yet. The platform team is finishing the setup — this feature will activate automatically once ready.
        </p>
      ) : null}

      <div className={ui.card}>
        <label htmlFor="ai-msg" className={ui.label}>
          Ask your advisor
        </label>
        <textarea
          id="ai-msg"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={loading || !openAiConfigured}
          placeholder="e.g. How should I price a weekend workshop given my current classes?"
          className={cn(ui.input, "mt-2 min-h-[120px] resize-y")}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !openAiConfigured || !message.trim()}
          className={cn(ui.buttonPrimary, "mt-4")}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              Thinking…
            </span>
          ) : (
            "Get advice"
          )}
        </button>
      </div>

      {error ? <p className="text-sm text-rose-800">{error}</p> : null}

      {reply ? (
        <div className={ui.cardMuted}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Reply</p>
          <div className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground)]">{reply}</div>
        </div>
      ) : null}

      <p className="text-xs text-[var(--muted)]">
        AI output is informational, not legal or financial advice. Always verify important decisions independently.
      </p>
    </div>
  );
}
