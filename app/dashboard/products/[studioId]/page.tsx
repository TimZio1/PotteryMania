"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StudioProductsPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<{ id: string; title: string; status: string }[]>([]);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [priceEur, setPriceEur] = useState("25");
  const [imageUrl, setImageUrl] = useState("");

  async function load() {
    const r = await fetch(`/api/studios/${studioId}/products`);
    const j = await r.json();
    setProducts(j.products || []);
  }

  useEffect(() => {
    load();
  }, [studioId]);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const priceCents = Math.round(parseFloat(priceEur) * 100);
    if (Number.isNaN(priceCents) || priceCents < 0) {
      setErr("Invalid price");
      return;
    }
    const images = imageUrl.trim()
      ? [{ imageUrl: imageUrl.trim(), isPrimary: true }]
      : [];
    if (images.length === 0) {
      setErr("Main image URL required");
      return;
    }
    const r = await fetch(`/api/studios/${studioId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        priceCents,
        status: "active",
        stockQuantity: 5,
        images,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Failed");
      return;
    }
    setTitle("");
    setImageUrl("");
    setShow(false);
    load();
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Dashboard
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <button type="button" onClick={() => setShow(!show)} className="text-sm text-amber-800 underline">
          Add product
        </button>
      </div>
      {show && (
        <form onSubmit={createProduct} className="mt-6 space-y-3 rounded border border-stone-200 bg-white p-4">
          {err && <p className="text-sm text-red-600">{err}</p>}
          <input className="w-full rounded border px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="w-full rounded border px-3 py-2" placeholder="Price (EUR)" value={priceEur} onChange={(e) => setPriceEur(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" placeholder="Main image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <button type="submit" className="rounded bg-amber-800 px-4 py-2 text-white">
            Create
          </button>
        </form>
      )}
      <ul className="mt-8 space-y-2">
        {products.map((p) => (
          <li key={p.id} className="flex justify-between border-b border-stone-100 py-2 text-sm">
            <span>{p.title}</span>
            <span className="text-stone-500">{p.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}