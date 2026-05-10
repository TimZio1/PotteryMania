"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ui } from "@/lib/ui-styles";
import { trackCartAddToCart } from "@/lib/cart-analytics-client";
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
type PublicInstructor = { id: string; name: string };

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
  experienceTitle?: string;
  minP: number;
  maxP: number;
  priceCents: number;
  currency?: string;
  bookingDepositBps: number;
  allowPayAtStudio: boolean;
  allowFullPaymentOption?: boolean;
  cancellationPolicyLabel?: string | null;
  slots: SlotOption[];
  waitlistSlots: WaitlistSlotOption[];
  /** Deep-link from studio listing: `/classes/[id]?slot=…` */
  initialSlotId?: string;
}) {
  const errRef = useRef<HTMLParagraphElement>(null);
  const [slotId, setSlotId] = useState(() => {
    if (props.initialSlotId && props.slots.some((s) => s.id === props.initialSlotId)) {
      return props.initialSlotId;
    }
    return props.slots[0]?.id ?? "";
  });
  const [participantCount, setParticipantCount] = useState(props.minP);
  const [seatType, setSeatType] = useState<string>("");
  const [err, setErr] = useState("");

  const handleSlotChange = useCallback((newSlotId: string) => {
    setSlotId(newSlotId);
    setSeatType("");
    setAdded(false);
  }, []);
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
  const [instructorOptions, setInstructorOptions] = useState<PublicInstructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [paymentChoice, setPaymentChoice] = useState<"deposit" | "full">(
    normalizeBookingPaymentPreference(undefined, {
      bookingDepositBps: props.bookingDepositBps,
      allowFullPaymentOption: props.allowFullPaymentOption,
    }),
  );

  const [termsAccepted, setTermsAccepted] = useState(false);

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
    if (err && errRef.current) {
      errRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [err]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [addOnRes, intakeRes, packageRes, clientFieldsRes, instructorsRes] = await Promise.all([
          fetch(`/api/experiences/${props.experienceId}/add-ons`),
          fetch(`/api/experiences/${props.experienceId}/intake-forms`),
          fetch(
            `/api/packages/my?onlyActive=1&studioId=${encodeURIComponent(props.studioId)}&experienceId=${encodeURIComponent(props.experienceId)}`,
          ),
          fetch(`/api/studios/${props.studioId}/client-fields/me`),
          fetch(`/api/studios/${props.studioId}/instructors`),
        ]);
        const addOnJson = await addOnRes.json().catch(() => ({}));
        const intakeJson = await intakeRes.json().catch(() => ({}));
        const packageJson = await packageRes.json().catch(() => ({}));
        const clientFieldsJson = await clientFieldsRes.json().catch(() => ({}));
        const instructorsJson = await instructorsRes.json().catch(() => ({}));
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

          const linkedInstructors = instructorsRes.ok
            ? (((instructorsJson.items as unknown[]) ?? [])
                .map((entry) => {
                  const row = entry as {
                    id?: unknown;
                    name?: unknown;
                    experiences?: Array<{ experienceId?: unknown; experience?: { id?: unknown } }>;
                  };
                  const id = typeof row.id === "string" ? row.id : "";
                  const name = typeof row.name === "string" ? row.name : "";
                  const linked = Array.isArray(row.experiences)
                    ? row.experiences.some((link) => {
                        const byId = typeof link.experienceId === "string" ? link.experienceId : "";
                        const nestedId =
                          link.experience && typeof link.experience.id === "string" ? link.experience.id : "";
                        return byId === props.experienceId || nestedId === props.experienceId;
                      })
                    : false;
                  return id && name && linked ? ({ id, name } satisfies PublicInstructor) : null;
                })
                .filter((row): row is PublicInstructor => Boolean(row)))
            : [];
          setInstructorOptions(linkedInstructors);
          setSelectedInstructorId((prev) => {
            if (linkedInstructors.length === 1) return linkedInstructors[0].id;
            if (linkedInstructors.some((option) => option.id === prev)) return prev;
            return "";
          });
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
          setInstructorOptions([]);
          setSelectedInstructorId("");
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
        setErr(`Please fill in “${field.title}” to continue.`);
        return false;
      }
    }
    const res = await fetch(`/api/studios/${props.studioId}/client-fields/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: clientFieldPayload }),
    });
    if (res.status === 401) {
      // Guest bookings still proceed; values are collected for immediate booking context only.
      return true;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as { error?: string }));
      setErr(data.error || "We couldn’t save your profile. Try again.");
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
          error: error instanceof Error ? error.message : "Upload failed. Try again.",
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
        acceptTerms: true,
      };
      if (seatKeys.length) body.seatType = seatType;
      if (selectedInstructorId) body.instructorId = selectedInstructorId;
      if (bookingNotes.trim()) body.notes = bookingNotes.trim();
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "We couldn’t add this class. Try again.");
        return;
      }
      trackCartAddToCart({
        itemType: "booking",
        itemId: props.experienceId,
        itemName: props.experienceTitle,
        unitPriceCents: props.priceCents,
        valueCents: fullLineCents,
        currency: props.currency,
        quantity: participantCount,
      });
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
        setWlErr(j.error || "We couldn’t add you to the waitlist. Try again.");
        return;
      }
      setWlOk(
        j.message === "Added to waitlist"
          ? "You’re on the waitlist. We’ll email you the moment a seat opens up."
          : j.message || "You’re on the waitlist. We’ll email you the moment a seat opens up."
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
      if (selectedInstructorId) body.instructorId = selectedInstructorId;
      const r = await fetch("/api/bookings/pay-at-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "We couldn’t hold your seat. Try again.");
        return;
      }
      setPasOk(
        `Seat held! Your booking code is ${j.ticketRef}. Pay €${(fullLineCents / 100).toFixed(2)} when you arrive.`,
      );
    } finally {
      setPasLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {props.slots.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No open times with enough seats right now.{props.waitlistSlots.length > 0 ? " Add yourself to the waitlist below and we’ll email you when a seat opens up." : " Check back soon."}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-medium text-[var(--foreground)]">Book your seat</h2>
          {err && <p ref={errRef} className="text-sm text-red-400">{err}</p>}
          {added && (
            <p className="text-sm text-[var(--muted)]">
              Added to your cart.{" "}
              <Link href="/cart" className="text-[var(--accent)] underline">
                Go to cart
              </Link>
            </p>
          )}
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Date &amp; time</span>
            <select
              className={`${ui.input} mt-1`}
              value={slotId}
              onChange={(e) => handleSlotChange(e.target.value)}
            >
              {props.slots.map((s) => {
                const left = s.capacityTotal - s.capacityReserved;
                const day = s.slotDate.slice(0, 10);
                const urgency = left <= 2 ? `only ${left} left` : `${left} seats left`;
                return (
                  <option key={s.id} value={s.id}>
                    {day} · {s.startTime}–{s.endTime} ({urgency})
                  </option>
                );
              })}
            </select>
          </label>
          {seatKeys.length > 0 && (
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Seat option</span>
              <select
                className={`${ui.input} mt-1`}
                value={seatType}
                onChange={(e) => setSeatType(e.target.value)}
                required
              >
                <option value="">Pick one…</option>
                {seatKeys.map((k) => (
                  <option key={k} value={k}>
                    {k.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-[var(--muted)]">
              Guests ({props.minP}–{props.maxP})
            </span>
            <input
              type="number"
              min={props.minP}
              max={props.maxP}
              className={`${ui.input} mt-1`}
              value={participantCount}
              onChange={(e) => setParticipantCount(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Note for the studio (optional)</span>
            <textarea
              className={`${ui.input} mt-1 min-h-24`}
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              maxLength={1000}
              placeholder="Anything they should know before your class?"
            />
          </label>
          {instructorOptions.length > 1 ? (
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Teacher</span>
              <select
                className={`${ui.input} mt-1`}
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
              >
                <option value="">No preference</option>
                {instructorOptions.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {instructorOptions.length === 1 ? (
            <p className="text-xs text-[var(--muted)]">Taught by {instructorOptions[0].name}</p>
          ) : null}
          <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-sm font-medium text-[var(--foreground)]">Use a class package</p>
            {packageLoading ? (
              <p className="text-sm text-[var(--muted)]">Checking your credits…</p>
            ) : packageOptions.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                You don&rsquo;t have any credits for this class.{" "}
                <Link href={`/studios/${props.studioId}/packages`} className="text-[var(--accent)] underline">
                  See this studio&rsquo;s packages
                </Link>
              </p>
            ) : (
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Use a package</span>
                <select
                  className={`${ui.input} mt-1`}
                  value={selectedPackagePurchaseId}
                  onChange={(e) => setSelectedPackagePurchaseId(e.target.value)}
                >
                  <option value="">Pay the full price</option>
                  {packageOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.package.name} · {entry.creditsRemaining} {entry.creditsRemaining === 1 ? "credit" : "credits"} left · expires {entry.expiresAt.slice(0, 10)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {addOnsLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading extras…</p>
          ) : addOns.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Add-ons (optional)</p>
                <p className="text-xs text-[var(--muted)]">Extra materials or upgrades for your class.</p>
              </div>
              <div className="space-y-3">
                {addOns.map((addOn) => {
                  const qty = selectedAddOns[addOn.id] ?? 0;
                  const checked = qty > 0;
                  return (
                    <div key={addOn.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
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
                            <span className="block text-sm font-medium text-[var(--foreground)]">{addOn.name}</span>
                            {addOn.description ? (
                              <span className="mt-1 block text-xs text-[var(--muted)]">{addOn.description}</span>
                            ) : null}
                            {addOn.durationMinutesExtra > 0 ? (
                              <span className="mt-1 block text-xs text-[var(--muted)]">
                                Adds {addOn.durationMinutesExtra} minute{addOn.durationMinutesExtra === 1 ? "" : "s"} to the session.
                              </span>
                            ) : null}
                          </span>
                        </label>
                        <span className="shrink-0 text-sm font-medium text-[var(--foreground)]">+€{(addOn.priceCents / 100).toFixed(2)}</span>
                      </div>
                      {checked && addOn.maxPerBooking > 1 ? (
                        <div className="mt-3 max-w-28">
                          <label className="block text-xs text-[var(--muted)]">
                            Quantity
                            <input
                              type="number"
                              min={1}
                              max={addOn.maxPerBooking}
                              className={`${ui.input} mt-1 text-sm`}
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
            <p className="text-sm text-[var(--muted)]">Loading questions…</p>
          ) : intakeForms.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">A few questions from the studio</p>
                <p className="text-xs text-[var(--muted)]">These help the teacher prep for your class.</p>
              </div>
              {intakeForms.map((form) => {
                const options = Array.isArray(form.options)
                  ? form.options.map((option) => (typeof option === "string" ? option : "")).filter(Boolean)
                  : [];
                const value = intakeValues[form.id];
                return (
                  <label key={form.id} className="block text-sm">
                    <span className="text-[var(--muted)]">
                      {form.title}
                      {form.isRequired ? " *" : ""}
                    </span>
                    {form.fieldType === "text_single" ? (
                      <input
                        className={`${ui.input} mt-1`}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }))}
                        required={form.isRequired}
                      />
                    ) : null}
                    {form.fieldType === "text_multi" ? (
                      <textarea
                        className={`${ui.input} mt-1 min-h-24`}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }))}
                        required={form.isRequired}
                      />
                    ) : null}
                    {form.fieldType === "number" ? (
                      <input
                        type="number"
                        className={`${ui.input} mt-1`}
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
                        <span className="text-xs text-[var(--muted)]">{form.isRequired ? "Required" : "Optional"}</span>
                      </div>
                    ) : null}
                    {form.fieldType === "dropdown" ? (
                      <select
                        className={`${ui.input} mt-1`}
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
                        className={`${ui.input} mt-1`}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setIntakeValues((current) => ({ ...current, [form.id]: e.target.value }))}
                        required={form.isRequired}
                      />
                    ) : null}
                    {form.fieldType === "file_upload" ? (
                      <div className="mt-2 space-y-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] hover:border-amber-300">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => void onFileUpload(form.id, e.target.files?.[0] ?? null)}
                          />
                          <span>
                            {uploadStates[form.id]?.busy ? "Uploading…" : "Upload a photo"}
                          </span>
                        </label>
                        <input
                          type="url"
                          className={ui.input}
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
                        <p className="text-xs text-[var(--muted)]">
                          Upload a JPG, PNG, or WebP image, or paste a hosted file URL.
                        </p>
                        {uploadStates[form.id]?.error ? (
                          <p className="text-xs text-red-400">{uploadStates[form.id]?.error}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </label>
                );
              })}
            </div>
          ) : null}
          {clientFieldsLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading profile…</p>
          ) : clientFields.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Your profile</p>
                <p className="text-xs text-[var(--muted)]">Saved to your profile so you don&rsquo;t fill this in next time.</p>
              </div>
              {clientFields.map((field) => {
                const options = Array.isArray(field.options)
                  ? field.options.map((option) => (typeof option === "string" ? option : "")).filter(Boolean)
                  : [];
                const value = clientFieldValues[field.id];
                return (
                  <label key={field.id} className="block text-sm">
                    <span className="text-[var(--muted)]">
                      {field.title}
                      {field.isRequired ? " *" : ""}
                    </span>
                    {field.fieldType === "text_single" ? (
                      <input
                        className={`${ui.input} mt-1`}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        required={field.isRequired}
                      />
                    ) : null}
                    {field.fieldType === "text_multi" ? (
                      <textarea
                        className={`${ui.input} mt-1 min-h-24`}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        required={field.isRequired}
                      />
                    ) : null}
                    {field.fieldType === "number" ? (
                      <input
                        type="number"
                        className={`${ui.input} mt-1`}
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
                        <span className="text-xs text-[var(--muted)]">{field.isRequired ? "Required" : "Optional"}</span>
                      </div>
                    ) : null}
                    {field.fieldType === "dropdown" ? (
                      <select
                        className={`${ui.input} mt-1`}
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
                        className={`${ui.input} mt-1`}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setClientFieldValues((current) => ({ ...current, [field.id]: e.target.value }))}
                        required={field.isRequired}
                      />
                    ) : null}
                    {field.fieldType === "file_upload" ? (
                      <input
                        type="url"
                        className={`${ui.input} mt-1`}
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
          <p className="text-sm text-[var(--muted)]">
            Total: €{(fullLineCents / 100).toFixed(2)}
            {props.bookingDepositBps > 0 || packageCoversClassBase ? (
              <>
                {" "}
                · Pay now: €{(chargeNowCents / 100).toFixed(2)}
              </>
            ) : null}
          </p>
          {props.bookingDepositBps > 0 || packageCoversClassBase ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-sm font-medium text-[var(--foreground)]">How would you like to pay?</p>
              {packageCoversClassBase ? (
                <p className="mt-2 text-xs text-emerald-700">
                  Your package covers the class price (€{((props.priceCents * participantCount) / 100).toFixed(2)}).
                  {addOnTotalCents > 0
                    ? ` You’ll only pay for add-ons (€${(addOnTotalCents / 100).toFixed(2)}) at checkout.`
                    : " Nothing to pay now."}
                </p>
              ) : null}
              <div className="mt-3 space-y-2">
                <label className="flex items-start gap-3 text-sm text-[var(--muted)]">
                  <input
                    type="radio"
                    name="booking-payment-choice"
                    checked={paymentChoice === "deposit"}
                    onChange={() => setPaymentChoice("deposit")}
                    disabled={packageCoversClassBase}
                  />
                  <span>
                    <span className="block font-medium text-[var(--foreground)]">
                      Pay a deposit now
                    </span>
                    <span className="block text-xs text-[var(--muted)]">
                      €{(dueNowCents / 100).toFixed(2)} today ({Number.isInteger(depositPct) ? depositPct : depositPct.toFixed(1)}%), €{((payableLineCents - dueNowCents) / 100).toFixed(2)} when you arrive.
                    </span>
                  </span>
                </label>
                {!packageCoversClassBase &&
                bookingAllowsFullPaymentOption({
                  bookingDepositBps: props.bookingDepositBps,
                  allowFullPaymentOption: props.allowFullPaymentOption,
                }) ? (
                  <label className="flex items-start gap-3 text-sm text-[var(--muted)]">
                    <input
                      type="radio"
                      name="booking-payment-choice"
                      checked={paymentChoice === "full"}
                      onChange={() => setPaymentChoice("full")}
                    />
                    <span>
                      <span className="block font-medium text-[var(--foreground)]">
                        Pay the full amount now
                      </span>
                      <span className="block text-xs text-[var(--muted)]">
                        €{(payableLineCents / 100).toFixed(2)} today, nothing on arrival.
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
          {selectedSlot ? (
            <p className="text-xs text-[var(--muted)]">
              {(() => {
                const left = selectedSlot.capacityTotal - selectedSlot.capacityReserved;
                if (left <= 2) return `Only ${left} ${left === 1 ? "seat" : "seats"} left.`;
                return `${left} ${left === 1 ? "seat" : "seats"} left.`;
              })()}
            </p>
          ) : null}
          {props.cancellationPolicyLabel ? (
            <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
              Cancellations: {props.cancellationPolicyLabel}
            </p>
          ) : null}
          <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-amber-900/25"
            />
            <span>
              I accept the{" "}
              <Link href="/terms" target="_blank" className="font-medium text-[var(--accent)] underline underline-offset-2">
                terms of service
              </Link>
              {props.cancellationPolicyLabel ? " and the cancellation policy shown above" : ""}.
            </span>
          </label>
          {props.allowPayAtStudio && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={payAtStudioMode}
                  onChange={(e) => { setPayAtStudioMode(e.target.checked); setAdded(false); setPasOk(""); }}
                />
                I&rsquo;ll pay in person at the studio
              </label>
              {payAtStudioMode && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  We&rsquo;ll hold your seat. Bring €{(fullLineCents / 100).toFixed(2)} on the day.
                </p>
              )}
            </div>
          )}
          {pasOk && <p className="text-sm text-emerald-400">{pasOk}</p>}
          {!payAtStudioMode ? (
            <div className="sticky bottom-4 z-10 -mx-4 rounded-xl bg-[var(--surface)]/95 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
              <button
                type="submit"
                disabled={loading || !slotId || (seatKeys.length > 0 && !seatType) || !termsAccepted}
                className={`${ui.buttonPrimary} w-full`}
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner size="sm" className="text-white" />
                    Adding to cart…
                  </span>
                ) : (
                  "Add to cart"
                )}
              </button>
              <p className="mt-2 text-center text-xs text-[var(--muted)]">
                You&rsquo;ll pay on the next step. Browse a bit more first if you like.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Your name</span>
                <input
                  className={`${ui.input} mt-1`}
                  value={pasName}
                  onChange={(e) => setPasName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Email</span>
                <input
                  type="email"
                  className={`${ui.input} mt-1`}
                  value={pasEmail}
                  onChange={(e) => setPasEmail(e.target.value)}
                  required
                />
              </label>
              <button
                type="button"
                disabled={pasLoading || !slotId || (seatKeys.length > 0 && !seatType) || !pasName.trim() || !pasEmail.trim() || !termsAccepted}
                onClick={onPayAtStudio}
                className={ui.buttonPrimary}
              >
                {pasLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner size="sm" className="text-white" />
                    Holding your seat…
                  </span>
                ) : (
                  "Hold my seat — I’ll pay at the studio"
                )}
              </button>
            </div>
          )}
        </form>
      )}

      {props.waitlistSlots.length > 0 && (
        <form onSubmit={onWaitlist} className="space-y-4 rounded-lg border border-dashed border-amber-300 bg-[var(--accent-muted)]/40 p-4">
          <h2 className="text-lg font-medium text-[var(--foreground)]">Get on the waitlist</h2>
          <p className="text-sm text-[var(--muted)]">
            All seats are taken. Leave your details — we&rsquo;ll email you the moment a seat opens up. No payment, no seat held.
          </p>
          {wlErr && <p className="text-sm text-red-400">{wlErr}</p>}
          {wlOk && <p className="text-sm text-green-800">{wlOk}</p>}
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Which class?</span>
            <select
              className={`${ui.input} mt-1`}
              value={wlSlotId}
              onChange={(e) => setWlSlotId(e.target.value)}
            >
              {props.waitlistSlots.map((s) => {
                const day = s.slotDate.slice(0, 10);
                return (
                  <option key={s.id} value={s.id}>
                    {day} · {s.startTime}–{s.endTime} (full)
                  </option>
                );
              })}
            </select>
          </label>
          {wlSeatKeys.length > 0 && (
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Seat option</span>
              <select
                className={`${ui.input} mt-1`}
                value={wlSeatType}
                onChange={(e) => setWlSeatType(e.target.value)}
                required
              >
                <option value="">Pick one…</option>
                {wlSeatKeys.map((k) => (
                  <option key={k} value={k}>
                    {k.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Guests</span>
            <input
              type="number"
              min={props.minP}
              max={props.maxP}
              className={`${ui.input} mt-1`}
              value={wlParticipants}
              onChange={(e) => setWlParticipants(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Your name</span>
            <input
              className={`${ui.input} mt-1`}
              value={wlName}
              onChange={(e) => setWlName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Email</span>
            <input
              type="email"
              className={`${ui.input} mt-1`}
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
                Adding you…
              </span>
            ) : (
              "Add me to the waitlist"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
