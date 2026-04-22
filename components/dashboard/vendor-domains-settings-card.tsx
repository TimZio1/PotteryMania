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

type DomainSetup = {
  connectTargetHostname: string | null;
  canonicalOrigin: string | null;
  resolveBaseUrl: string | null;
  setupReady: boolean;
};

type Props = {
  studioId: string;
  studioApproved: boolean;
};

export default function VendorDomainsSettingsCard({ studioId, studioApproved }: Props) {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [setup, setSetup] = useState<DomainSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/studios/${studioId}/vendor-domains`);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "We couldn’t load your domains. Try again.");
      setDomains([]);
      return;
    }
    const j = (await res.json()) as { domains?: DomainRow[]; setup?: DomainSetup };
    setDomains(Array.isArray(j.domains) ? j.domains : []);
    setSetup(j.setup ?? null);
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
      const j = (await res.json().catch(() => ({}))) as { error?: string; setup?: DomainSetup };
      if (!res.ok) {
        setError(j.error ?? "We couldn’t add that domain. Try again.");
        return;
      }
      if (j.setup) setSetup(j.setup);
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
        setError(j.hint ?? j.error ?? "We couldn’t verify yet. Check your DNS records.");
        return;
      }
      await load();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeDomain(id: string) {
    if (!window.confirm("Remove this domain? People won’t reach your page through it anymore. Your DNS records can stay in place.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/vendor-domains/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "We couldn’t remove that domain. Try again.");
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
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Use your own domain</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Point your own domain at your studio page. Cart, checkout, and account still run on PotteryMania.
        </p>
      </div>

      {setup && !setup.setupReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Custom domains aren’t fully turned on yet on this environment. You can add yours now, but it won’t go live until setup is finished.
        </div>
      ) : null}

      <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4 text-sm text-stone-700">
        <p className="font-medium text-stone-900">How to set it up</p>
        <ol className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
          <li>1. Pick one host — either <code className="rounded bg-white px-1 py-0.5">www.yourstudio.com</code> or the bare <code className="rounded bg-white px-1 py-0.5">yourstudio.com</code>.</li>
          <li>2. Add that host below. We’ll give you two DNS records.</li>
          <li>3. Add the <strong>TXT</strong> record at your DNS provider (proves you own the domain).</li>
          <li>
            4. Add a <strong>CNAME</strong> record pointing your host to{" "}
            {setup?.connectTargetHostname ? (
              <code className="rounded bg-white px-1 py-0.5">{setup.connectTargetHostname}</code>
            ) : (
              "the routing target we’ll show you"
            )}
            .
          </li>
          <li>5. Wait a few minutes, then click <strong>Verify DNS</strong>.</li>
        </ol>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          <code className="rounded bg-white px-1 py-0.5">www</code> and the bare domain count as two separate hosts — add both if you want both.
        </p>
        {setup?.canonicalOrigin ? (
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Cart, checkout, and account stay on:{" "}
            <code className="rounded bg-white px-1 py-0.5 break-all">{setup.canonicalOrigin}</code>
          </p>
        ) : null}
      </div>

      {!studioApproved ? (
        <p className="text-sm text-amber-900">You can add a custom domain once your studio is approved.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className={`${ui.label} flex-1`}>
              <span className="mb-1 block font-medium">Your domain</span>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="www.yourstudio.com"
                className={ui.input}
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

          <p className="text-xs leading-5 text-[var(--muted)]">
            Use the exact host you want customers to type. For most people that’s{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5">www.yourstudio.com</code>.
          </p>

          {error ? <p className={ui.errorText}>{error}</p> : null}

          {loading ? (
            <div className="flex py-2">
              <Spinner />
            </div>
          ) : domains.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No domains yet.</p>
          ) : (
            <ul className="space-y-4">
              {domains.map((d) => (
                <li key={d.id} className="rounded-lg border border-stone-100 bg-stone-50/80 p-3 text-sm text-stone-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-stone-900">{d.domainName}</span>
                    <span className="text-[var(--muted)]">
                      {d.verificationStatus === "verified" ? (d.isActive ? "Live" : "Verified") : "Waiting for verification"}
                    </span>
                  </div>
                  {d.txtHostname && d.txtValue ? (
                    <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                      <p>
                        <span className="font-medium text-[var(--foreground)]">TXT</span> name:{" "}
                        <code className="break-all rounded bg-white px-1 py-0.5">{d.txtHostname}</code>
                      </p>
                      <p>
                        <span className="font-medium text-[var(--foreground)]">TXT</span> value:{" "}
                        <code className="break-all rounded bg-white px-1 py-0.5">{d.txtValue}</code>
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-2 rounded-md bg-white px-3 py-2 text-xs leading-5 text-stone-600">
                    <p>
                      <span className="font-medium text-[var(--foreground)]">CNAME value:</span>{" "}
                      {setup?.connectTargetHostname ? (
                        <code className="break-all rounded bg-stone-100 px-1 py-0.5">{setup.connectTargetHostname}</code>
                      ) : (
                        "We’ll show it after you add the domain."
                      )}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-[var(--foreground)]">What shows on this host:</span> your studio page. Cart, booking, and checkout stay on PotteryMania.
                    </p>
                  </div>
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
