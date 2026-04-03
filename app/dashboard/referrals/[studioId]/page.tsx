"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type Invite = {
  id: string;
  inviteCode: string;
  inviteEmail?: string | null;
  inviteUrl?: string | null;
  inviteStatus: string;
  rewardNote?: string | null;
};

export default function StudioReferralsPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studioId}/referrals`);
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Could not load invites");
      return;
    }
    setInvites(json.invites || []);
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/studios/${studioId}/referrals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteEmail: email }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Could not create invite");
      return;
    }
    setEmail("");
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">Referrals</h1>
      <p className="mt-2 text-sm text-stone-600">Invite other studios and track your referral links.</p>
      {err ? <p className={`${ui.errorText} mt-4`}>{err}</p> : null}

      <form onSubmit={createInvite} className={`${ui.card} mt-8 flex flex-col gap-3 sm:flex-row`}>
        <input
          className={ui.input}
          placeholder="friend@studio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className={ui.buttonPrimary}>
          Create invite
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {invites.map((invite) => (
          <div key={invite.id} className={ui.card}>
            <p className="font-medium text-stone-900">{invite.inviteEmail || invite.inviteCode}</p>
            <p className="mt-1 text-sm text-stone-500">Status: {invite.inviteStatus}</p>
            {invite.inviteUrl ? <p className="mt-2 break-all text-sm text-amber-900">{invite.inviteUrl}</p> : null}
          </div>
        ))}
        {invites.length === 0 ? <p className="text-sm text-stone-500">No referrals yet.</p> : null}
      </div>
    </div>
  );
}
