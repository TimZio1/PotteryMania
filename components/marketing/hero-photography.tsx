import Image from "next/image";

/** Unsplash — pottery studio / wheel (license: Unsplash). */
const HERO_SRC =
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=2400&q=85";

/**
 * Replaces the marketing home hero SVG with photography.
 * Decorative at layout level; copy carries the main message.
 */
export function HeroPhotography() {
  return (
    <Image
      src={HERO_SRC}
      alt="Hands working clay on a pottery wheel in a warm studio"
      fill
      priority
      className="object-cover object-center"
      sizes="100vw"
    />
  );
}
