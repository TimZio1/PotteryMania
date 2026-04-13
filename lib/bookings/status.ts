import type { BookingStatus } from "@prisma/client";

const CANCELLABLE: BookingStatus[] = ["pending", "awaiting_vendor_approval", "confirmed"];
const RESCHEDULABLE: BookingStatus[] = ["confirmed", "awaiting_vendor_approval"];
const COMPLETABLE: BookingStatus[] = ["confirmed"];
const CANCELLED: BookingStatus[] = [
  "cancelled_by_customer",
  "cancelled_by_vendor",
  "cancelled_by_admin",
];

export function isCancellable(status: BookingStatus): boolean {
  return CANCELLABLE.includes(status);
}

export function isReschedulable(status: BookingStatus): boolean {
  return RESCHEDULABLE.includes(status);
}

export function isCompletable(status: BookingStatus): boolean {
  return COMPLETABLE.includes(status);
}

export function isCancelled(status: BookingStatus): boolean {
  return CANCELLED.includes(status);
}

export function cancelStatusForRole(role: "customer" | "vendor" | "admin"): BookingStatus {
  switch (role) {
    case "customer":
      return "cancelled_by_customer";
    case "vendor":
      return "cancelled_by_vendor";
    case "admin":
      return "cancelled_by_admin";
  }
}

export function formatBookingStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace("vendor", "studio");
}

export function formatPaymentStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function bookingStatusBadgeClass(status: string): string {
  switch (status as BookingStatus) {
    case "awaiting_vendor_approval":
      return "bg-amber-100 text-amber-900";
    case "pending":
      return "bg-yellow-100 text-yellow-900";
    case "confirmed":
      return "bg-emerald-100 text-emerald-900";
    case "completed":
      return "bg-sky-100 text-sky-900";
    case "no_show":
      return "bg-stone-200 text-stone-700";
    case "cancellation_requested":
      return "bg-orange-100 text-orange-900";
    case "cancelled_by_customer":
    case "cancelled_by_vendor":
    case "cancelled_by_admin":
      return "bg-rose-100 text-rose-900";
    case "refunded":
    case "partially_refunded":
      return "bg-fuchsia-100 text-fuchsia-900";
    default:
      return "bg-stone-100 text-stone-700";
  }
}

export function paymentStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-900";
    case "partial":
      return "bg-sky-100 text-sky-900";
    case "pay_at_studio":
      return "bg-violet-100 text-violet-900";
    case "pending":
      return "bg-yellow-100 text-yellow-900";
    case "failed":
      return "bg-rose-100 text-rose-900";
    case "refunded":
    case "partially_refunded":
      return "bg-stone-200 text-stone-700";
    default:
      return "bg-stone-100 text-stone-700";
  }
}