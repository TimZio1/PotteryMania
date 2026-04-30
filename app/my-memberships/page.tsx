import { redirect } from "next/navigation";

/** Studio memberships / class bundles are not part of this product surface. */
export default function MyMembershipsPage() {
  redirect("/wear/shop");
}
