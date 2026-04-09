"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";
import { allCeramicCategories, ceramicCategoryMetaBySlug } from "@/lib/ceramic-categories";

type Row = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  imageUrl: string;
  icon: string | null;
  isActive: boolean;
};

export default function CategoriesAdminClient({ initial }: { initial: Row[] }) {
  const defaultMeta = ceramicCategoryMetaBySlug("tableware");
  const [rows, setRows] = useState<Row[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    slug: "tableware",
    name: "Tableware",
    shortDescription: defaultMeta?.shortDescription ?? "",
    longDescription: defaultMeta?.longDescription ?? "",
    imageUrl: defaultMeta?.imageUrl ?? "",
    icon: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function updateLocal(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function saveRow(row: Row) {
    setBusyId(row.id);
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/categories/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: row.name,
        shortDescription: row.shortDescription,
        longDescription: row.longDescription,
        imageUrl: row.imageUrl,
        icon: row.icon,
        isActive: row.isActive,
      }),
    });
    setBusyId(null);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setErr(data.error ?? "Save failed");
      return;
    }
    setMsg(`${row.name} updated`);
  }

  async function createRow(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    setCreating(false);
    const data = (await res.json().catch(() => ({}))) as { error?: string; category?: Row };
    if (!res.ok) {
      setErr(data.error ?? "Create failed");
      return;
    }
    if (data.category) {
      const created = data.category;
      setRows((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setMsg("Category created");
  }

  return (
    <div className="mt-8 space-y-4">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      {msg ? <p className={ui.successText}>{msg}</p> : null}
      <form onSubmit={(e) => void createRow(e)} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-stone-900">Create category</p>
        <p className="mt-1 text-xs text-stone-500">Use one of the locked slugs if it does not exist yet.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>
            <span className={ui.label}>Slug</span>
            <select
              className={`${ui.input} mt-1`}
              value={createForm.slug}
              onChange={(e) => {
                const slug = e.target.value;
                const meta = ceramicCategoryMetaBySlug(slug);
                setCreateForm((f) => ({
                  ...f,
                  slug,
                  name: meta?.title ?? f.name,
                  shortDescription: meta?.shortDescription ?? f.shortDescription,
                  longDescription: meta?.longDescription ?? f.longDescription,
                  imageUrl: meta?.imageUrl ?? f.imageUrl,
                  icon: meta?.icon ?? f.icon,
                }));
              }}
            >
              {allCeramicCategories().map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.slug}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={ui.label}>Name</span>
            <input
              className={`${ui.input} mt-1`}
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={ui.label}>Short description</span>
            <textarea
              className={`${ui.input} mt-1 min-h-[64px]`}
              value={createForm.shortDescription}
              onChange={(e) => setCreateForm((f) => ({ ...f, shortDescription: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={ui.label}>Long description</span>
            <textarea
              className={`${ui.input} mt-1 min-h-[96px]`}
              value={createForm.longDescription}
              onChange={(e) => setCreateForm((f) => ({ ...f, longDescription: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={ui.label}>Image URL</span>
            <input
              className={`${ui.input} mt-1`}
              value={createForm.imageUrl}
              onChange={(e) => setCreateForm((f) => ({ ...f, imageUrl: e.target.value }))}
            />
          </label>
        </div>
        <button type="submit" disabled={creating} className={`${ui.buttonSecondary} mt-4`}>
          {creating ? "Creating..." : "Create"}
        </button>
      </form>
      {rows.map((row) => (
        <article key={row.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-stone-900">{row.name}</p>
              <p className="text-xs font-mono text-stone-500">{row.slug}</p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={row.isActive}
                onChange={(e) => updateLocal(row.id, { isActive: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={ui.label}>Category title</span>
              <input
                className={`${ui.input} mt-1`}
                value={row.name}
                onChange={(e) => updateLocal(row.id, { name: e.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={ui.label}>Hero image URL</span>
              <input
                className={`${ui.input} mt-1`}
                value={row.imageUrl}
                onChange={(e) => updateLocal(row.id, { imageUrl: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={ui.label}>Icon (optional)</span>
              <input
                className={`${ui.input} mt-1`}
                value={row.icon ?? ""}
                onChange={(e) => updateLocal(row.id, { icon: e.target.value || null })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={ui.label}>Short description</span>
              <textarea
                className={`${ui.input} mt-1 min-h-[70px]`}
                value={row.shortDescription}
                onChange={(e) => updateLocal(row.id, { shortDescription: e.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={ui.label}>Long description (SEO)</span>
              <textarea
                className={`${ui.input} mt-1 min-h-[120px]`}
                value={row.longDescription}
                onChange={(e) => updateLocal(row.id, { longDescription: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => void saveRow(row)}
              disabled={busyId === row.id}
              className={ui.buttonPrimary}
            >
              {busyId === row.id ? "Saving..." : "Save category"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
