"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmActionModal } from "@/components/admin/confirm-action-modal";
import { normalizeAdminTags } from "@/lib/admin-user-tags";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

const SUGGESTIONS = ["vip", "at-risk", "high-value", "fraud-watch", "tester", "partner"];

type Props = { userId: string; initialTags: string[] };

export function UserAdminTagsPanel({ userId, initialTags }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(() => [...initialTags].sort());
  const [draft, setDraft] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState("");

  const dirty = useMemo(() => {
    const a = [...tags].sort();
    const b = [...initialTags].sort();
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [tags, initialTags]);

  function addDraft() {
    const next = normalizeAdminTags([...tags, draft]);
    setTags(next);
    setDraft("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  async function save(reason: string) {
    setPending(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminTags: tags, reason }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Save failed");
        return;
      }
      setSaveOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-amber-950">Admin flags</p>
      <p className="mt-1 text-xs text-stone-500">
        Internal labels only (lowercase, letters, numbers, hyphens). Shown in the users list; customers never see them.
      </p>
      {msg ? <p className={`${ui.errorText} mt-2`}>{msg}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-sm text-stone-500">No tags</span>
        ) : (
          tags.map((t) => (
            <button
              key={t}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-800 hover:bg-stone-100"
              onClick={() => removeTag(t)}
              title="Click to remove (save to apply)"
            >
              {t}
              <span className="text-stone-400">×</span>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-[180px] flex-1">
          <span className={ui.label}>Add tag</span>
          <input
            list="admin-tag-suggestions"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={cn(ui.input, "mt-1 min-h-10")}
            placeholder="e.g. at-risk"
          />
          <datalist id="admin-tag-suggestions">
            {SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <button type="button" className={ui.buttonSecondary} onClick={addDraft} disabled={!draft.trim()}>
          Add
        </button>
      </div>

      <button
        type="button"
        className={`${ui.buttonPrimary} mt-4`}
        disabled={!dirty || pending}
        onClick={() => setSaveOpen(true)}
      >
        Save tags
      </button>

      <ConfirmActionModal
        open={saveOpen}
        title="Save admin flags"
        description="Tag changes are audit logged with your reason."
        confirmLabel="Save"
        onCancel={() => setSaveOpen(false)}
        onConfirm={save}
        pending={pending}
      />
    </div>
  );
}
