"use client";

import Image from "next/image";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type GalleryRow = {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

export function StudioGalleryClient({
  studioId,
  initialItems,
}: {
  studioId: string;
  initialItems: GalleryRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    const res = await fetch(`/api/studios/${studioId}/gallery-images`);
    const data = (await res.json()) as { items?: GalleryRow[] };
    if (res.ok && data.items) setItems(data.items);
  }

  async function createImage(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/gallery-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, caption: caption || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not add image");
      setImageUrl("");
      setCaption("");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not add image");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(id: string) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/gallery-images/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not delete image");
      }
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not delete image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <form onSubmit={createImage} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block">
          <span className={ui.label}>Image URL</span>
          <input className={`${ui.input} mt-1`} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required />
        </label>
        <label className="block">
          <span className={ui.label}>Caption (optional)</span>
          <input className={`${ui.input} mt-1`} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <button type="submit" disabled={busy} className={ui.buttonPrimary}>
          {busy ? "Saving..." : "Add gallery image"}
        </button>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No gallery images yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((img) => (
            <article key={img.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <Image src={img.imageUrl} alt={img.caption || "Gallery image"} width={640} height={320} className="h-44 w-full object-cover" unoptimized />
              <div className="p-3">
                <p className="text-xs text-[var(--muted)]">Order: {img.sortOrder}</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{img.caption || "No caption"}</p>
                <button type="button" className="mt-2 text-xs font-medium text-red-400 hover:underline" onClick={() => void removeImage(img.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
