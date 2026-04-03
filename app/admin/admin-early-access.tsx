type Row = {
  id: string;
  email: string;
  studioName: string;
  websiteOrIg: string | null;
  photoUrls: string[];
  wantBooking: boolean;
  wantMarket: boolean;
  wantBoth: boolean;
  createdAt: Date;
};

function interestFlags(r: Row) {
  const parts = [
    r.wantBooking ? "Booking" : null,
    r.wantMarket ? "Marketplace" : null,
    r.wantBoth ? "Both (full)" : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : "—";
}

export function AdminEarlyAccessList({ rows }: { rows: Row[] }) {
  return (
    <div className="mt-10">
      <h2 className="text-lg font-medium text-amber-950">Early access signups</h2>
      <p className="mt-1 text-sm text-stone-500">
        Leads from <code className="rounded bg-stone-100 px-1">/early-access</code>. Newest first.
      </p>
      {!rows.length ? (
        <p className="mt-4 text-sm text-stone-500">No signups yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <p className="font-medium text-amber-950">{r.studioName}</p>
              <p className="mt-1 text-stone-700">
                <a href={`mailto:${r.email}`} className="text-amber-900 underline">
                  {r.email}
                </a>
              </p>
              {r.websiteOrIg && <p className="mt-1 text-stone-600">Web / IG: {r.websiteOrIg}</p>}
              <p className="mt-2 text-xs text-stone-500">Interested in: {interestFlags(r)}</p>
              <p className="mt-1 text-xs text-stone-400">{new Date(r.createdAt).toLocaleString()}</p>
              {r.photoUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.photoUrls.map((url, i) => (
                    <a
                      key={url + i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-amber-800 underline"
                    >
                      Photo {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
