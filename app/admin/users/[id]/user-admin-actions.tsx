"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import type { UserRole } from "@prisma/client";
import { ConfirmActionModal } from "@/components/admin/confirm-action-modal";
import { ui } from "@/lib/ui-styles";

const ALL_ROLES: UserRole[] = ["customer", "vendor", "admin", "hyper_admin"];

type Props = {
  userId: string;
  email: string;
  role: UserRole;
  suspended: boolean;
  actorIsHyperAdmin: boolean;
  canImpersonate: boolean;
};

export function UserAdminActions({
  userId,
  email,
  role,
  suspended,
  actorIsHyperAdmin,
  canImpersonate,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [nextRole, setNextRole] = useState<UserRole>(role);

  async function patch(body: object): Promise<boolean> {
    setPending(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Request failed");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function patchRole(reason: string) {
    const ok = await patch({ role: nextRole, reason });
    if (ok) setRoleOpen(false);
  }

  async function patchSuspend(reason: string) {
    const ok = await patch({
      suspended: !suspended,
      suspendedReason: suspended ? undefined : "Policy violation",
      reason,
    });
    if (ok) setSuspendOpen(false);
  }

  const selectableRoles: UserRole[] = actorIsHyperAdmin
    ? ALL_ROLES
    : (["customer", "vendor"] as UserRole[]);
  const canChangeRole =
    actorIsHyperAdmin || role === "customer" || role === "vendor";

  async function impersonate() {
    setPending(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/users/${userId}/impersonate`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Impersonation failed");
        return;
      }
      const grantId = typeof j.grantId === "string" ? j.grantId : "";
      if (!grantId) {
        setMsg("Invalid server response");
        return;
      }
      await update({ impersonationGrantId: grantId });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg ? <p className={ui.errorText}>{msg}</p> : null}

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Role</p>
        <p className="mt-1 text-xs text-stone-500">Current: {role}</p>
        {!canChangeRole ? (
          <p className="mt-3 text-sm text-stone-600">Only a hyper_admin can change roles for admin accounts.</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="min-w-[160px]">
              <span className={ui.label}>New role</span>
              <select
                className={`${ui.input} mt-1`}
                value={nextRole}
                onChange={(e) => setNextRole(e.target.value as UserRole)}
              >
                {selectableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={ui.buttonPrimary} onClick={() => setRoleOpen(true)} disabled={nextRole === role}>
              Update role
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Access</p>
        <p className="mt-1 text-xs text-stone-500">
          {suspended ? "This account cannot sign in." : "Sign-in allowed when credentials are valid."}
        </p>
        <button type="button" className={`${ui.buttonSecondary} mt-3`} onClick={() => setSuspendOpen(true)}>
          {suspended ? "Lift suspension" : "Suspend account"}
        </button>
      </div>

      {canImpersonate ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-950">Impersonate</p>
          <p className="mt-1 text-xs text-stone-600">
            Open the vendor/customer dashboard as <strong>{email}</strong>. Hyperadmin and admin areas stay blocked
            until you exit. Session switch uses a short-lived server grant (about one minute to apply).
          </p>
          <button
            type="button"
            className={`${ui.buttonPrimary} mt-3`}
            disabled={pending}
            onClick={() => void impersonate()}
          >
            View as this user
          </button>
        </div>
      ) : null}

      <ConfirmActionModal
        open={roleOpen}
        title="Change role"
        description={`Set ${email} to ${nextRole}. Logged with your reason.`}
        confirmLabel="Apply role"
        onCancel={() => setRoleOpen(false)}
        onConfirm={patchRole}
        pending={pending}
      />

      <ConfirmActionModal
        open={suspendOpen}
        title={suspended ? "Lift suspension" : "Suspend account"}
        description={
          suspended
            ? "They will be able to sign in again after this change."
            : "They will be blocked at login until lifted."
        }
        confirmLabel={suspended ? "Unsuspend" : "Suspend"}
        onCancel={() => setSuspendOpen(false)}
        onConfirm={patchSuspend}
        pending={pending}
      />
    </div>
  );
}
