import { redirect } from "next/navigation";

/** Class booking admin is not part of this deployment. */
export default function AdminBookingsIndexRedirectPage() {
  redirect("/admin");
}
