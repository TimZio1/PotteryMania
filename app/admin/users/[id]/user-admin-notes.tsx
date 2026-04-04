"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type Props = { userId: string };

export function UserAdminNotesForm({ userId }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Failed");
        return;
      }
      setContent("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-amber-950">Internal note</p>
      {msg ? <p className={`${ui.errorText} mt-2`}>{msg}</p> : null}
      <textarea
        className={`${ui.input} mt-3 min-h-[100px] py-2`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Visible to admins only…"
        required
      />
      <button type="submit" className={`${ui.buttonPrimary} mt-3`} disabled={pending || !content.trim()}>
        {pending ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
