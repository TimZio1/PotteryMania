import { redirect } from "next/navigation";

/** Ceramic marketplace is not part of this product; apparel lives under Wear. */
export default function MarketplaceIndexPage() {
  redirect("/wear/shop");
}
