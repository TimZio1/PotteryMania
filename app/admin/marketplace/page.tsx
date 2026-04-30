import { redirect } from "next/navigation";

/** Ceramic marketplace admin is retired; wear catalog is under Wear products. */
export default function AdminMarketplaceRedirectPage() {
  redirect("/admin/wear-products");
}
