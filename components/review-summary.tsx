type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  author?: { email?: string | null } | null;
  product?: { title?: string | null } | null;
  experience?: { title?: string | null } | null;
};

export function ReviewSummary({
  title,
  avgRating,
  count,
  reviews,
}: {
  title: string;
  avgRating: number;
  count: number;
  reviews: Review[];
}) {
  return (
    <section className="mt-12 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-amber-950">{title}</h2>
          <p className="mt-1 text-sm text-stone-600">
            {count > 0 ? `${avgRating.toFixed(1)} / 5 from ${count} review${count === 1 ? "" : "s"}` : "No reviews yet"}
          </p>
        </div>
      </div>
      {reviews.length > 0 ? (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="border-t border-stone-100 pt-4 first:border-0 first:pt-0">
              <p className="text-sm font-medium text-amber-900">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
              {review.title ? <h3 className="mt-2 text-sm font-semibold text-stone-900">{review.title}</h3> : null}
              {review.body ? <p className="mt-2 text-sm leading-relaxed text-stone-600">{review.body}</p> : null}
              <p className="mt-2 text-xs text-stone-400">{review.author?.email ? review.author.email.replace(/(.{2}).+(@.*)/, "$1***$2") : "Verified customer"}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
