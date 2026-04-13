import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
  if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

  const rating = typeof body.rating === "number" ? Math.floor(body.rating) : NaN;
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be between 1 and 5" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : null;
  const reviewBody = typeof body.body === "string" ? body.body.trim().slice(0, 3000) : null;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerUserId: user.id },
    select: {
      id: true,
      studioId: true,
      experienceId: true,
      bookingStatus: true,
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.bookingStatus !== "completed") {
    return NextResponse.json({ error: "Only completed bookings can be reviewed" }, { status: 400 });
  }

  const existing = await prisma.review.findFirst({
    where: { bookingId, authorUserId: user.id },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "A review already exists for this booking" }, { status: 409 });

  const review = await prisma.review.create({
    data: {
      authorUserId: user.id,
      studioId: booking.studioId,
      experienceId: booking.experienceId,
      bookingId: booking.id,
      targetType: "experience",
      rating,
      title: title || null,
      body: reviewBody || null,
      isVerified: true,
      isVisible: true,
    },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}
