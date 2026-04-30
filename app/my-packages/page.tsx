import { redirect } from "next/navigation";

/** Class packages are not sold in this app; apparel lives under Wear. */
export default function MyPackagesPage() {
  redirect("/wear/shop");
}
