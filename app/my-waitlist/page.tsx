import { redirect } from "next/navigation";

/** Class waitlists are not part of this app. */
export default function MyWaitlistPage() {
  redirect("/wear/shop");
}
