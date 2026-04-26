"use client";

import { useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";

type InboxMessage = {
  id: string;
  direction: string;
  mailbox: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  readAt: string | null;
  savedAt: string | null;
  deletedAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

type Notification = {
  id: string;
  title: string;
  body: string | null;
  level: string;
  readAt: string | null;
  createdAt: string;
};

type Counts = {
  inbox: number;
  sent: number;
  saved: number;
  deleted: number;
  unread: number;
};

type Props = {
  initialMessages: InboxMessage[];
  initialNotifications: Notification[];
  initialCounts: Counts;
};

const FOLDERS: Array<{ id: "inbox" | "saved" | "sent" | "deleted"; label: string }> = [
  { id: "inbox", label: "Inbox" },
  { id: "saved", label: "Saved" },
  { id: "sent", label: "Sent" },
  { id: "deleted", label: "Deleted" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function preview(message: InboxMessage) {
  return (message.textBody || message.htmlBody || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function AdminInboxClient({ initialMessages, initialNotifications, initialCounts }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [notifications] = useState(initialNotifications);
  const [counts, setCounts] = useState(initialCounts);
  const [folder, setFolder] = useState<"inbox" | "saved" | "sent" | "deleted">("inbox");
  const [selectedId, setSelectedId] = useState(initialMessages[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? messages[0] ?? null,
    [messages, selectedId],
  );

  async function reload(nextFolder = folder) {
    const r = await fetch(`/api/admin/inbox?folder=${encodeURIComponent(nextFolder)}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(typeof j.error === "string" ? j.error : "Failed to load inbox.");
      return;
    }
    const nextMessages = Array.isArray(j.messages) ? (j.messages as InboxMessage[]) : [];
    setMessages(nextMessages);
    setCounts((j.counts ?? counts) as Counts);
    setSelectedId(nextMessages[0]?.id ?? "");
  }

  async function chooseFolder(nextFolder: typeof folder) {
    setFolder(nextFolder);
    setMsg("");
    await reload(nextFolder);
  }

  async function mutateMessage(id: string, action: "save" | "unsave" | "delete" | "restore" | "read") {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/inbox/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Action failed.");
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(saveOnly = false) {
    if (!selected) return;
    const body = replyBody.trim();
    if (!body) {
      setMsg("Write a reply first.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/inbox/${selected.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, saveOnly }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Reply failed.");
        return;
      }
      setReplyBody("");
      setMsg(saveOnly ? "Reply saved." : "Reply sent.");
      await reload(folder === "inbox" ? "sent" : folder);
      if (!saveOnly && folder === "inbox") setFolder("sent");
    } finally {
      setBusy(false);
    }
  }

  async function sendCompose(saveOnly = false) {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setMsg("Recipient, subject, and message are required.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: composeTo,
          subject: composeSubject,
          body: composeBody,
          saveOnly,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Send failed.");
        return;
      }
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeOpen(false);
      setMsg(saveOnly ? "Email saved." : "Email sent.");
      setFolder(saveOnly ? "saved" : "sent");
      await reload(saveOnly ? "saved" : "sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <button type="button" className={ui.buttonPrimary} onClick={() => setComposeOpen((v) => !v)}>
          {composeOpen ? "Close composer" : "New email"}
        </button>

        <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          <nav className="space-y-1">
            {FOLDERS.map((f) => {
              const count = counts[f.id];
              const active = folder === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    active ? "bg-amber-950 text-white" : "text-stone-700 hover:bg-stone-100"
                  }`}
                  onClick={() => void chooseFolder(f.id)}
                >
                  <span>{f.label}</span>
                  <span className={active ? "text-white/70" : "text-stone-400"}>{count}</span>
                </button>
              );
            })}
          </nav>
          {counts.unread > 0 ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {counts.unread} unread customer email{counts.unread === 1 ? "" : "s"}.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Platform alerts</p>
          <ul className="mt-3 space-y-3">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="text-xs text-stone-600">
                <p className="font-medium text-stone-900">{n.title}</p>
                {n.body ? <p className="mt-0.5 line-clamp-2">{n.body}</p> : null}
              </li>
            ))}
            {notifications.length === 0 ? <li className="text-xs text-stone-500">No alerts.</li> : null}
          </ul>
        </div>
      </aside>

      <section className="space-y-4">
        {composeOpen ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">Compose email</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={ui.label}>To</span>
                <input className={`${ui.input} mt-1`} value={composeTo} onChange={(e) => setComposeTo(e.target.value)} />
              </label>
              <label className="block">
                <span className={ui.label}>Subject</span>
                <input
                  className={`${ui.input} mt-1`}
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={ui.label}>Message</span>
                <textarea
                  className={`${ui.input} mt-1 min-h-32`}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={ui.buttonPrimary} disabled={busy} onClick={() => void sendCompose(false)}>
                Send email
              </button>
              <button type="button" className={ui.buttonSecondary} disabled={busy} onClick={() => void sendCompose(true)}>
                Save draft
              </button>
            </div>
          </div>
        ) : null}

        {msg ? <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-700">{msg}</p> : null}

        <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="border-b border-stone-200 lg:border-b-0 lg:border-r">
            <ul className="divide-y divide-stone-100">
              {messages.map((m) => {
                const active = selected?.id === m.id;
                const unread = m.direction === "inbound" && !m.readAt;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`block w-full px-4 py-4 text-left transition ${
                        active ? "bg-amber-50" : "hover:bg-stone-50"
                      }`}
                      onClick={() => {
                        setSelectedId(m.id);
                        if (unread) void mutateMessage(m.id, "read");
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm ${unread ? "font-semibold text-stone-950" : "font-medium text-stone-800"}`}>
                          {m.direction === "outbound" ? `To ${m.toEmail}` : m.fromName || m.fromEmail}
                        </p>
                        <time className="shrink-0 text-[11px] text-stone-400">{formatTime(m.createdAt)}</time>
                      </div>
                      <p className={`mt-1 line-clamp-1 text-sm ${unread ? "font-semibold" : ""}`}>{m.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{preview(m) || "No body."}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-500">
                          {m.mailbox}
                        </span>
                        {m.savedAt ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-900">
                            saved
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
              {messages.length === 0 ? <li className="px-4 py-10 text-sm text-stone-500">No messages here.</li> : null}
            </ul>
          </div>

          <article className="p-5">
            {selected ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {selected.direction} · {selected.mailbox}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{selected.subject}</h2>
                    <p className="mt-2 text-sm text-stone-600">
                      From <strong>{selected.fromName || selected.fromEmail}</strong> to <strong>{selected.toEmail}</strong>
                    </p>
                    <p className="mt-1 text-xs text-stone-400">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.savedAt ? (
                      <button
                        type="button"
                        className={ui.buttonSecondary}
                        disabled={busy}
                        onClick={() => void mutateMessage(selected.id, "unsave")}
                      >
                        Unsave
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={ui.buttonSecondary}
                        disabled={busy}
                        onClick={() => void mutateMessage(selected.id, "save")}
                      >
                        Save
                      </button>
                    )}
                    {selected.deletedAt ? (
                      <button
                        type="button"
                        className={ui.buttonSecondary}
                        disabled={busy}
                        onClick={() => void mutateMessage(selected.id, "restore")}
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void mutateMessage(selected.id, "delete")}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="whitespace-pre-wrap rounded-2xl bg-stone-50 p-4 text-sm leading-7 text-stone-800">
                  {selected.textBody || preview(selected) || "No readable message body."}
                </div>

                <div className="rounded-2xl border border-stone-200 p-4">
                  <h3 className="text-sm font-semibold text-stone-900">Reply</h3>
                  <textarea
                    className={`${ui.input} mt-3 min-h-32`}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={`Reply to ${selected.direction === "inbound" ? selected.fromEmail : selected.toEmail}...`}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={ui.buttonPrimary} disabled={busy} onClick={() => void sendReply(false)}>
                      Send reply
                    </button>
                    <button type="button" className={ui.buttonSecondary} disabled={busy} onClick={() => void sendReply(true)}>
                      Save reply
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center text-sm text-stone-500">
                Select a message.
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
