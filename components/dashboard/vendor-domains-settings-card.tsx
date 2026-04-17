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
      setError(j.error ?? "Could not load domains");
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
        setError(j.error ?? "Could not add domain");
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
    if (!window.confirm("Remove this domain from routing? DNS records can stay; storefront routing will stop immediately.")) return;
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
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Custom storefront domain</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Link your own domain to the storefront this site hosts for your studio. Your custom host loads your studio page on{" "}
          <code className="rounded bg-stone-100 px-1">/</code>; booking, checkout, and account flows currently stay on the primary site hostname.
        </p>
      </div>

      {setup && !setup.setupReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Custom-domain routing is not fully configured in this environment yet. Add your domain now if needed, but final live routing will not work
          until the primary site origin is configured.
        </div>
      ) : null}

      <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4 text-sm text-stone-700">
        <p className="font-medium text-stone-900">Domain setup checklist</p>
        <ol className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
          <li>1. Pick one hostname to use publicly first: either <code className="rounded bg-white px-1 py-0.5">www.yourstudio.com</code> or the apex domain.</li>
          <li>2. Add that exact hostname below so we can generate the verification records for it.</li>
          <li>3. Create the TXT record shown for ownership proof.</li>
          <li>
            4. Point the same hostname to{" "}
            {setup?.connectTargetHostname ? (
              <code className="rounded bg-white px-1 py-0.5">{setup.connectTargetHostname}</code>
            ) : (
              "your primary site routing target"
            )}{" "}
            using your DNS provider’s CNAME/ALIAS instructions.
          </li>
          <li>5. Wait for DNS propagation, then click <strong>Verify DNS</strong>.</li>
        </ol>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          Important: <code className="rounded bg-white px-1 py-0.5">www</code> and apex hosts are treated as different domains. If you want both, add and verify both.
        </p>
        {setup?.canonicalOrigin ? (
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Primary site origin for bookings, cart, checkout, and account:{" "}
            <code className="rounded bg-white px-1 py-0.5 break-all">{setup.canonicalOrigin}</code>
          </p>
        ) : null}
      </div>

      {!studioApproved ? (
        <p className="text-sm text-amber-900">Custom storefront domains are available after your studio is approved.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className={`${ui.label} flex-1`}>
              <span className="mb-1 block font-medium">Storefront hostname</span>
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
              {busyId === "__add" ? "Adding…" : "Add storefront domain"}
            </button>
          </div>

          <p className="text-xs leading-5 text-[var(--muted)]">
            Start with the host you actually want customers to type or click. In most cases that is{" "}
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
                      {d.verificationStatus === "verified" ? (d.isActive ? "Live on storefront" : "Verified") : "Awaiting verification"}
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
                      <span className="font-medium text-[var(--foreground)]">Routing target:</span>{" "}
                      {setup?.connectTargetHostname ? (
                        <code className="break-all rounded bg-stone-100 px-1 py-0.5">{setup.connectTargetHostname}</code>
                      ) : (
                        "Use your primary site host target"
                      )}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-[var(--foreground)]">What loads on this host:</span> your studio storefront home. Cart, booking, and checkout
                      stay on the primary site origin.
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
