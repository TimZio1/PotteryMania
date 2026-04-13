"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";
import { Spinner } from "@/components/ui/spinner";
import {
  bookingAllowsFullPaymentOption,
  bookingChargeNowCents,
  normalizeBookingPaymentPreference,
} from "@/lib/bookings/deposit";
import { optimizeImageForUpload } from "@/lib/optimize-image-client";
import { uploadPublicImage } from "@/lib/public-upload";

type PublicAddOn = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  durationMinutesExtra: number;
  isSelectedByDefault: boolean;
  maxPerBooking: number;
  sortOrder: number;
};

type PublicIntakeForm = {
  id: string;
  title: string;
  fieldType: "text_single" | "text_multi" | "number" | "checkbox" | "dropdown" | "date" | "file_upload";
  isRequired: boolean;
  includeInInvoice: boolean;
  sortOrder: number;
  options: unknown;
};

type PublicClientField = {
  id: string;
  title: string;
  fieldType: "text_single" | "text_multi" | "number" | "checkbox" | "dropdown" | "date" | "file_upload";
  isRequired: boolean;
  options: unknown;
  sortOrder: number;
  value: string;
};

type IntakeValue = string | boolean;
type UploadState = { busy: boolean; error: string; uploadedUrl: string };
type PackageOption = {
  id: string;
  creditsRemaining: number;
  creditsRequiredForExperience: number | null;
  expiresAt: string;
  package: {
    name: string;
  };
  canUseForExperience?: boolean;
};

const BOOKING_INTAKE_CLOUDINARY_FOLDER = "potterymania/booking-intake";

export type SlotOption = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacityTotal: number;
  capacityReserved: number;
  seatPoolKeys: string[];
};

export type WaitlistSlotOption = SlotOption;

