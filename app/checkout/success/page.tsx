import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-green-800">Thank you</h1>
      <p className="mt-4 text-stone-600">Your payment was received. The studio will prepare your order.</p>
      <Link href="/marketplace" className="mt-8 inline-block text-amber-800 underline">
        Back to marketplace
      </Link>
    </div>
  );
}