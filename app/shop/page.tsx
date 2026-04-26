import { redirect } from "next/navigation";

/** Legacy/marketing URL: canonical apparel catalog lives under `/wear/shop`. */
export default function ShopAliasPage() {
  redirect("/wear/shop");
}
