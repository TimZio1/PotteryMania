import type { BookingStatus } from "@prisma/client";

const CANCELLABLE: BookingStatus[] = ["pending", "confirmed"];
const RESCHEDULABLE: BookingStatus[] = ["confirmed"];
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