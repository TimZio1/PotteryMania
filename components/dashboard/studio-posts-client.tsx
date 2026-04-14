"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type PostRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
};

export function StudioPostsClient({
  studioId,
  initialPosts,
}: {
  studioId: string;
  initialPosts: PostRow[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    const res = await fetch(`/api/studios/${studioId}/posts?includeDrafts=1`);
    const data = (await res.json()) as { items?: PostRow[] };
    if (res.ok && data.items) setPosts(data.items);
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, isPublished: false }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create post");
      setTitle("");
      setContent("");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not create post");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(post: PostRow) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not update post");
      }
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <form onSubmit={createPost} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block">
          <span className={ui.label}>Title</span>
          <input className={`${ui.input} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="block">
          <span className={ui.label}>Content</span>
          <textarea className={`${ui.input} mt-1 min-h-24`} value={content} onChange={(e) => setContent(e.target.value)} required />
        </label>
        <button type="submit" disabled={busy} className={ui.buttonPrimary}>
          {busy ? "Saving..." : "Create draft"}
        </button>
      </form>

      {posts.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No posts yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-xs text-[var(--muted)]">{post.isPublished ? "Published" : "Draft"}</p>
              <p className="mt-1 font-medium text-[var(--foreground)]">{post.title}</p>
              <p className="text-xs text-[var(--muted)]">/{post.slug}</p>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{post.content}</p>
              <button type="button" className="mt-2 text-xs font-medium text-[var(--accent)] underline" onClick={() => void togglePublish(post)}>
                {post.isPublished ? "Unpublish" : "Publish"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
