import { redirect } from "next/navigation";

type Props = { params: Promise<{ studioId: string }> };

export default async function LegacyProductsRedirect({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/shop`);
}
