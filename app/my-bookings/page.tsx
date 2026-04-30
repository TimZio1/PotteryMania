import { redirect } from "next/navigation";

/** Class booking portal is not part of this product; apparel orders live under Wear. */
export default function MyBookingsPage() {
  redirect("/wear/shop");
}
