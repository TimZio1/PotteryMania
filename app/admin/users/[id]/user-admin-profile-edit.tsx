"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type Props = {
  userId: string;
  initial: {
    email: string;
    fullName: string | null;
    phone: string | null;
  };
};

export function UserAdminProfileEdit({ userId, initial }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initial.email);
  const [fullName, setFullName] = useState(initial.fullName ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState<"ok" | "error" | "">("");

  function buildProfilePayload() {
    const out: Record<string, string | null> = {};
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail !== initial.email.toLowerCase()) {
      out.email = trimmedEmail;
    }
    const cleanedName = fullName.trim();
    const finalName = cleanedName.length > 0 ? cleanedName : null;
    if (finalName !== (initial.fullName ?? null)) {
      out.fullName = finalName;
    }
    const cleanedPhone = phone.trim();
    const finalPhone = cleanedPhone.length > 0 ? cleanedPhone : null;
    if (finalPhone !== (initial.phone ?? null)) {
      out.phone = finalPhone;
    }
    return out;
  }

  async function onSave() {
    const trimmedReason = reason.trim();
    if (trimmedReason.length === 0) {
      setMsg("Audit reason is required.");
      setMsgKind("error");
      return;
    }
    const profile = buildProfilePayload();
    if (Object.keys(profile).length === 0) {
      setMsg("No changes to save.");
      setMsgKind("error");
      return;
    }
    setBusy(true);
    setMsg("");
    setMsgKind("");
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, reason: trimmedReason }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Save failed.");
        setMsgKind("error");
        return;
      }
      setMsg(
        profile.email
          ? "Saved. Email changed → verification has been reset."
          : "Saved profile changes.",
      );
      setMsgKind("ok");
      setReason("");
      router.refresh();
    } catch {
      setMsg("Network error.");
      setMsgKind("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-900">Edit profile</h3>
        <p className="text-xs text-stone-500">Audit-logged · admin only</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 block">
          <span className={ui.label}>Email *</span>
          <input
            type="email"
            className={`${ui.input} mt-1`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-stone-500">
            Changing email resets verification. The user must re-verify on next sign-in.
          </p>
        </label>

        <label className="block">
          <span className={ui.label}>Full name</span>
          <input
            type="text"
            className={`${ui.input} mt-1`}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className={ui.label}>Phone</span>
          <input
            type="tel"
            className={`${ui.input} mt-1`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </label>
      </div>

      <label className="mt-5 block">
        <span className={ui.label}>Audit reason</span>
        <textarea
          className={`${ui.input} mt-1 min-h-20`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer requested email correction after typo at signup."
          maxLength={500}
          disabled={busy}
        />
      </label>

      {msg ? (
        <p className={`mt-3 text-sm ${msgKind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg}</p>
      ) : null}

      <div className="mt-4">
        <button type="button" className={ui.buttonPrimary} onClick={onSave} disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
