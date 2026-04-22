"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewAuthorLabel } from "@/lib/review-author";
import { ui } from "@/lib/ui-styles";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVisible: boolean;
  isFeatured: boolean;
  createdAt: string | Date;
  author: { customerProfile: { fullName: string | null } | null } | null;
  experience: { title: string } | null;
};

export default function StudioReviewsClient({
  studioId,
  initialReviews,
}: {
  studioId: string;
  initialReviews: ReviewRow[];
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateReview(reviewId: string, patch: { isVisible?: boolean; isFeatured?: boolean }) {
    setBusyId(reviewId);
    setError(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/reviews/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, ...patch }),
      });
      const data = (await res.json()) as { error?: string; review?: { isVisible: boolean; isFeatured: boolean } };
      if (!res.ok || !data.review) throw new Error(data.error ?? "We couldn’t update that review. Try again.");
      setReviews((current) =>
        current.map((entry) =>
          entry.id === reviewId
            ? {
                ...entry,
                isVisible: data.review!.isVisible,
                isFeatured: data.review!.isFeatured,
              }
            : entry,
        ),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t update that review. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={ui.card}>
      <h2 className="text-lg font-semibold text-[var(--foreground)]">All reviews</h2>
      {error ? <p className={`${ui.errorText} mt-3`}>{error}</p> : null}
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No reviews yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{review.title || "Untitled review"}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {reviewAuthorLabel(review.author)}
                    {review.experience ? ` · ${review.experience.title}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={ui.buttonGhost}
                    disabled={busyId === review.id}
                    onClick={() => updateReview(review.id, { isVisible: !review.isVisible })}
                  >
                    {review.isVisible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className={ui.buttonGhost}
                    disabled={busyId === review.id}
                    onClick={() => updateReview(review.id, { isFeatured: !review.isFeatured })}
                  >
                    {review.isFeatured ? "Unfeature" : "Feature"}
                  </button>
                </div>
              </div>
              {review.body ? <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground)]">{review.body}</p> : null}
              <p className="mt-2 text-xs text-stone-400">
                {review.isVisible ? "Visible on your page" : "Hidden"}
                {review.isFeatured ? " · Featured" : ""} · {new Date(review.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
