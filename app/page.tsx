import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-amber-900">
            PotteryMania
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/marketplace" className="text-stone-700 hover:text-amber-900">
              Marketplace
            </Link>
            <Link href="/classes" className="text-stone-700 hover:text-amber-900">
              Classes
            </Link>
            <Link href="/studios" className="text-stone-700 hover:text-amber-900">
              Studios
            </Link>
            <Link href="/cart" className="text-stone-700 hover:text-amber-900">
              Cart
            </Link>
            <Link href="/login" className="text-stone-700 hover:text-amber-900">
              Sign in
            </Link>
            <Link href="/register" className="text-amber-800 hover:underline">
              Register
            </Link>
            <Link href="/dashboard" className="text-stone-700 hover:text-amber-900">
              Dashboard
            </Link>
            <Link href="/admin" className="text-stone-700 hover:text-amber-900">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-4xl font-light text-amber-950">Discover pottery studios &amp; ceramics</h1>
        <p className="mt-4 text-stone-600">Shop the marketplace or book a class at a studio.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/marketplace"
            className="inline-block rounded-full bg-amber-800 px-8 py-3 text-white hover:bg-amber-900"
          >
            Shop ceramics
          </Link>
          <Link
            href="/classes"
            className="inline-block rounded-full border border-amber-800 px-8 py-3 text-amber-900 hover:bg-amber-50"
          >
            Browse classes
          </Link>
        </div>
      </main>
    </div>
  );
}