export function ClassBookingForm(props: {
  studioId: string;
  experienceId: string;
  minP: number;
  maxP: number;
  priceCents: number;
  bookingDepositBps: number;
  allowPayAtStudio: boolean;
  allowFullPaymentOption?: boolean;
  cancellationPolicyLabel?: string | null;
  slots: SlotOption[];
  waitlistSlots: WaitlistSlotOption[];
  /** Deep-link from studio listing: `/classes/[id]?slot=…` */
  initialSlotId?: string;
}) {
  const [slotId, setSlotId] = useState(() => {
    if (props.initialSlotId && props.slots.some((s) => s.id === props.initialSlotId)) {
      return props.initialSlotId;
    }
    return props.slots[0]?.id ?? "";
  });
  const [participantCount, setParticipantCount] = useState(props.minP);
  const [seatType, setSeatType] = useState<string>("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [addOns, setAddOns] = useState<PublicAddOn[]>([]);
  const [addOnsLoading, setAddOnsLoading] = useState(true);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});
  const [intakeForms, setIntakeForms] = useState<PublicIntakeForm[]>([]);
  const [intakeLoading, setIntakeLoading] = useState(true);
  const [intakeValues, setIntakeValues] = useState<Record<string, IntakeValue>>({});
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [packageLoading, setPackageLoading] = useState(true);
  const [selectedPackagePurchaseId, setSelectedPackagePurchaseId] = useState("");
  const [clientFields, setClientFields] = useState<PublicClientField[]>([]);
  const [clientFieldValues, setClientFieldValues] = useState<Record<string, IntakeValue>>({});
  const [clientFieldsLoading, setClientFieldsLoading] = useState(true);
  const [paymentChoice, setPaymentChoice] = useState<"deposit" | "full">(
    normalizeBookingPaymentPreference(undefined, {
      bookingDepositBps: props.bookingDepositBps,
      allowFullPaymentOption: props.allowFullPaymentOption,
    }),
  );

  const [payAtStudioMode, setPayAtStudioMode] = useState(false);
  const [pasName, setPasName] = useState("");
  const [pasEmail, setPasEmail] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [pasLoading, setPasLoading] = useState(false);
  const [pasOk, setPasOk] = useState("");

  const [wlSlotId, setWlSlotId] = useState(props.waitlistSlots[0]?.id ?? "");
  const [wlParticipants, setWlParticipants] = useState(props.minP);
  const [wlName, setWlName] = useState("");
  const [wlEmail, setWlEmail] = useState("");
  const [wlSeatType, setWlSeatType] = useState("");
  const [wlErr, setWlErr] = useState("");
  const [wlOk, setWlOk] = useState("");
  const [wlLoading, setWlLoading] = useState(false);

  const selectedSlot = useMemo(
    () => props.slots.find((s) => s.id === slotId),
    [props.slots, slotId]
  );
  const seatKeys = selectedSlot?.seatPoolKeys ?? [];
  const wlSelected = useMemo(
    () => props.waitlistSlots.find((s) => s.id === wlSlotId),
    [props.waitlistSlots, wlSlotId]
  );
  const wlSeatKeys = wlSelected?.seatPoolKeys ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [addOnRes, intakeRes, packageRes, clientFieldsRes] = await Promise.all([
          fetch(`/api/experiences/${props.experienceId}/add-ons`),
          fetch(`/api/experiences/${props.experienceId}/intake-forms`),
          fetch(
            `/api/packages/my?onlyActive=1&studioId=${encodeURIComponent(props.studioId)}&experienceId=${encodeURIComponent(props.experienceId)}`,
          ),
          fetch(`/api/studios/${props.studioId}/client-fields/me`),
        ]);
        const addOnJson = await addOnRes.json().catch(() => ({}));
        const intakeJson = await intakeRes.json().catch(() => ({}));
        const packageJson = await packageRes.json().catch(() => ({}));
        const clientFieldsJson = await clientFieldsRes.json().catch(() => ({}));
        if (!cancelled) {
          const nextAddOns = addOnRes.ok ? ((addOnJson.addOns as PublicAddOn[] | undefined) ?? []) : [];
          setAddOns(nextAddOns);
          setSelectedAddOns(() => {
            const next: Record<string, number> = {};
            for (const addOn of nextAddOns) {
              if (addOn.isSelectedByDefault) next[addOn.id] = 1;
            }
            return next;
          });
          setAddOnsLoading(false);

          const nextForms = intakeRes.ok ? ((intakeJson.forms as PublicIntakeForm[] | undefined) ?? []) : [];
          setIntakeForms(nextForms);
          setIntakeLoading(false);

          const nextPackages = packageRes.ok
            ? ((packageJson.packagePurchases as PackageOption[] | undefined) ?? []).filter(
                (entry) => entry.canUseForExperience !== false,
              )
            : [];
          setPackageOptions(nextPackages);
          setPackageLoading(false);

          if (clientFieldsRes.ok) {
            const nextFields = ((clientFieldsJson.fields as PublicClientField[] | undefined) ?? []).sort(
              (a, b) => a.sortOrder - b.sortOrder,
            );
            setClientFields(nextFields);
            setClientFieldValues(
              Object.fromEntries(
                nextFields.map((field) => [
                  field.id,
                  field.fieldType === "checkbox" ? field.value === "true" : field.value || "",
                ]),
              ),
            );
          } else {
            setClientFields([]);
            setClientFieldValues({});
          }
          setClientFieldsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setAddOns([]);
          setAddOnsLoading(false);
          setIntakeForms([]);
          setIntakeLoading(false);
          setPackageOptions([]);
          setPackageLoading(false);
          setClientFields([]);
          setClientFieldValues({});
          setClientFieldsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.experienceId, props.studioId]);

  const addOnTotalCents = useMemo(
    () =>
      addOns.reduce((sum, addOn) => {
        const qty = selectedAddOns[addOn.id] ?? 0;
        return qty > 0 ? sum + addOn.priceCents * qty : sum;
      }, 0),
    [addOns, selectedAddOns],
  );

  const selectedAddOnPayload = useMemo(
    () =>
      addOns
        .map((addOn) => ({
          addOnId: addOn.id,
          quantity: selectedAddOns[addOn.id] ?? 0,
        }))
        .filter((selection) => selection.quantity > 0),
    [addOns, selectedAddOns],
  );

  const intakePayload = useMemo(
    () =>
      intakeForms.map((form) => ({
        formId: form.id,
        value:
          form.fieldType === "checkbox"
            ? Boolean(intakeValues[form.id])
            : typeof intakeValues[form.id] === "string"
              ? intakeValues[form.id]
              : "",
      })),
    [intakeForms, intakeValues],
  );

  const clientFieldPayload = useMemo(
    () =>
      clientFields.map((field) => ({
        fieldId: field.id,
        value:
          field.fieldType === "checkbox"
            ? Boolean(clientFieldValues[field.id])
            : typeof clientFieldValues[field.id] === "string"
              ? clientFieldValues[field.id]
              : "",
      })),
    [clientFields, clientFieldValues],
  );

  async function saveClientFieldsIfNeeded() {
    if (clientFields.length === 0) return true;
    for (const field of clientFields) {
      const raw = clientFieldValues[field.id];
      const value = field.fieldType === "checkbox" ? (Boolean(raw) ? "true" : "") : typeof raw === "string" ? raw.trim() : "";
      if (field.isRequired && !value) {
        setErr(`Please complete required profile field: ${field.title}`);
        return false;
      }
    }
    const res = await fetch(`/api/studios/${props.studioId}/client-fields/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: clientFieldPayload }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as { error?: string }));
      setErr(data.error || "Could not save profile fields.");
      return false;
    }
    return true;
  }

  const fullLineCents = props.priceCents * participantCount + addOnTotalCents;
  const selectedPackage = packageOptions.find((entry) => entry.id === selectedPackagePurchaseId) ?? null;
  const packageCoversClassBase = Boolean(selectedPackage);
  const payableLineCents = packageCoversClassBase ? addOnTotalCents : fullLineCents;
  const depositPct = props.bookingDepositBps / 100;
  const dueNowCents = bookingChargeNowCents(
    payableLineCents,
    {
      bookingDepositBps: props.bookingDepositBps,
      allowFullPaymentOption: props.allowFullPaymentOption,
    },
    packageCoversClassBase ? "full" : "deposit",
  );
  const chargeNowCents = bookingChargeNowCents(
    payableLineCents,
    {
      bookingDepositBps: props.bookingDepositBps,
      allowFullPaymentOption: props.allowFullPaymentOption,
    },
    packageCoversClassBase ? "full" : paymentChoice,
  );

  async function onFileUpload(formId: string, file: File | null) {
    if (!file) return;
    setUploadStates((current) => ({
      ...current,
      [formId]: { busy: true, error: "", uploadedUrl: current[formId]?.uploadedUrl ?? "" },
    }));

    try {
      const optimized = await optimizeImageForUpload(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
        maxInputBytes: 8_000_000,
      });
      const uploaded = await uploadPublicImage(optimized, BOOKING_INTAKE_CLOUDINARY_FOLDER);
      setIntakeValues((current) => ({ ...current, [formId]: uploaded.secureUrl }));
      setUploadStates((current) => ({
        ...current,
        [formId]: { busy: false, error: "", uploadedUrl: uploaded.secureUrl },
      }));
    } catch (error) {
      setUploadStates((current) => ({
        ...current,
        [formId]: {
          busy: false,
          error: error instanceof Error ? error.message : "Upload failed.",
          uploadedUrl: current[formId]?.uploadedUrl ?? "",
        },
      }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setAdded(false);
    setLoading(true);
    try {
      const clientOk = await saveClientFieldsIfNeeded();
      if (!clientOk) return;
      const body: Record<string, unknown> = {
        slotId,
        participantCount,
        bookingPaymentPreference: paymentChoice,
        classPackagePurchaseId: selectedPackagePurchaseId || null,
        addOnSelections: selectedAddOnPayload,
        intakeResponses: intakePayload,
      };
      if (seatKeys.length) body.seatType = seatType;
      if (bookingNotes.trim()) body.notes = bookingNotes.trim();
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Could not add class");
        return;
      }
      setAdded(true);
    } finally {
      setLoading(false);
    }
  }

  async function onWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setWlErr("");
    setWlOk("");
    setWlLoading(true);
    try {
      const body: Record<string, unknown> = {
        slotId: wlSlotId,
        participantCount: wlParticipants,
        customerName: wlName,
        customerEmail: wlEmail,
      };
      if (wlSeatKeys.length) body.seatType = wlSeatType;
      const r = await fetch("/api/bookings/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setWlErr(j.error || "Could not join waitlist");
        return;
      }
      setWlOk(
        j.message === "Added to waitlist"
          ? "You've been added to the waitlist. You can check your status from your account."
          : j.message || "You've been added to the waitlist. You can check your status from your account."
      );
    } finally {
      setWlLoading(false);
    }
  }

  async function onPayAtStudio(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setPasOk("");
    setPasLoading(true);
    try {
      const clientOk = await saveClientFieldsIfNeeded();
      if (!clientOk) return;
      const body: Record<string, unknown> = {
        slotId,
        participantCount,
        customerName: pasName,
        customerEmail: pasEmail,
        notes: bookingNotes.trim() || undefined,
        paymentMethod: "pay_at_studio",
        addOnSelections: selectedAddOnPayload,
        intakeResponses: intakePayload,
      };
      if (seatKeys.length) body.seatType = seatType;
      const r = await fetch("/api/bookings/pay-at-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Could not reserve booking");
        return;
      }
      setPasOk(
        `Booking reserved! Your reference: ${j.ticketRef}. Pay €${(fullLineCents / 100).toFixed(2)} when you arrive at the studio.`,
      );
    } finally {
      setPasLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {props.slots.length === 0 ? (
        <p className="text-sm text-stone-500">No open sessions with enough seats in this window.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-lg font-medium text-amber-950">Book</h2>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {added && (
            <p className="text-sm text-stone-600">
              Class added to cart.{" "}
              <Link href="/cart" className="text-amber-800 underline">
                Go to checkout
              </Link>
            </p>
          )}
          <label className="block text-sm">
            <span className="text-stone-600">Session</span>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
            >
              {props.slots.map((s) => {
                const left = s.capacityTotal - s.capacityReserved;
                const day = s.slotDate.slice(0, 10);
                const urgency = left <= 2 ? `only ${left} left` : `${left} seats left`;
                return (
                  <option key={s.id} value={s.id}>
                    {day} {s.startTime}–{s.endTime} ({urgency})
                  </option>
                );
              })}
            </select>
          </label>
          {seatKeys.length > 0 && (
            <label className="block text-sm">
              <span className="text-stone-600">Seat type</span>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={seatType}
                onChange={(e) => setSeatType(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {seatKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-stone-600">
              Participants ({props.minP}–{props.maxP})
            </span>
            <input
              type="number"
              min={props.minP}
              max={props.maxP}
              className="mt-1 w-full rounded border px-3 py-2"
              value={participantCount}
              onChange={(e) => setParticipantCount(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Booking notes for the studio</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded border px-3 py-2"
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              maxLength={1000}
              placeholder="Anything the studio should know before your session?"
            />
          </label>
          <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-medium text-stone-800">Use package credits</p>
            {packageLoading ? (
              <p className="text-sm text-stone-500">Checking your active credits…</p>
            ) : packageOptions.length === 0 ? (
              <p className="text-sm text-stone-500">
                No active package credits found for this class.{" "}
                <Link href={`/studios/${props.studioId}/packages`} className="text-amber-800 underline">
                  Browse packages
                </Link>
              </p>
            ) : (
              <label className="block text-sm">
                <span className="text-stone-600">Package purchase</span>
                <select
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={selectedPackagePurchaseId}
                  onChange={(e) => setSelectedPackagePurchaseId(e.target.value)}
                >
                  <option value="">Do not use package credits</option>
                  {packageOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.package.name} · {entry.creditsRemaining} credits left · expires {entry.expiresAt.slice(0, 10)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {addOnsLoading ? (
            <p className="text-sm text-stone-500">Loading extras…</p>
          ) : addOns.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div>
                <p className="text-sm font-medium text-stone-800">Optional extras</p>
                <p className="text-xs text-stone-500">Add premium materials, upgrades, or extras to this booking.</p>
              </div>
              <div className="space-y-3">
                {addOns.map((addOn) => {
                  const qty = selectedAddOns[addOn.id] ?? 0;
                  const checked = qty > 0;
                  return (
                    <div key={addOn.id} className="rounded-lg border border-stone-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex min-w-0 items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedAddOns((current) => ({
                                ...current,
                                [addOn.id]: e.target.checked ? Math.max(1, current[addOn.id] ?? 1) : 0,
                              }))
                            }
                            className="mt-1"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-stone-900">{addOn.name}</span>
                            {addOn.description ? (
                              <span className="mt-1 block text-xs text-stone-500">{addOn.description}</span>
                            ) : null}
                            {addOn.durationMinutesExtra > 0 ? (
                              <span className="mt-1 block text-xs text-stone-500">
                                Adds {addOn.durationMinutesExtra} minute{addOn.durationMinutesExtra === 1 ? "" : "s"} to the session.
                              </span>
                            ) : null}
                          </span>
                        </label>
                        <span className="shrink-0 text-sm font-medium text-amber-950">+€{(addOn.priceCents / 100).toFixed(2)}</span>
                      </div>
                      {checked && addOn.maxPerBooking > 1 ? (
                        <div className="mt-3 max-w-28">
                          <label className="block text-xs text-stone-500">
                            Quantity
                            <input
                              type="number"
                              min={1}
                              max={addOn.maxPerBooking}
                              className="mt-1 w-full rounded border px-3 py-2 text-sm"
                              value={qty}
                              onChange={(e) =>
                                setSelectedAddOns((current) => ({
                                  ...current,
                                  [addOn.id]: Math.max(1, Math.min(addOn.maxPerBooking, parseInt(e.target.value, 10) || 1)),
                                }))
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {intakeLoading ? (
            <p className="text-sm text-stone-500">Loading booking questions…</p>
          ) : intakeForms.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div>
                <p className="text-sm font-medium text-stone-800">Booking questions</p>
                <p className="text-xs text-stone-500">Answer these before you complete your reservation.</p>
              </div>
              {intakeForms.map((form) => {
                const options = Array.isArray(form.options)
                  ? form.options.map((option) => (typeof option === "string" ? option : "")).filter(Boolean)
                  : [];
                const value = intakeValues[form.id];
                return (
                  <label key={form.id} className="block text-sm">
                    <span className="text-stone-700">
                      {form.title}
                      {form.isRequired ? " *" : ""}
                    </span>
                    {form.fieldType === "text_single" ? (
                      <input
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }))}
                        required={form.isRequired}
                      />
                    ) : null}
                    {form.fieldType === "text_multi" ? (
                      <textarea
                        className="mt-1 min-h-24 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }))}
                        required={form.isRequired}
                      />
                    ) : null}
                    {form.fieldType === "number" ? (
                      <input
                        type="number"
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }))}
                        required={form.isRequired}
                      />
                    ) : null}
                    {form.fieldType === "checkbox" ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.checked }))}
                          required={form.isRequired}
                        />
                        <span className="text-xs text-stone-500">{form.isRequired ? "Required" : "Optional"}</span>
                      </div>
                    ) : null}
                    {form.fieldType === "dropdown" ? (
                      <select
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }))}
                        required={form.isRequired}
                      >
                        <option value="">Select…</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {form.fieldType === "date" ? (
                      <input
                        type="date"
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }))}
                        required={form.isRequired}
                      />
                    ) : null}
                    {form.fieldType === "file_upload" ? (
                      <div className="mt-2 space-y-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:border-amber-300">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => void onFileUpload(form.id, e.target.files?.[0] ?? null)}
                          />
                          <span>
                            {uploadStates[form.id]?.busy ? "Uploading..." : "Upload image"}
                          </span>
                        </label>
                        <input
                          type="url"
                          className="w-full rounded border px-3 py-2"
                          placeholder="Uploaded file URL"
                          value={typeof value === "string" ? value : ""}
                          onChange={(e) => {
                            setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }));
                            setUploadStates((current) => ({
                              ...current,
                              [form.id]: {
                                busy: false,
                                error: "",
                                uploadedUrl: e.target.value,
                              },
                            }));
                          }}
                          required={form.isRequired}
                        />
                        <p className="text-xs text-stone-500">
                          Upload a JPG, PNG, or WebP image, or paste a hosted file URL.
                        </p>
                        {uploadStates[form.id]?.error ? (
                          <p className="text-xs text-red-600">{uploadStates[form.id]?.error}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </label>
                );
              })}
            </div>
          ) : null}
          {clientFieldsLoading ? (
            <p className="text-sm text-stone-500">Loading client profile fields…</p>
          ) : clientFields.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div>
                <p className="text-sm font-medium text-stone-800">Client profile fields</p>
                <p className="text-xs text-stone-500">These details are saved to your profile for future bookings.</p>
              </div>
              {clientFields.map((field) => {
                const options = Array.isArray(field.options)
                  ? field.options.map((option) => (typeof option === "string" ? option : "")).filter(Boolean)
                  : [];
                const value = clientFieldValues[field.id];
                return (
                  <label key={field.id} className="block text-sm">
                    <span className="text-stone-700">
                      {field.title}
                      {field.isRequired ? " *" : ""}
                    </span>
                    {field.fieldType === "text_single" ? (
                      <input
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        required={field.isRequired}
                      />
                    ) : null}
                    {field.fieldType === "text_multi" ? (
                      <textarea
                        className="mt-1 min-h-24 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        required={field.isRequired}
                      />
                    ) : null}
                    {field.fieldType === "number" ? (
                      <input
                        type="number"
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        required={field.isRequired}
                      />
                    ) : null}
                    {field.fieldType === "checkbox" ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.checked }))}
                          required={field.isRequired}
                        />
                        <span className="text-xs text-stone-500">{field.isRequired ? "Required" : "Optional"}</span>
                      </div>
                    ) : null}
                    {field.fieldType === "dropdown" ? (
                      <select
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        required={field.isRequired}
                      >
                        <option value="">Select…</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {field.fieldType === "date" ? (
                      <input
                        type="date"
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        required={field.isRequired}
                      />
                    ) : null}
                    {field.fieldType === "file_upload" ? (
                      <input
                        type="url"
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        placeholder="https://..."
                        required={field.isRequired}
                      />
                    ) : null}
                  </label>
                );
              })}
            </div>
          ) : null}
          <p className="text-sm text-stone-600">
            Experience total: €{(fullLineCents / 100).toFixed(2)}
            {props.bookingDepositBps > 0 || packageCoversClassBase ? (
              <>
                {" "}
                · Due at checkout: €{(chargeNowCents / 100).toFixed(2)}
              </>
            ) : null}
          </p>
          {props.bookingDepositBps > 0 || packageCoversClassBase ? (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="text-sm font-medium text-stone-800">Payment options</p>
              {packageCoversClassBase ? (
                <p className="mt-2 text-xs text-emerald-700">
                  Package credit applied to class price (€{((props.priceCents * participantCount) / 100).toFixed(2)}).
                  {addOnTotalCents > 0
                    ? ` Only add-ons (€${(addOnTotalCents / 100).toFixed(2)}) are charged at checkout.`
                    : " No charge is due now for this class."}
                </p>
              ) : null}
              <div className="mt-3 space-y-2">
                <label className="flex items-start gap-3 text-sm text-stone-700">
                  <input
                    type="radio"
                    name="booking-payment-choice"
                    checked={paymentChoice === "deposit"}
                    onChange={() => setPaymentChoice("deposit")}
                    disabled={packageCoversClassBase}
                  />
                  <span>
                    <span className="block font-medium text-stone-900">
                      Pay deposit now
                    </span>
                    <span className="block text-xs text-stone-500">
                      €{(dueNowCents / 100).toFixed(2)} now ({depositPct.toFixed(1)}%) · €{((payableLineCents - dueNowCents) / 100).toFixed(2)} later
                    </span>
                  </span>
                </label>
                {!packageCoversClassBase &&
                bookingAllowsFullPaymentOption({
                  bookingDepositBps: props.bookingDepositBps,
                  allowFullPaymentOption: props.allowFullPaymentOption,
                }) ? (
                  <label className="flex items-start gap-3 text-sm text-stone-700">
                    <input
                      type="radio"
                      name="booking-payment-choice"
                      checked={paymentChoice === "full"}
                      onChange={() => setPaymentChoice("full")}
                    />
                    <span>
                      <span className="block font-medium text-stone-900">
                        Pay full price now
                      </span>
                      <span className="block text-xs text-stone-500">
                        €{(payableLineCents / 100).toFixed(2)} charged today
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
          {selectedSlot ? (
            <p className="text-xs text-stone-500">
              {(() => {
                const left = selectedSlot.capacityTotal - selectedSlot.capacityReserved;
                if (left <= 2) return `Only ${left} spot${left === 1 ? "" : "s"} left on this session.`;
                return `${left} spot${left === 1 ? "" : "s"} currently available.`;
              })()}
            </p>
          ) : null}
          {props.cancellationPolicyLabel ? (
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
              Cancellation policy: {props.cancellationPolicyLabel}
            </p>
          ) : null}
          {props.allowPayAtStudio && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={payAtStudioMode}
                  onChange={(e) => { setPayAtStudioMode(e.target.checked); setAdded(false); setPasOk(""); }}
                />
                Pay at the studio instead
              </label>
              {payAtStudioMode && (
                <p className="mt-1 text-xs text-stone-500">
                  No online payment required. Pay €{(fullLineCents / 100).toFixed(2)} when you arrive.
                </p>
              )}
            </div>
          )}
          {pasOk && <p className="text-sm text-emerald-800">{pasOk}</p>}
          {!payAtStudioMode ? (
            <>
              <p className="text-sm text-stone-500">
                Add this class to your cart, then complete one checkout for products and bookings from the same studio.
              </p>
              <button
                type="submit"
                disabled={loading || !slotId || (seatKeys.length > 0 && !seatType)}
                className={ui.buttonPrimary}
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner size="sm" className="text-white" />
                    Adding…
                  </span>
                ) : (
                  "Add class to cart"
                )}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-stone-600">Your name</span>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={pasName}
                  onChange={(e) => setPasName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-stone-600">Email</span>
                <input
                  type="email"
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={pasEmail}
                  onChange={(e) => setPasEmail(e.target.value)}
                  required
                />
              </label>
              <button
                type="button"
                disabled={pasLoading || !slotId || (seatKeys.length > 0 && !seatType) || !pasName.trim() || !pasEmail.trim()}
                onClick={onPayAtStudio}
                className={ui.buttonPrimary}
              >
                {pasLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner size="sm" className="text-white" />
                    Reserving…
                  </span>
                ) : (
                  "Reserve — pay at studio"
                )}
              </button>
            </div>
          )}
        </form>
      )}

      {props.waitlistSlots.length > 0 && (
        <form onSubmit={onWaitlist} className="space-y-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/40 p-4">
          <h2 className="text-lg font-medium text-amber-950">Join waitlist</h2>
          <p className="text-sm text-stone-600">
            No seats available for your group right now. You can join the waitlist. No payment is taken and no seat is
            reserved.
          </p>
          {wlErr && <p className="text-sm text-red-600">{wlErr}</p>}
          {wlOk && <p className="text-sm text-green-800">{wlOk}</p>}
          <label className="block text-sm">
            <span className="text-stone-600">Session</span>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={wlSlotId}
              onChange={(e) => setWlSlotId(e.target.value)}
            >
              {props.waitlistSlots.map((s) => {
                const left = s.capacityTotal - s.capacityReserved;
                const day = s.slotDate.slice(0, 10);
                return (
                  <option key={s.id} value={s.id}>
                    {day} {s.startTime}–{s.endTime} ({left} left)
                  </option>
                );
              })}
            </select>
          </label>
          {wlSeatKeys.length > 0 && (
            <label className="block text-sm">
              <span className="text-stone-600">Seat type</span>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={wlSeatType}
                onChange={(e) => setWlSeatType(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {wlSeatKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-stone-600">Participants</span>
            <input
              type="number"
              min={props.minP}
              max={props.maxP}
              className="mt-1 w-full rounded border px-3 py-2"
              value={wlParticipants}
              onChange={(e) => setWlParticipants(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Name</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={wlName}
              onChange={(e) => setWlName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded border px-3 py-2"
              value={wlEmail}
              onChange={(e) => setWlEmail(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={
              wlLoading ||
              !wlSlotId ||
              (wlSeatKeys.length > 0 && !wlSeatType) ||
              !wlName.trim() ||
              !wlEmail.trim()
            }
            className={`${ui.buttonSecondary} w-full`}
          >
            {wlLoading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Spinner size="sm" />
                Joining…
              </span>
            ) : (
              "Join waitlist"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
