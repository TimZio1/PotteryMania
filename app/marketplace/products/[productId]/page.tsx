import { redirect } from "next/navigation";

/** Legacy ceramic PDP URLs forward to the apparel shop. */
export default function MarketplaceProductRedirectPage() {
  redirect("/wear/shop");
}
