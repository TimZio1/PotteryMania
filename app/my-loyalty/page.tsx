import { redirect } from "next/navigation";

/** Per-studio loyalty points are not part of the apparel storefront. */
export default function MyLoyaltyPage() {
  redirect("/wear/shop");
}
