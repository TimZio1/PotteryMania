"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";

type DomainRow = {
  id: string;
  domainName: string;
  domainType: string;
  verificationStatus: string;
  sslStatus: string;
  isActive: boolean;
  txtHostname: string | null;
  txtValue: string | null;
};

type Props = {
  studioId: string;
  studioApproved: boolean;
};

export default function VendorDomainsSettingsCard({ studioId, studioApproved }: Props) {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/studios/${studioId}/vendor-domains`);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Could not load domains");
      setDomains([]);
      return;
    }
    const j = (await res.json()) as { domains?: DomainRow[] };
    setDomains(Array.isArray(j.domains) ? j.domains : []);
  }, [studioId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function addDomain() {
    const domainName = domainInput.trim();
    if (!domainName) return;
    setBusyId("__add");
    setError(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/vendor-domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainName, domainType: "custom" }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not add domain");
        return;
      }
      setDomainInput("");
      await load();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function verifyDomain(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/vendor-domains/${id}/verify`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
      if (!res.ok) {
        setError(j.hint ?? j.error ?? "Verification failed");
        return;
      }
      await load();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeDomain(id: string) {
    if (!window.confirm("Remove this domain from PotteryMania? DNS can stay; routing will stop immediately.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/vendor-domains/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Could not remove domain");
        return;
      }
      await load();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={`${ui.card} space-y-4`}>
      <h2 className="text-lg font-semibold text-stone-900">Custom domain</h2>
      <p className="text-sm text-stone-600">
        Point your domain’s DNS to this app (your host’s docs). Add the domain here, publish the TXT record we show, then verify. Your studio page will load on{" "}
        <code className="rounded bg-stone-100 px-1">/</code> on that host; checkout and cart stay on the main PotteryMania site.
      </p>

      {!studioApproved ? (
        <p className="text-sm text-amber-900">Custom domains are available after your studio is approved.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm text-stone-700">
              <span className="mb-1 block font-medium">Domain</span>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="shop.example.com"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 outline-none ring-amber-900/20 focus:ring-2"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              disabled={busyId !== null || !domainInput.trim()}
              onClick={() => void addDomain()}
              className={ui.buttonSecondary}
            >
              {busyId === "__add" ? "Adding…" : "Add domain"}
            </button>
          </div>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          {loading ? (
            <div className="flex py-2">
              <Spinner />
            </div>
          ) : domains.length === 0 ? (
            <p className="text-sm text-stone-500">No domains yet.</p>
          ) : (
            <ul className="space-y-4">
              {domains.map((d) => (
                <li key={d.id} className="rounded-lg border border-stone-100 bg-stone-50/80 p-3 text-sm text-stone-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-stone-900">{d.domainName}</span>
                    <span className="text-stone-600">
                      {d.verificationStatus === "verified" ? (d.isActive ? "Active" : "Verified") : d.verificationStatus}
                    </span>
                  </div>
                  {d.txtHostname && d.txtValue ? (
                    <div className="mt-2 space-y-1 text-xs text-stone-600">
                      <p>
                        <span className="font-medium text-stone-700">TXT</span> name:{" "}
                        <code className="break-all rounded bg-white px-1 py-0.5">{d.txtHostname}</code>
                      </p>
                      <p>
                        <span className="font-medium text-stone-700">TXT</span> value:{" "}
                        <code className="break-all rounded bg-white px-1 py-0.5">{d.txtValue}</code>
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.verificationStatus !== "verified" ? (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void verifyDomain(d.id)}
                        className={ui.buttonSecondary}
                      >
                        {busyId === d.id ? "Checking…" : "Verify DNS"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void removeDomain(d.id)}
                      className="text-sm font-medium text-rose-800 underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
