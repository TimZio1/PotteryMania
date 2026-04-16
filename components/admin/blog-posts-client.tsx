"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  tags: string[];
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
};

export function BlogPostsClient({ initialPosts }: { initialPosts: BlogPostRow[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    body: "",
    author: "PotteryMania Editorial",
    tags: "",
    coverImage: "",
    seoTitle: "",
    seoDescription: "",
  });

  async function refresh() {
    const res = await fetch("/api/admin/blog");
    const data = (await res.json()) as { items?: BlogPostRow[] };
    if (res.ok && data.items) setPosts(data.items);
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create post");
      setForm({
        title: "",
        excerpt: "",
        body: "",
        author: "PotteryMania Editorial",
        tags: "",
        coverImage: "",
        seoTitle: "",
        seoDescription: "",
      });
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not create post");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(post: BlogPostRow) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update post");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update post");
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(id: string) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete post");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not delete post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {err ? <p className={ui.errorText}>{err}</p> : null}

      <form onSubmit={createPost} className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4">
        <label className="block">
          <span className={ui.label}>Title</span>
          <input className={`${ui.input} mt-1`} value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} required />
        </label>
        <label className="block">
          <span className={ui.label}>Excerpt</span>
          <textarea className={`${ui.input} mt-1 min-h-20`} value={form.excerpt} onChange={(e) => setForm((v) => ({ ...v, excerpt: e.target.value }))} required />
        </label>
        <label className="block">
          <span className={ui.label}>Body</span>
          <textarea className={`${ui.input} mt-1 min-h-48`} value={form.body} onChange={(e) => setForm((v) => ({ ...v, body: e.target.value }))} required />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className={ui.label}>Author</span>
            <input className={`${ui.input} mt-1`} value={form.author} onChange={(e) => setForm((v) => ({ ...v, author: e.target.value }))} />
          </label>
          <label className="block">
            <span className={ui.label}>Tags</span>
            <input className={`${ui.input} mt-1`} value={form.tags} onChange={(e) => setForm((v) => ({ ...v, tags: e.target.value }))} placeholder="seo, pottery studio, classes" />
          </label>
          <label className="block">
            <span className={ui.label}>Cover image URL</span>
            <input className={`${ui.input} mt-1`} value={form.coverImage} onChange={(e) => setForm((v) => ({ ...v, coverImage: e.target.value }))} />
          </label>
          <label className="block">
            <span className={ui.label}>SEO title</span>
            <input className={`${ui.input} mt-1`} value={form.seoTitle} onChange={(e) => setForm((v) => ({ ...v, seoTitle: e.target.value }))} />
          </label>
        </div>
        <label className="block">
          <span className={ui.label}>SEO description</span>
          <textarea className={`${ui.input} mt-1 min-h-20`} value={form.seoDescription} onChange={(e) => setForm((v) => ({ ...v, seoDescription: e.target.value }))} />
        </label>
        <button type="submit" disabled={busy} className={ui.buttonPrimary}>
          {busy ? "Saving..." : "Create draft"}
        </button>
      </form>

      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.id} className="rounded-xl border border-(--border) bg-(--surface) p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-(--muted)">{post.isPublished ? "Published" : "Draft"}</p>
                <p className="mt-1 font-medium text-foreground">{post.title}</p>
                <p className="text-xs text-(--muted)">/{post.slug}</p>
                <p className="mt-2 text-sm text-(--muted)">{post.excerpt}</p>
              </div>
              <div className="flex gap-3">
                <button type="button" className="text-xs font-medium text-(--accent) underline" onClick={() => void togglePublish(post)}>
                  {post.isPublished ? "Unpublish" : "Publish"}
                </button>
                <button type="button" className="text-xs font-medium text-red-700 underline" onClick={() => void deletePost(post.id)}>
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
